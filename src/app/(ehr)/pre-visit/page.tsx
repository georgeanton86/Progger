"use client";
import { useState } from "react";
import { sampleAppointments, samplePatients } from "@/lib/sampleData";
import { calcAge, formatDate } from "@/lib/utils";
import type { Appointment, Patient } from "@/lib/types";

function PatientCard({ apt, selected, onClick }: { apt: Appointment; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-lg border transition-colors ${
        selected ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
      }`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-white">{apt.patientName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{apt.time} · {apt.type}</p>
          <p className="text-xs text-gray-500 mt-1">{apt.chiefComplaint}</p>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          apt.status === "checked-in" ? "bg-green-900/50 text-green-400" : "bg-gray-700 text-gray-400"
        }`}>
          {apt.status.replace("-", " ")}
        </span>
      </div>
      <p className="text-xs text-gray-500 mt-2">{apt.insurance}</p>
    </button>
  );
}

export default function PreVisitPage() {
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [aiOutput, setAiOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"prechartai" | "soap">("prechartai");
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });

  const patient: Patient | undefined = selectedApt
    ? samplePatients.find(p => p.id === selectedApt.patientId)
    : undefined;

  async function runPreChart() {
    if (!patient || !selectedApt) return;
    setLoading(true);
    setAiOutput("");
    const context = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calcAge(patient.dob)}, Sex: ${patient.sex}
Chief Complaint: ${selectedApt.chiefComplaint}
Insurance: ${patient.insurance}
Medications: ${patient.medications.map(m => `${m.name} ${m.dose} ${m.frequency}`).join(", ")}
Allergies: ${patient.allergies.join(", ") || "NKDA"}
Primary Dx: ${patient.primaryDx}`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Generate a pre-visit summary for the provider. Include: key patient context, likely discussion points, relevant clinical considerations, suggested orders, and any risk flags.",
        context,
      }),
    });
    const data = await res.json();
    setAiOutput(data.reply || data.error);
    setLoading(false);
  }

  async function generateSoap() {
    if (!patient || !selectedApt) return;
    setLoading(true);
    const context = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calcAge(patient.dob)}
Chief Complaint: ${selectedApt.chiefComplaint}
Medications: ${patient.medications.map(m => m.name).join(", ")}
Pre-chart notes: ${aiOutput}`;
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Generate a complete SOAP note. Format as four clearly labeled sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN.",
        context,
      }),
    });
    const data = await res.json();
    const text: string = data.reply || "";
    const s = text.match(/SUBJECTIVE[:\s]+([\s\S]*?)(?=OBJECTIVE|$)/i)?.[1]?.trim() || "";
    const o = text.match(/OBJECTIVE[:\s]+([\s\S]*?)(?=ASSESSMENT|$)/i)?.[1]?.trim() || "";
    const a = text.match(/ASSESSMENT[:\s]+([\s\S]*?)(?=PLAN|$)/i)?.[1]?.trim() || "";
    const p = text.match(/PLAN[:\s]+([\s\S]*?)$/i)?.[1]?.trim() || "";
    setSoap({ subjective: s, objective: o, assessment: a, plan: p });
    setLoading(false);
  }

  return (
    <div className="flex h-screen">
      {/* Patient List */}
      <div className="w-72 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white">Pre-Visit Charting</h2>
          <p className="text-xs text-gray-400 mt-0.5">Today&apos;s patients</p>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sampleAppointments.map(apt => (
            <PatientCard
              key={apt.id}
              apt={apt}
              selected={selectedApt?.id === apt.id}
              onClick={() => { setSelectedApt(apt); setAiOutput(""); setSoap({ subjective: "", objective: "", assessment: "", plan: "" }); }}
            />
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selectedApt ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a patient to begin pre-visit charting
          </div>
        ) : (
          <div>
            {/* Patient Header */}
            {patient && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-bold text-white">{patient.firstName} {patient.lastName}</h2>
                    <p className="text-gray-400 text-sm mt-0.5">
                      {calcAge(patient.dob)}y · {patient.sex} · DOB {formatDate(patient.dob)} · MRN {patient.mrn}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">{patient.insurance} · {patient.insuranceId}</p>
                  </div>
                  <span className="text-sm bg-blue-900/30 text-blue-400 px-3 py-1 rounded-full border border-blue-800/30">
                    {selectedApt.type}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-800">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Primary Dx</p>
                    <p className="text-sm text-gray-300">{patient.primaryDx}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Allergies</p>
                    <p className="text-sm text-red-400">{patient.allergies.join(", ") || "NKDA"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Chief Complaint</p>
                    <p className="text-sm text-gray-300">{selectedApt.chiefComplaint}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Medications */}
            {patient && patient.medications.length > 0 && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
                <h3 className="font-medium text-white mb-3">Active Medications</h3>
                <div className="grid grid-cols-2 gap-2">
                  {patient.medications.filter(m => m.active).map(med => (
                    <div key={med.id} className="flex items-center gap-2 p-2 bg-gray-800 rounded-lg">
                      <div className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0"></div>
                      <p className="text-sm text-gray-300">{med.name} {med.dose} {med.frequency}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActiveTab("prechartai")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "prechartai" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                AI Pre-Chart
              </button>
              <button
                onClick={() => setActiveTab("soap")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === "soap" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}
              >
                SOAP Note
              </button>
            </div>

            {activeTab === "prechartai" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-white">AI Pre-Visit Summary</h3>
                  <button
                    onClick={runPreChart}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? "Generating..." : "Generate Pre-Chart"}
                  </button>
                </div>
                {aiOutput ? (
                  <div className="prose prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{aiOutput}</pre>
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Click &quot;Generate Pre-Chart&quot; to get an AI-powered pre-visit summary for this patient.</p>
                )}
              </div>
            )}

            {activeTab === "soap" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-white">SOAP Note</h3>
                  <button
                    onClick={generateSoap}
                    disabled={loading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    {loading ? "Generating..." : "AI Generate SOAP"}
                  </button>
                </div>
                <div className="space-y-4">
                  {(["subjective", "objective", "assessment", "plan"] as const).map(field => (
                    <div key={field}>
                      <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                        {field}
                      </label>
                      <textarea
                        value={soap[field]}
                        onChange={e => setSoap(s => ({ ...s, [field]: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        placeholder={`Enter ${field}...`}
                      />
                    </div>
                  ))}
                  <button className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
                    Sign &amp; Save Note
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
