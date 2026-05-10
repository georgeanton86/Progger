"use client";
import { useState } from "react";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

type EncounterTab = "prechart" | "vitals" | "soap" | "billing";

const ROS_SYSTEMS = [
  { key: "constitutional", label: "Constitutional", symptoms: ["Fever/chills", "Fatigue", "Weight loss", "Night sweats", "Malaise"] },
  { key: "heent", label: "HEENT", symptoms: ["Headache", "Vision changes", "Hearing loss", "Ear pain", "Nasal congestion", "Sore throat"] },
  { key: "cardiovascular", label: "Cardiovascular", symptoms: ["Chest pain", "Palpitations", "Edema", "Syncope", "Orthopnea"] },
  { key: "respiratory", label: "Respiratory", symptoms: ["Dyspnea", "Cough", "Wheezing", "Hemoptysis", "Pleuritic pain"] },
  { key: "gi", label: "Gastrointestinal", symptoms: ["Nausea", "Vomiting", "Abdominal pain", "Diarrhea", "Constipation", "Melena"] },
  { key: "gu", label: "Genitourinary", symptoms: ["Dysuria", "Frequency", "Hematuria", "Incontinence", "Discharge"] },
  { key: "msk", label: "Musculoskeletal", symptoms: ["Joint pain", "Muscle weakness", "Back pain", "Morning stiffness", "Swelling"] },
  { key: "neuro", label: "Neurological", symptoms: ["Dizziness", "Numbness", "Weakness", "Seizures", "Memory changes"] },
  { key: "psych", label: "Psychiatric", symptoms: ["Depression", "Anxiety", "Insomnia", "Mood changes", "Suicidal ideation"] },
  { key: "skin", label: "Skin", symptoms: ["Rash", "Pruritis", "Lesions", "Hair loss", "Nail changes"] },
  { key: "endo", label: "Endocrine", symptoms: ["Polyuria", "Polydipsia", "Heat intolerance", "Cold intolerance", "Tremor"] },
  { key: "heme", label: "Hematologic", symptoms: ["Easy bruising", "Bleeding", "Lymphadenopathy", "Petechiae"] },
];

const PE_SYSTEMS = [
  { key: "general", label: "General", findings: ["Well-appearing", "No acute distress", "Alert and oriented", "Ambulatory"] },
  { key: "heent", label: "HEENT", findings: ["Normocephalic/atraumatic", "PERRL", "TMs clear bilaterally", "Oropharynx clear", "Mucous membranes moist"] },
  { key: "neck", label: "Neck", findings: ["Supple", "No lymphadenopathy", "Thyroid normal", "No JVD", "No meningismus"] },
  { key: "cv", label: "Cardiovascular", findings: ["Regular rate and rhythm", "No murmurs/rubs/gallops", "Peripheral pulses 2+", "No carotid bruits"] },
  { key: "resp", label: "Respiratory", findings: ["Clear to auscultation bilaterally", "No wheezes/rales/rhonchi", "Good air movement", "No accessory muscle use"] },
  { key: "abd", label: "Abdomen", findings: ["Soft and non-tender", "Non-distended", "Normal bowel sounds", "No hepatosplenomegaly", "No guarding/rigidity"] },
  { key: "ext", label: "Extremities", findings: ["No edema", "No cyanosis or clubbing", "Pulses intact bilaterally", "Full ROM"] },
  { key: "neuro", label: "Neurological", findings: ["A&Ox4", "CN II-XII grossly intact", "Motor strength 5/5", "Sensation intact", "Gait normal"] },
  { key: "skin", label: "Skin", findings: ["Warm and dry", "No rash", "Good turgor", "No lesions noted"] },
  { key: "psych", label: "Psychiatric", findings: ["Cooperative", "Appropriate mood/affect", "Normal thought process", "Good insight/judgment"] },
];

type ROSState = Record<string, Record<string, "negative" | "positive" | "unset">>;
type PEState = Record<string, Record<string, boolean>>;
type VitalsState = { bp: string; hr: string; temp: string; rr: string; o2sat: string; weight: string; height: string; bmi: string };
type SOAPState = { subjective: string; objective: string; assessment: string; plan: string };

