"use client";
import { useState } from "react";
import { sampleAppointments, samplePatients } from "@/lib/sampleData";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

function ValueBadge({ score }: { score: number }) {
  const color = score >= 90 ? "text-green-400 bg-green-900/30 border-green-800/40" : score >= 80 ? "text-blue-400 bg-blue-900/30 border-blue-800/40" : "text-yellow-400 bg-yellow-900/30 border-yellow-800/40";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", color)}>Score: {score}</span>;
}

export function PreVisitTab() {
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [activeView, setActiveView] = useState<"prechart" | "encounter">("prechart");
  const [aiOutput, setAiOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [soap, setSoap] = useState({ subjective: "", objective: "", assessment: "", plan: "" });
  const [vitals, setVitals] = useState({ bp: "", hr: "", temp: "", rr: "", o2sat: "", weight: "" });

  function selectPatient(p: Patient, a: Appointment) {
    setSelectedPatient(p);
    setSelectedApt(a);
    setAiOutput("");
    setSoap({ subjective: "", objective: "", assessment: "", plan: "" });
  }

  async function runPreChart() {
    if (!selectedPatient) return;
    setLoading(true);
    setAiOutput("");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Generate a comprehensive pre-visit summary for the provider. Include: key patient context, likely discussion points, relevant clinical considerations, medication review, suggested orders, risk flags, and documentation tips to maximize appropriate reimbursement.",
        context: `Patient: ${selectedPatient.name}, Age: ${selectedPatient.age}, Sex: unknown
Chief Complaint: ${selectedPatient.primaryComplaint}
Insurance: ${selectedPatient.insuranceProvider} ${selectedPatient.insurancePlan}
Medical History: ${selectedPatient.medicalHistory.join(", ")}
Medications: ${selectedPatient.medications.join(", ")}
Allergies: ${selectedPatient.allergies.join(", ")}
Value Score: ${selectedPatient.valueScore} | Revenue/Visit: $${selectedPatient.revenuePerVisit}
No-Show Rate: ${selectedPatient.noShowRate}%`,
      }),
    });
    const data = await res.json();
    setAiOutput(data.reply || data.error || "Error generating pre-chart");
    setLoading(false);
  }

  async function generateSoap() {
    if (!selectedPatient) return;
    setLoading(true);
    const vitalStr = Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(", ");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Generate a complete, clinically accurate SOAP note. Format with four clearly labeled sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN. Include ICD-10 codes in Assessment and CPT codes in Plan.",
        context: `Patient: ${selectedPatient.name}, Age: ${selectedPatient.age}
Chief Complaint: ${selectedPatient.primaryComplaint}
Medical History: ${selectedPatient.medicalHistory.join(", ")}
Medications: ${selectedPatient.medications.join(", ")}
Allergies: ${selectedPatient.allergies.join(", ")}
Vitals: ${vitalStr || "not recorded"}
Pre-chart notes: ${aiOutput || "none"}`,
      }),
    });
    const data = await res.json();
    const text: string = data.reply || "";
    setSoap({
      subjective: text.match(/SUBJECTIVE[:\s]+([\s\S]*?)(?=OBJECTIVE|$)/i)?.[1]?.trim() || "",
      objective: text.match(/OBJECTIVE[:\s]+([\s\S]*?)(?=ASSESSMENT|$)/i)?.[1]?.trim() || "",
      assessment: text.match(/ASSESSMENT[:\s]+([\s\S]*?)(?=PLAN|$)/i)?.[1]?.trim() || "",
      plan: text.match(/PLAN[:\s]+([\s\S]*?)$/i)?.[1]?.trim() || "",
    });
    setLoading(false);
  }

  return (
    <div className="flex h-full">
      {/* Patient List */}
      <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-sm">Pre-Visit Charting</h2>
          <p className="text-xs text-gray-400 mt-0.5">{sampleAppointments.length} patients today</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {sampleAppointments.map(apt => {
            const p = samplePatients.find(pt => pt.id === apt.patientId)!;
            const time = new Date(apt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <button
                key={apt.id}
                onClick={() => selectPatient(p, apt)}
                className={cn("w-full text-left p-3 rounded-lg border transition-colors", selectedPatient?.id === p.id ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600")}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="text-sm font-medium text-white">{p.name}</p>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded text-xs", apt.status === "checked-in" ? "bg-green-900/40 text-green-400" : "bg-gray-700 text-gray-500")}>{apt.status.replace("-"," ")}</span>
                </div>
                <p className="text-xs text-gray-400">{time} · {p.primaryComplaint}</p>
                <div className="flex items-center justify-between mt-2">
                  <ValueBadge score={p.valueScore} />
                  <span className="text-xs text-gray-500">${p.revenuePerVisit}/visit</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto p-5">
        {!selectedPatient ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-sm">Select a patient to begin pre-visit charting</div>
        ) : (
          <div className="max-w-3xl">
            {/* Patient Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedPatient.name}</h2>
                  <p className="text-gray-400 text-sm mt-0.5">Age {selectedPatient.age} · {selectedPatient.insuranceProvider} {selectedPatient.insurancePlan}</p>
                </div>
                <ValueBadge score={selectedPatient.valueScore} />
              </div>
              <div className="grid grid-cols-4 gap-3 mt-4 pt-4 border-t border-gray-800">
                <div><p className="text-xs text-gray-500">Chief Complaint</p><p className="text-sm text-gray-300 mt-0.5">{selectedPatient.primaryComplaint}</p></div>
                <div><p className="text-xs text-gray-500">Allergies</p><p className="text-sm text-red-400 mt-0.5">{selectedPatient.allergies.join(", ")}</p></div>
                <div><p className="text-xs text-gray-500">Payment Reliability</p><p className="text-sm text-green-400 mt-0.5">{selectedPatient.paymentReliability}%</p></div>
                <div><p className="text-xs text-gray-500">No-Show Rate</p><p className="text-sm text-yellow-400 mt-0.5">{selectedPatient.noShowRate}%</p></div>
              </div>
            </div>

            {/* Medications */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 mb-4">
              <h3 className="text-sm font-medium text-white mb-2">Current Medications</h3>
              <div className="flex flex-wrap gap-2">
                {selectedPatient.medications.map(m => <span key={m} className="px-2 py-1 bg-blue-900/20 text-blue-400 border border-blue-800/30 rounded text-xs">{m}</span>)}
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-4">
              {(["prechart", "encounter"] as const).map(v => (
                <button key={v} onClick={() => setActiveView(v)} className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", activeView === v ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
                  {v === "prechart" ? "AI Pre-Chart" : "Encounter / SOAP"}
                </button>
              ))}
            </div>

            {activeView === "prechart" && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-white">AI Pre-Visit Summary</h3>
                  <button onClick={runPreChart} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                    {loading ? "Generating..." : "Generate Pre-Chart"}
                  </button>
                </div>
                {aiOutput ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{aiOutput}</pre>
                ) : (
                  <p className="text-gray-500 text-sm">Click &quot;Generate Pre-Chart&quot; to get an AI-powered pre-visit summary.</p>
                )}
              </div>
            )}

            {activeView === "encounter" && (
              <div className="space-y-4">
                {/* Vitals */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <h3 className="font-medium text-white mb-3">Vitals</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {(["bp", "hr", "temp", "rr", "o2sat", "weight"] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs text-gray-500 block mb-1">{field === "bp" ? "Blood Pressure" : field === "hr" ? "Heart Rate" : field === "temp" ? "Temp (°F)" : field === "rr" ? "Resp Rate" : field === "o2sat" ? "O2 Sat %" : "Weight (lbs)"}</label>
                        <input type="text" value={vitals[field]} onChange={e => setVitals(v => ({ ...v, [field]: e.target.value }))} placeholder={field === "bp" ? "120/80" : field === "hr" ? "72" : field === "temp" ? "98.6" : field === "rr" ? "16" : field === "o2sat" ? "98" : "150"} className="w-full px-3 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                    ))}
                  </div>
                </div>

                {/* SOAP */}
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-white">SOAP Note</h3>
                    <button onClick={generateSoap} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                      {loading ? "Generating..." : "AI Generate SOAP"}
                    </button>
                  </div>
                  <div className="space-y-3">
                    {(["subjective", "objective", "assessment", "plan"] as const).map(field => (
                      <div key={field}>
                        <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">{field}</label>
                        <textarea value={soap[field]} onChange={e => setSoap(s => ({ ...s, [field]: e.target.value }))} rows={3} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={`Enter ${field}...`} />
                      </div>
                    ))}
                  </div>
                  <button className="w-full mt-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">Sign &amp; Save Encounter</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
