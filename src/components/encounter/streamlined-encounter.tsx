"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

type SectionStatus = "idle" | "accepted" | "rejected";

type CarePlanSection = {
  confidence: number;
  items?: string[];
  primary?: string;
  secondaries?: string[];
  ruleOut?: string[];
  source: string;
};

type DDXItem = {
  diagnosis: string;
  icd10: string;
  confidence: number;
  legalRisk: "low" | "medium" | "high";
  recommended: boolean;
  description: string;
};

type PrescriptionItem = {
  name: string;
  dosing: string;
  pharmacy: string;
};

type SOAPNote = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
};

type CarePlan = {
  assessment: CarePlanSection & { primary: string; secondaries: string[]; ruleOut: string[] };
  diagnostics: CarePlanSection;
  treatmentPlan: CarePlanSection;
  patientEducation: CarePlanSection;
  followUp: CarePlanSection;
  ddx: DDXItem[];
  prescriptions: PrescriptionItem[];
  soap: SOAPNote;
};

function ConfidenceBadge({ value }: { value: number }) {
  return (
    <span className="text-xs px-2 py-0.5 rounded bg-teal-900/40 text-teal-400 border border-teal-700/40 font-medium">
      {value}% confidence
    </span>
  );
}

function ClinicalCard({
  title,
  section,
  status,
  onAccept,
  onReject,
}: {
  title: string;
  section: CarePlanSection;
  status: SectionStatus;
  onAccept: () => void;
  onReject: () => void;
}) {
  const items: string[] = section.items
    ? section.items
    : [
        section.primary ?? "",
        ...(section.secondaries ?? []),
        ...(section.ruleOut?.map(r => `Rule out: ${r}`) ?? []),
      ].filter(Boolean);

  return (
    <div
      className={cn(
        "bg-gray-900 border rounded-xl overflow-hidden",
        status === "accepted" ? "border-teal-600/60 border-l-4 border-l-teal-500" : status === "rejected" ? "border-red-700/60 border-l-4 border-l-red-500" : "border-gray-800"
      )}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          {status === "accepted" && <span className="text-teal-400">✓</span>}
          <h3
            className={cn(
              "font-semibold text-sm",
              status === "accepted" ? "text-teal-300" : status === "rejected" ? "text-gray-500 line-through" : "text-white"
            )}
          >
            {title}
          </h3>
          <ConfidenceBadge value={section.confidence} />
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className={cn(
              "text-xs px-2.5 py-1 rounded border transition-colors",
              status === "rejected"
                ? "bg-red-900/40 text-red-400 border-red-700/40"
                : "border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400"
            )}
          >
            Reject
          </button>
          <button
            onClick={onAccept}
            className={cn(
              "text-xs px-2.5 py-1 rounded border transition-colors",
              status === "accepted"
                ? "bg-teal-900/40 text-teal-400 border-teal-700/40"
                : "border-gray-700 text-gray-400 hover:border-teal-500 hover:text-teal-400"
            )}
          >
            Accept
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        <ul className="space-y-1.5">
          {items.map((item, i) => (
            <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
              <span className="text-teal-400 mt-0.5 flex-shrink-0">•</span>
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="px-4 py-2 border-t border-gray-800/60">
        <p className="text-xs text-gray-500">📚 Source: {section.source}</p>
      </div>
    </div>
  );
}

export function StreamlinedEncounter({
  patient,
  appointment,
  onBack,
}: {
  patient: Patient;
  appointment: Appointment;
  onBack: () => void;
}) {
  const [generating, setGenerating] = useState(false);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});
  const [selectedDDX, setSelectedDDX] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<"ehr" | "standalone">("ehr");
  const [editingSOAP, setEditingSOAP] = useState<Record<string, boolean>>({});
  const [soapEdits, setSoapEdits] = useState<Partial<SOAPNote>>({});
  const [signed, setSigned] = useState(false);

  const [vitals, setVitals] = useState({ bp: "", hr: "", temp: "", spo2: "" });

  const aptTime = new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const hasScopeWarning = appointment.scopeStatus !== "within_scope";

  async function generateCarePlan() {
    setGenerating(true);
    setError(null);
    setCarePlan(null);
    setStatuses({});
    setSelectedDDX(null);
    try {
      const prompt = `Generate a complete AI care plan for a patient visit as JSON. The patient details are:
Name: ${patient.name}, Age: ${patient.age}, DOB: ${patient.dateOfBirth}
Chief Complaint: ${patient.primaryComplaint}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}

Return ONLY valid JSON with this exact structure:
{
  "assessment": {"confidence": 92, "primary": "Acute Upper Respiratory Infection (J06.9)", "secondaries": ["Allergic Rhinitis (J30.9)"], "ruleOut": ["Influenza", "COVID-19"], "source": "UpToDate, AHA Guidelines"},
  "diagnostics": {"confidence": 88, "items": ["Rapid Strep Test", "COVID-19 PCR if indicated"], "source": "CDC Guidelines"},
  "treatmentPlan": {"confidence": 95, "items": ["Rest and hydration", "OTC decongestants PRN"], "source": "Cochrane Review"},
  "patientEducation": {"confidence": 98, "items": ["Return precautions explained", "Hand hygiene counseling"], "source": "CDC"},
  "followUp": {"confidence": 96, "items": ["Follow up in 1 week if no improvement", "Urgent return: worsening SOB, high fever"], "source": "AAFP"},
  "ddx": [
    {"diagnosis": "Acute URI", "icd10": "J06.9", "confidence": 92, "legalRisk": "low", "recommended": true, "description": "Most likely diagnosis based on presentation"},
    {"diagnosis": "Influenza", "icd10": "J11.1", "confidence": 60, "legalRisk": "low", "recommended": false, "description": "Consider if flu season, rapid test negative"},
    {"diagnosis": "COVID-19", "icd10": "U07.1", "confidence": 45, "legalRisk": "medium", "recommended": false, "description": "Rule out with PCR testing"},
    {"diagnosis": "Strep Pharyngitis", "icd10": "J02.0", "confidence": 35, "legalRisk": "low", "recommended": false, "description": "Rapid strep test indicated"},
    {"diagnosis": "Allergic Rhinitis", "icd10": "J30.9", "confidence": 30, "legalRisk": "low", "recommended": false, "description": "Consider if seasonal pattern"}
  ],
  "prescriptions": [
    {"name": "Pseudoephedrine", "dosing": "60mg · q4-6h PRN · 7 days", "pharmacy": "CVS - Main St"},
    {"name": "Guaifenesin", "dosing": "400mg · q4h PRN · 5 days", "pharmacy": "CVS - Main St"}
  ],
  "soap": {
    "subjective": "Patient presents with chief complaint of upper respiratory symptoms.",
    "objective": "Vitals within normal limits. Oropharynx mildly erythematous. No exudate.",
    "assessment": "Acute upper respiratory infection, likely viral etiology.",
    "plan": "Supportive care, OTC medications, return precautions discussed."
  }
}`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, stream: false }),
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      const text: string = data.reply || "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON found in response");
      const parsed = JSON.parse(jsonMatch[0]) as CarePlan;
      setCarePlan(parsed);
      // Pre-fill SOAP edits
      setSoapEdits(parsed.soap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }

  function setStatus(key: string, status: SectionStatus) {
    setStatuses(prev => ({ ...prev, [key]: prev[key] === status ? "idle" : status }));
  }

  const lowestRiskDDX = carePlan?.ddx.reduce((best, cur) => {
    const riskOrder = { low: 0, medium: 1, high: 2 };
    return riskOrder[cur.legalRisk] < riskOrder[best.legalRisk] ? cur : best;
  }, carePlan.ddx[0]);

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Back
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div>
            <span className="text-white font-semibold">{patient.name}</span>
            <span className="text-gray-400 text-sm ml-2">· Age {patient.age} · DOB {patient.dateOfBirth} · {aptTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs px-2.5 py-1 rounded-full border", hasScopeWarning ? "text-amber-400 bg-amber-900/20 border-amber-700/40" : "text-teal-400 bg-teal-900/20 border-teal-700/40")}>
            {hasScopeWarning ? "⚠ Scope Review" : "✓ Within Scope"}
          </span>
          <span className="text-xs px-2.5 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">
            {patient.insuranceProvider}
          </span>
          <button
            onClick={() => setSigned(true)}
            disabled={signed}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", signed ? "bg-green-700 text-green-100" : "bg-green-600 hover:bg-green-700 text-white")}
          >
            {signed ? "✓ Signed" : "Sign Chart"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-72 border-r border-gray-800 overflow-y-auto bg-gray-900/50 flex-shrink-0 p-4 space-y-4">
          {/* Patient Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold">
              {getInitials(patient.name)}
            </div>
            <div>
              <p className="font-semibold text-white">{patient.name}</p>
              <p className="text-xs text-gray-400">DOB: {patient.dateOfBirth}</p>
              <p className="text-xs text-gray-400">Age {patient.age}</p>
            </div>
          </div>

          {/* Digital Voicemail */}
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-teal-400">📱 Digital Voicemail</span>
              <span className="text-xs text-gray-500 ml-auto">{aptTime}</span>
            </div>
            <p className="text-xs text-gray-300">&quot;I&apos;ve been having {patient.primaryComplaint?.toLowerCase()} and wanted to get checked out. My {patient.medications[0] ? `${patient.medications[0]} doesn&apos;t seem to be helping` : "symptoms are persistent"}.&quot;</p>
          </div>

          {/* Check-In */}
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-blue-400">🏥 Waiting Room Check-In</span>
              <span className="text-xs text-gray-500 ml-auto">{aptTime}</span>
            </div>
            <p className="text-xs text-gray-300">{patient.hpiPreview}</p>
          </div>

          {/* Chief Complaint */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Chief Complaint</p>
            <p className="text-base font-bold text-white">{patient.primaryComplaint}</p>
          </div>

          {/* Vitals */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Vitals</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "bp", label: "BP", placeholder: "120/80", color: "text-red-400" },
                { key: "hr", label: "HR", placeholder: "72 bpm", color: "text-orange-400" },
                { key: "temp", label: "Temp", placeholder: "98.6°F", color: "text-yellow-400" },
                { key: "spo2", label: "SpO₂", placeholder: "98%", color: "text-teal-400" },
              ].map(v => (
                <div key={v.key} className={cn("bg-gray-800 rounded-lg px-2 py-1.5 border border-gray-700")}>
                  <p className={cn("text-xs font-semibold", v.color)}>{v.label}</p>
                  <input
                    type="text"
                    value={vitals[v.key as keyof typeof vitals]}
                    onChange={e => setVitals(prev => ({ ...prev, [v.key]: e.target.value }))}
                    placeholder={v.placeholder}
                    className="w-full bg-transparent text-xs text-gray-300 focus:outline-none placeholder-gray-600 mt-0.5"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Allergies */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Allergies</p>
            <div className="flex flex-wrap gap-1.5">
              {patient.allergies.filter(a => a !== "None").length > 0
                ? patient.allergies.filter(a => a !== "None").map(a => (
                    <span key={a} className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-700/40 rounded-full">⚠ {a}</span>
                  ))
                : <span className="text-xs text-gray-500">NKDA</span>
              }
            </div>
          </div>

          {/* Medications */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Current Medications</p>
            <ul className="space-y-1">
              {patient.medications.map(m => (
                <li key={m} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-teal-400 mt-0.5">•</span> {m}
                </li>
              ))}
            </ul>
          </div>

          {/* Medical History */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Medical History</p>
            <ul className="space-y-1">
              {patient.medicalHistory.map(h => (
                <li key={h} className="text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-purple-400 mt-0.5">•</span> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right panel: AI Care Plan Studio */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white">AI Care Plan Studio</h2>
              <p className="text-xs text-gray-500 mt-0.5">Evidence-based clinical decision support for {patient.name}</p>
            </div>
            <button
              onClick={generateCarePlan}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {generating && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {generating ? "Generating..." : "Generate AI Care Plan"}
            </button>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4 text-red-400 text-sm">{error}</div>
          )}

          {!carePlan && !generating && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
              <p className="text-gray-500 text-sm">Click &quot;Generate AI Care Plan&quot; to create a comprehensive, evidence-based care plan for this patient.</p>
            </div>
          )}

          {carePlan && (
            <>
              {/* Assessment */}
              <ClinicalCard
                title="Assessment"
                section={carePlan.assessment}
                status={statuses["assessment"] ?? "idle"}
                onAccept={() => setStatus("assessment", "accepted")}
                onReject={() => setStatus("assessment", "rejected")}
              />

              {/* Diagnostics */}
              <ClinicalCard
                title="Diagnostics"
                section={carePlan.diagnostics}
                status={statuses["diagnostics"] ?? "idle"}
                onAccept={() => setStatus("diagnostics", "accepted")}
                onReject={() => setStatus("diagnostics", "rejected")}
              />

              {/* Treatment Plan */}
              <ClinicalCard
                title="Treatment Plan"
                section={carePlan.treatmentPlan}
                status={statuses["treatmentPlan"] ?? "idle"}
                onAccept={() => setStatus("treatmentPlan", "accepted")}
                onReject={() => setStatus("treatmentPlan", "rejected")}
              />

              {/* Patient Education */}
              <ClinicalCard
                title="Patient Education"
                section={carePlan.patientEducation}
                status={statuses["patientEducation"] ?? "idle"}
                onAccept={() => setStatus("patientEducation", "accepted")}
                onReject={() => setStatus("patientEducation", "rejected")}
              />

              {/* Follow-Up */}
              <ClinicalCard
                title="Follow-up & Red Flags"
                section={carePlan.followUp}
                status={statuses["followUp"] ?? "idle"}
                onAccept={() => setStatus("followUp", "accepted")}
                onReject={() => setStatus("followUp", "rejected")}
              />

              {/* DDX */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-white text-sm">Differential Diagnosis Options (DDX)</h3>
                  <button className="text-xs text-teal-400 hover:text-teal-300 border border-teal-700/40 px-2.5 py-1 rounded transition-colors">
                    Select if rejecting primary
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  {carePlan.ddx.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDDX(i === selectedDDX ? null : i)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border transition-all",
                        item.recommended ? "border-teal-600/60 bg-teal-900/10" : "border-gray-700 bg-gray-800/50",
                        selectedDDX === i && "ring-2 ring-teal-500"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", selectedDDX === i || item.recommended ? "border-teal-400" : "border-gray-600")}>
                          {(selectedDDX === i || (selectedDDX === null && item.recommended)) && (
                            <div className="w-2 h-2 rounded-full bg-teal-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-white text-sm">{item.diagnosis}</span>
                            <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded font-mono">{item.icd10}</span>
                            <span className="text-xs text-gray-400">{item.confidence}%</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", item.legalRisk === "low" ? "bg-green-900/40 text-green-400" : item.legalRisk === "medium" ? "bg-orange-900/40 text-orange-400" : "bg-red-900/40 text-red-400")}>
                              {item.legalRisk} risk
                            </span>
                            {item.recommended && (
                              <span className="text-xs px-2 py-0.5 bg-teal-900/40 text-teal-400 rounded-full">Recommended</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Lowest Legal Risk */}
                  {lowestRiskDDX && (
                    <div className="mt-2 px-3 py-2 bg-green-900/20 border border-green-700/40 rounded-lg">
                      <p className="text-xs text-green-400 font-medium">Lowest Legal Risk Option: {lowestRiskDDX.diagnosis}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Prescriptions */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-white text-sm">Prescription Orders</h3>
                  {carePlan.prescriptions[0] && (
                    <span className="text-xs text-teal-400 font-medium">{carePlan.prescriptions[0].pharmacy}</span>
                  )}
                </div>
                <div className="p-4 space-y-3">
                  {carePlan.prescriptions.map((rx, i) => (
                    <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                      <div>
                        <p className="font-medium text-white text-sm">{rx.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{rx.dosing}</p>
                      </div>
                      <button
                        onClick={() => setStatus(`rx-${i}`, statuses[`rx-${i}`] === "accepted" ? "idle" : "accepted")}
                        className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors", statuses[`rx-${i}`] === "accepted" ? "bg-teal-900/40 text-teal-400 border-teal-700/40" : "border-gray-700 text-gray-400 hover:border-teal-500 hover:text-teal-400")}
                      >
                        {statuses[`rx-${i}`] === "accepted" ? "✓ Accepted" : "Accept"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Integrated Clinical Note - Drop Chart */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-white text-sm">Integrated Clinical Note — Drop Chart</h3>
                </div>
                <div className="p-4 space-y-4">
                  {(["subjective", "objective", "assessment", "plan"] as const).map(field => {
                    const isEditing = !!editingSOAP[field];
                    const text = soapEdits[field] ?? carePlan.soap[field];
                    return (
                      <div key={field} className="bg-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{field}</span>
                          <button
                            onClick={() => setEditingSOAP(prev => ({ ...prev, [field]: !prev[field] }))}
                            className="text-xs text-gray-500 hover:text-white transition-colors"
                          >
                            ✏ {isEditing ? "Done" : "Edit"}
                          </button>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={text}
                            onChange={e => setSoapEdits(prev => ({ ...prev, [field]: e.target.value }))}
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
                          />
                        ) : (
                          <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Options */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-white mb-3">Chart Options</p>
                <div className="flex gap-4">
                  {[
                    { value: "ehr", label: "Link to Company EHR (Epic, Cerner, etc.)" },
                    { value: "standalone", label: "Use as Standalone EHR Record" },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                      <div
                        onClick={() => setChartMode(opt.value as "ehr" | "standalone")}
                        className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center cursor-pointer", chartMode === opt.value ? "border-teal-400" : "border-gray-600")}
                      >
                        {chartMode === opt.value && <div className="w-2 h-2 rounded-full bg-teal-400" />}
                      </div>
                      <span className="text-sm text-gray-300">{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