function ROSCheckbox({ value, onChange }: { value: "negative" | "positive" | "unset"; onChange: (v: "negative" | "positive" | "unset") => void }) {
  return (
    <button onClick={() => onChange(value === "unset" ? "negative" : value === "negative" ? "positive" : "unset")} className={cn("w-5 h-5 rounded text-xs font-bold flex items-center justify-center border transition-colors flex-shrink-0", value === "negative" ? "bg-green-900/40 border-green-600 text-green-400" : value === "positive" ? "bg-red-900/40 border-red-600 text-red-400" : "bg-gray-800 border-gray-700 text-gray-600")}>
      {value === "negative" ? "−" : value === "positive" ? "+" : "·"}
    </button>
  );
}

export function StreamlinedEncounter({ patient, appointment, onBack }: { patient: Patient; appointment: Appointment; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<EncounterTab>("prechart");
  const [hpi, setHpi] = useState("");
  const [ros, setRos] = useState<ROSState>({});
  const [pe, setPe] = useState<PEState>({});
  const [vitals, setVitals] = useState<VitalsState>({ bp: "", hr: "", temp: "", rr: "", o2sat: "", weight: "", height: "", bmi: "" });
  const [soap, setSoap] = useState<SOAPState>({ subjective: "", objective: "", assessment: "", plan: "" });
  const [icd10, setIcd10] = useState("");
  const [cpt, setCpt] = useState("");
  const [signed, setSigned] = useState(false);

  const preChart = useStreamingAI();
  const soapAI = useStreamingAI();
  const billingAI = useStreamingAI();

  const aptTime = new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function setROSValue(system: string, symptom: string, value: "negative" | "positive" | "unset") {
    setRos(prev => ({ ...prev, [system]: { ...(prev[system] || {}), [symptom]: value } }));
  }

  function togglePE(system: string, finding: string) {
    setPe(prev => ({ ...prev, [system]: { ...(prev[system] || {}), [finding]: !(prev[system]?.[finding]) } }));
  }

  const rosPositives = Object.entries(ros).flatMap(([sys, syms]) =>
    Object.entries(syms).filter(([, v]) => v === "positive").map(([sym]) => `${sys}: ${sym}`)
  );
  const rosNegatives = Object.entries(ros).flatMap(([sys, syms]) =>
    Object.entries(syms).filter(([, v]) => v === "negative").map(([sym]) => `${sys}: denies ${sym}`)
  );

  const peFindings = Object.entries(pe).flatMap(([sys, findings]) => {
    const positive = Object.entries(findings).filter(([, v]) => v).map(([f]) => f);
    if (!positive.length) return [];
    return [`${PE_SYSTEMS.find(s => s.key === sys)?.label}: ${positive.join(", ")}`];
  });

  async function runPreChart() {
    await preChart.run(
      "Generate a comprehensive, detailed pre-visit clinical summary for the provider. Include: key patient context with risk factors, likely discussion points for this visit, all relevant clinical considerations and evidence-based management options, medication review with potential interactions, suggested orders and preventive care gaps, risk flags with clinical significance, documentation requirements for appropriate E&M level, and specific ICD-10 codes likely applicable today.",
      `Patient: ${patient.name}, Age: ${patient.age}, DOB: ${patient.dateOfBirth}
Chief Complaint: ${patient.primaryComplaint}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Value Score: ${patient.valueScore} | Revenue/Visit: $${patient.revenuePerVisit} | Payment Reliability: ${patient.paymentReliability}% | No-Show Rate: ${patient.noShowRate}%`
    );
  }

  async function generateSOAP() {
    const vitalStr = Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(", ");
    const soapText = await new Promise<string>(resolve => {
      let full = "";
      soapAI.run(
        "Generate a complete, clinically rigorous SOAP note with four clearly labeled sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN. In ASSESSMENT include the primary diagnosis with ICD-10 code, up to 3 differential diagnoses, and clinical reasoning. In PLAN include CPT codes for all services, prescriptions with dosing, follow-up timeline, and patient education points. Be thorough and specific.",
        `Patient: ${patient.name}, Age: ${patient.age}
Chief Complaint: ${patient.primaryComplaint}
HPI: ${hpi || "Not documented"}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Vitals: ${vitalStr || "Not recorded"}
ROS Positives: ${rosPositives.join("; ") || "None documented"}
ROS Negatives: ${rosNegatives.slice(0, 8).join("; ") || "None documented"}
Physical Exam: ${peFindings.join(" | ") || "Not documented"}
Pre-chart notes: ${preChart.output ? preChart.output.substring(0, 300) : "None"}`
      );
      setTimeout(() => resolve(full), 100);
    });
    void soapText;
  }

  function parseSoapFromOutput(text: string) {
    setSoap({
      subjective: text.match(/SUBJECTIVE[:\s]+([\s\S]*?)(?=OBJECTIVE|$)/i)?.[1]?.trim() || "",
      objective: text.match(/OBJECTIVE[:\s]+([\s\S]*?)(?=ASSESSMENT|$)/i)?.[1]?.trim() || "",
      assessment: text.match(/ASSESSMENT[:\s]+([\s\S]*?)(?=PLAN|$)/i)?.[1]?.trim() || "",
      plan: text.match(/PLAN[:\s]+([\s\S]*?)$/i)?.[1]?.trim() || "",
    });
  }

  async function runBillingAnalysis() {
    await billingAI.run(
      `Perform a comprehensive billing analysis and provide:
1. Recommended E&M level (99202-99215) with Medical Decision Making justification
2. All applicable CPT codes with descriptions and RVUs
3. ICD-10-CM codes with specificity guidance (use 7th character extensions where applicable)
4. Modifier recommendations (25, 59, etc.) with clinical justification
5. Pre-authorization requirements for this payer
6. Documentation tips to support the selected E&M level
7. Estimated reimbursement breakdown by CPT code
8. Denial prevention tips for this diagnosis/payer combination`,
      `Patient: ${patient.name}, Age: ${patient.age}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Chief Complaint: ${patient.primaryComplaint}
Diagnoses from encounter: ${soap.assessment || "Pending SOAP generation"}
CPT codes entered: ${cpt || "Not entered"}
Visit type: ${appointment.visitType}
Medical History: ${patient.medicalHistory.join(", ")}`
    );
  }

  const tabList: { id: EncounterTab; label: string; badge?: string }[] = [
    { id: "prechart", label: "Pre-Chart" },
    { id: "vitals", label: "Vitals & ROS" },
    { id: "soap", label: "SOAP Note" },
    { id: "billing", label: "Billing & Coding" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Encounter Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1">
            ← Back
          </button>
          <div className="h-4 w-px bg-gray-700" />
          <div>
            <span className="text-white font-semibold">{patient.name}</span>
            <span className="text-gray-400 text-sm ml-2">· Age {patient.age} · {aptTime} · {patient.insuranceProvider}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={cn("text-xs px-2.5 py-1 rounded-full border", appointment.status === "checked-in" ? "text-green-400 bg-green-900/20 border-green-700/40" : "text-gray-400 bg-gray-800 border-gray-700")}>{appointment.status.replace("-", " ")}</span>
          <button onClick={() => setSigned(true)} disabled={signed} className={cn("px-4 py-1.5 rounded-lg text-sm font-medium transition-colors", signed ? "bg-green-700 text-green-100" : "bg-green-600 hover:bg-green-700 text-white")}>
            {signed ? "✓ Encounter Signed" : "Sign Encounter"}
          </button>
        </div>
      </div>

      {/* Patient quick stats */}
      <div className="bg-gray-950 border-b border-gray-800 px-5 py-2 flex items-center gap-6 flex-shrink-0 overflow-x-auto">
        {[
          { label: "Allergies", value: patient.allergies.join(", "), color: "text-red-400" },
          { label: "Medications", value: patient.medications.join(", "), color: "text-blue-400" },
          { label: "PMH", value: patient.medicalHistory.join(", "), color: "text-purple-400" },
          { label: "Revenue/Visit", value: `$${patient.revenuePerVisit}`, color: "text-emerald-400" },
          { label: "Pay Reliability", value: `${patient.paymentReliability}%`, color: "text-green-400" },
        ].map(item => (
          <div key={item.label} className="flex-shrink-0">
            <span className="text-xs text-gray-600">{item.label}: </span>
            <span className={cn("text-xs font-medium", item.color)}>{item.value}</span>
          </div>
        ))}
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-800 px-5 flex gap-1 flex-shrink-0 bg-gray-950">
        {tabList.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px", activeTab === t.id ? "border-blue-500 text-blue-400" : "border-transparent text-gray-500 hover:text-gray-300")}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">

        {/* PRE-CHART */}
        {activeTab === "prechart" && (
          <div className="p-5 max-w-4xl">
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1.5">History of Present Illness (HPI)</label>
              <textarea value={hpi} onChange={e => setHpi(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder={`Document the HPI for ${patient.name}... (onset, location, duration, character, aggravating/alleviating factors, radiation, timing, severity)`} />
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-white">AI Pre-Visit Summary</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Evidence-based clinical briefing</p>
                </div>
                <button onClick={runPreChart} disabled={preChart.loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                  {preChart.loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {preChart.loading ? "Generating..." : "Generate Pre-Chart"}
                </button>
              </div>
              {preChart.output ? (
                <div className="relative">
                  <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{preChart.output}</pre>
                  {preChart.loading && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />}
                </div>
              ) : (
                <p className="text-gray-600 text-sm">Click &quot;Generate Pre-Chart&quot; to get a comprehensive AI-powered pre-visit clinical briefing.</p>
              )}
            </div>
          </div>
        )}

        {/* VITALS & ROS */}
        {activeTab === "vitals" && (
          <div className="p-5 max-w-5xl space-y-5">
            {/* Vitals */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-medium text-white mb-4">Vital Signs</h3>
              <div className="grid grid-cols-4 gap-4">
                {([
                  { key: "bp", label: "Blood Pressure", placeholder: "120/80", unit: "mmHg" },
                  { key: "hr", label: "Heart Rate", placeholder: "72", unit: "bpm" },
                  { key: "temp", label: "Temperature", placeholder: "98.6", unit: "°F" },
                  { key: "rr", label: "Resp Rate", placeholder: "16", unit: "/min" },
                  { key: "o2sat", label: "O₂ Saturation", placeholder: "98", unit: "%" },
                  { key: "weight", label: "Weight", placeholder: "150", unit: "lbs" },
                  { key: "height", label: "Height", placeholder: "5'8\"", unit: "" },
                  { key: "bmi", label: "BMI", placeholder: "Auto-calc", unit: "kg/m²" },
                ] as const).map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-500 block mb-1">{f.label}</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={vitals[f.key]}
                        onChange={e => setVitals(v => ({ ...v, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      />
                      {f.unit && <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-600">{f.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ROS */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-white">Review of Systems</h3>
                  <p className="text-xs text-gray-500 mt-0.5"><span className="text-green-400 font-bold">−</span> = Negative &nbsp;·&nbsp; <span className="text-red-400 font-bold">+</span> = Positive &nbsp;·&nbsp; <span className="text-gray-600">·</span> = Not asked</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">{rosPositives.length} positive · {rosNegatives.length} negative</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ROS_SYSTEMS.map(system => (
                  <div key={system.key} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{system.label}</p>
                    <div className="space-y-1.5">
                      {system.symptoms.map(symptom => {
                        const val = ros[system.key]?.[symptom] ?? "unset";
                        return (
                          <div key={symptom} className="flex items-center gap-2">
                            <ROSCheckbox value={val} onChange={v => setROSValue(system.key, symptom, v)} />
                            <span className={cn("text-xs", val === "positive" ? "text-red-300" : val === "negative" ? "text-gray-400" : "text-gray-600")}>{symptom}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Physical Exam */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-medium text-white mb-4">Physical Examination</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {PE_SYSTEMS.map(system => (
                  <div key={system.key} className="bg-gray-800/50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wider">{system.label}</p>
                    <div className="space-y-1.5">
                      {system.findings.map(finding => (
                        <label key={finding} className="flex items-center gap-2 cursor-pointer group">
                          <input type="checkbox" checked={!!pe[system.key]?.[finding]} onChange={() => togglePE(system.key, finding)} className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-0 focus:ring-offset-0" />
                          <span className={cn("text-xs transition-colors", pe[system.key]?.[finding] ? "text-gray-300" : "text-gray-600 group-hover:text-gray-500")}>{finding}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SOAP NOTE */}
        {activeTab === "soap" && (
          <div className="p-5 max-w-4xl">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-white">AI SOAP Note Generator</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Uses HPI, vitals, ROS, and PE from this encounter</p>
                </div>
                <button
                  onClick={async () => {
                    const vitalStr = Object.entries(vitals).filter(([, v]) => v).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join(", ");
                    await soapAI.run(
                      "Generate a complete, clinically rigorous SOAP note with four clearly labeled sections: SUBJECTIVE, OBJECTIVE, ASSESSMENT, PLAN. In ASSESSMENT include the primary diagnosis with ICD-10 code, up to 3 differential diagnoses, and clinical reasoning. In PLAN include CPT codes for all services, prescriptions with dosing, follow-up timeline, and patient education points.",
                      `Patient: ${patient.name}, Age: ${patient.age}\nChief Complaint: ${patient.primaryComplaint}\nHPI: ${hpi || "Not documented"}\nMedical History: ${patient.medicalHistory.join(", ")}\nMedications: ${patient.medications.join(", ")}\nAllergies: ${patient.allergies.join(", ")}\nVitals: ${vitalStr || "Not recorded"}\nROS Positives: ${rosPositives.join("; ") || "None documented"}\nROS Negatives: ${rosNegatives.slice(0, 8).join("; ") || "None documented"}\nPhysical Exam: ${peFindings.join(" | ") || "Not documented"}`
                    );
                  }}
                  disabled={soapAI.loading}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
                >
                  {soapAI.loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {soapAI.loading ? "Generating..." : "AI Generate SOAP"}
                </button>
              </div>
              {soapAI.output && (
                <div className="mb-4 p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-gray-400">AI Draft — click &quot;Apply to Fields&quot; to populate the sections below</p>
                    <button onClick={() => parseSoapFromOutput(soapAI.output)} className="text-xs px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">Apply to Fields</button>
                  </div>
                  <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans leading-relaxed max-h-48 overflow-y-auto">{soapAI.output}{soapAI.loading && <span className="inline-block w-0.5 h-3 bg-blue-400 animate-pulse ml-0.5 align-middle" />}</pre>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {(["subjective", "objective", "assessment", "plan"] as const).map(field => (
                <div key={field} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-2">{field}</label>
                  <textarea
                    value={soap[field]}
                    onChange={e => setSoap(s => ({ ...s, [field]: e.target.value }))}
                    rows={field === "plan" ? 6 : 4}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder={`${field.charAt(0).toUpperCase() + field.slice(1)}...`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BILLING */}
        {activeTab === "billing" && (
          <div className="p-5 max-w-4xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <label className="text-xs text-gray-400 block mb-1.5">ICD-10 Codes</label>
                <textarea value={icd10} onChange={e => setIcd10(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="J06.9 - Acute URI&#10;Z23 - Immunization encounter&#10;..." />
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <label className="text-xs text-gray-400 block mb-1.5">CPT Codes</label>
                <textarea value={cpt} onChange={e => setCpt(e.target.value)} rows={4} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" placeholder="99213 - Office visit, low complexity&#10;93000 - 12-lead ECG&#10;..." />
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-medium text-white">AI Billing Analysis</h3>
                  <p className="text-xs text-gray-500 mt-0.5">E&M level justification, code optimization, denial prevention</p>
                </div>
                <button onClick={runBillingAnalysis} disabled={billingAI.loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
                  {billingAI.loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {billingAI.loading ? "Analyzing..." : "Optimize Billing"}
                </button>
              </div>
              {billingAI.output ? (
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{billingAI.output}{billingAI.loading && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />}</pre>
              ) : (
                <p className="text-gray-600 text-sm">Run AI billing analysis to get E&M level recommendations, CPT code optimization, and denial prevention tips specific to this payer.</p>
              )}
            </div>

            {/* Revenue summary */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-medium text-white mb-3">Encounter Revenue Summary</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Est. Revenue</p>
                  <p className="text-xl font-bold text-emerald-400 mt-1">${appointment.estimatedRevenue}</p>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Value Score</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">{patient.valueScore}</p>
                </div>
                <div className="text-center p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs text-gray-500">Pay Reliability</p>
                  <p className="text-xl font-bold text-green-400 mt-1">{patient.paymentReliability}%</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
