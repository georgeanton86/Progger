"use client";
import { useState, useEffect, useCallback } from "react";
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

type UpsellItem = {
  procedure: string;
  cpt: string;
  revenue: number;
  scopePercent: number;
  legalRisk: "low" | "medium" | "high";
  description: string;
};

type RevenueIntelligence = {
  baseVisit: number;
  baseCode: string;
  upsells: UpsellItem[];
  totalPotential: number;
};

type PredictedExamFindings = {
  expected: string[];
  warnings: string[];
};

type LibabilityFlag = {
  severity: "critical" | "warning";
  flag: string;
  action: string;
};

type ReturnVisitHook = {
  trigger: string;
  revenue: number;
  timeframe: string;
  qualityMeasure?: string;
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
  revenueIntelligence: RevenueIntelligence;
  predictedExamFindings: PredictedExamFindings;
  liabilityFlags: LibabilityFlag[];
  returnVisitHooks: ReturnVisitHook[];
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
        <div className="flex items-center gap-2 flex-wrap">
          {status === "accepted" && <span className="text-teal-400">✓</span>}
          <h3 className={cn("font-semibold text-sm", status === "accepted" ? "text-teal-300" : status === "rejected" ? "text-gray-500 line-through" : "text-white")}>
            {title}
          </h3>
          <ConfidenceBadge value={section.confidence} />
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onReject} className={cn("text-xs px-2.5 py-1 rounded border transition-colors", status === "rejected" ? "bg-red-900/40 text-red-400 border-red-700/40" : "border-gray-700 text-gray-400 hover:border-red-500 hover:text-red-400")}>
            Reject
          </button>
          <button onClick={onAccept} className={cn("text-xs px-2.5 py-1 rounded border transition-colors", status === "accepted" ? "bg-teal-900/40 text-teal-400 border-teal-700/40" : "border-gray-700 text-gray-400 hover:border-teal-500 hover:text-teal-400")}>
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
        <p className="text-xs text-gray-500">Source: {section.source}</p>
      </div>
    </div>
  );
}

function LoadingOrb() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-96 gap-6 px-6">
      <div className="relative">
        <div className="w-20 h-20 rounded-full border-4 border-teal-900/60 border-t-teal-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-teal-600/20 animate-pulse" />
        </div>
      </div>
      <div className="text-center max-w-sm">
        <p className="text-white font-semibold text-lg mb-1">Building Predictive Care Plan</p>
        <p className="text-gray-400 text-sm">AI is analyzing patient history, predicting diagnosis, generating SOAP note, calculating revenue intelligence, and checking liability flags...</p>
      </div>
      <div className="flex gap-2">
        {["Analyzing Symptoms", "DDX Generation", "Rx Recommendations", "Revenue Intel"].map((step, i) => (
          <div key={step} className="text-xs px-2.5 py-1 bg-gray-800 text-gray-400 rounded-full border border-gray-700 animate-pulse" style={{ animationDelay: `${i * 200}ms` }}>
            {step}
          </div>
        ))}
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

  const generateCarePlan = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setCarePlan(null);
    setStatuses({});
    setSelectedDDX(null);
    try {
      const prompt = `You are PrognoSX, an AI-powered predictive EHR engine for a Family Practice provider in California. Generate a complete predictive pre-visit care plan as valid JSON only (no other text).

Patient Details:
- Name: ${patient.name}, Age: ${patient.age}, DOB: ${patient.dateOfBirth}
- Chief Complaint: ${patient.primaryComplaint}
- Medical History: ${patient.medicalHistory.join(", ")}
- Current Medications: ${patient.medications.join(", ")}
- Allergies: ${patient.allergies.join(", ")}
- Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
- HPI: ${patient.hpiPreview}

Return ONLY this JSON structure (no markdown, no explanation):
{
  "assessment": {
    "confidence": 91,
    "primary": "Diagnosis Name (ICD10 code)",
    "secondaries": ["Secondary finding 1", "Secondary finding 2"],
    "ruleOut": ["Diagnosis to rule out 1", "Diagnosis to rule out 2"],
    "source": "UpToDate, AAFP Guidelines"
  },
  "diagnostics": {
    "confidence": 88,
    "items": ["Test 1 - rationale", "Test 2 - rationale"],
    "source": "CDC/AAFP Guidelines"
  },
  "treatmentPlan": {
    "confidence": 93,
    "items": ["Treatment 1", "Treatment 2", "Treatment 3"],
    "source": "Cochrane Review, UpToDate"
  },
  "patientEducation": {
    "confidence": 97,
    "items": ["Education point 1", "Education point 2"],
    "source": "CDC Patient Education"
  },
  "followUp": {
    "confidence": 95,
    "items": ["Follow-up instruction 1", "Return precaution 1"],
    "source": "AAFP"
  },
  "ddx": [
    {"diagnosis": "Primary Diagnosis", "icd10": "X00.0", "confidence": 91, "legalRisk": "low", "recommended": true, "description": "Most likely based on presentation"},
    {"diagnosis": "Alternative 1", "icd10": "X00.1", "confidence": 55, "legalRisk": "low", "recommended": false, "description": "Consider if..."},
    {"diagnosis": "Alternative 2", "icd10": "X00.2", "confidence": 40, "legalRisk": "medium", "recommended": false, "description": "Rule out with..."},
    {"diagnosis": "Alternative 3", "icd10": "X00.3", "confidence": 25, "legalRisk": "low", "recommended": false, "description": "Less likely but..."},
    {"diagnosis": "Alternative 4", "icd10": "X00.4", "confidence": 15, "legalRisk": "high", "recommended": false, "description": "Must rule out..."}
  ],
  "prescriptions": [
    {"name": "Medication Name", "dosing": "dose · frequency · duration", "pharmacy": "CVS - Main St"},
    {"name": "Second Med if needed", "dosing": "dose · frequency · PRN", "pharmacy": "CVS - Main St"}
  ],
  "soap": {
    "subjective": "Patient presents with [chief complaint]. [HPI summary]. PMH: [relevant history]. Medications: [relevant meds]. Allergies: [allergies].",
    "objective": "Vitals: [predicted normal/abnormal values]. General: [appearance]. [Relevant system exam findings based on chief complaint - be specific and predictive e.g. 'Oropharynx: erythematous posterior pharynx with mild tonsillar edema, no exudate; TMs: bilateral erythematous tympanic membranes; Turbinates: swollen bilateral turbinates with pale mucosa'].",
    "assessment": "[Primary diagnosis with ICD code]. [Secondary findings]. [Brief clinical reasoning].",
    "plan": "[Specific plan items numbered 1-5+. Include medications with doses, labs ordered, referrals, patient education, follow-up timing]."
  },
  "revenueIntelligence": {
    "baseVisit": 165,
    "baseCode": "99213",
    "upsells": [
      {
        "procedure": "Procedure Name",
        "cpt": "00000",
        "revenue": 120,
        "scopePercent": 94,
        "legalRisk": "low",
        "description": "Why this is indicated for this patient"
      }
    ],
    "totalPotential": 285
  },
  "predictedExamFindings": {
    "expected": [
      "Specific predicted physical exam finding 1 (e.g. Oropharynx: erythematous with mild edema)",
      "Specific predicted finding 2 (e.g. TMs: erythematous, decreased mobility on pneumatic otoscopy)",
      "Specific predicted finding 3 (e.g. Turbinates: swollen, pale mucosa bilateral)"
    ],
    "warnings": [
      "Red flag to watch for 1",
      "Red flag to watch for 2"
    ]
  },
  "liabilityFlags": [
    {
      "severity": "critical",
      "flag": "Specific liability issue (e.g. Patient on metformin - A1C not checked in 12+ months)",
      "action": "Specific required action to mitigate risk"
    },
    {
      "severity": "warning",
      "flag": "Secondary liability concern",
      "action": "Recommended protective action"
    }
  ],
  "returnVisitHooks": [
    {
      "trigger": "Reason for return visit",
      "revenue": 185,
      "timeframe": "2 weeks",
      "qualityMeasure": "HEDIS measure or quality metric if applicable"
    }
  ]
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
      if (!jsonMatch) throw new Error("No JSON in response");
      const parsed = JSON.parse(jsonMatch[0]) as CarePlan;
      setCarePlan(parsed);
      setSoapEdits(parsed.soap);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setGenerating(false);
    }
  }, [patient, appointment]);

  // Auto-generate on mount
  useEffect(() => {
    generateCarePlan();
  }, [generateCarePlan]);

  function setStatus(key: string, status: SectionStatus) {
    setStatuses(prev => ({ ...prev, [key]: prev[key] === status ? "idle" : status }));
  }

  const lowestRiskDDX = carePlan?.ddx.reduce((best, cur) => {
    const order = { low: 0, medium: 1, high: 2 };
    return order[cur.legalRisk] < order[best.legalRisk] ? cur : best;
  }, carePlan.ddx[0]);

  const totalRevenuePotential = carePlan?.revenueIntelligence
    ? carePlan.revenueIntelligence.baseVisit + carePlan.revenueIntelligence.upsells.reduce((s, u) => s + u.revenue, 0)
    : 0;

  const criticalFlags = carePlan?.liabilityFlags.filter(f => f.severity === "critical") ?? [];

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-500 hover:text-white transition-colors text-sm flex items-center gap-1 flex-shrink-0">
            ← Back
          </button>
          <div className="h-4 w-px bg-gray-700 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-white font-semibold">{patient.name}</span>
            <span className="text-gray-400 text-sm ml-2 hidden sm:inline">· Age {patient.age} · {aptTime}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {criticalFlags.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/40 font-bold animate-pulse">
              ⚠ {criticalFlags.length} Liability Flag{criticalFlags.length > 1 ? "s" : ""}
            </span>
          )}
          <span className={cn("text-xs px-2.5 py-1 rounded-full border hidden sm:inline", hasScopeWarning ? "text-amber-400 bg-amber-900/20 border-amber-700/40" : "text-teal-400 bg-teal-900/20 border-teal-700/40")}>
            {hasScopeWarning ? "⚠ Scope Review" : "✓ Within Scope"}
          </span>
          {carePlan && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-700/40 font-semibold">
              ${totalRevenuePotential} potential
            </span>
          )}
          <button
            onClick={() => setSigned(true)}
            disabled={signed || generating}
            className={cn("px-4 py-1.5 rounded-lg text-sm font-bold transition-colors", signed ? "bg-green-700 text-green-100" : "bg-green-600 hover:bg-green-700 text-white disabled:opacity-50")}
          >
            {signed ? "✓ Signed & Sent" : "Sign & Send"}
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full md:w-72 md:border-r border-b md:border-b-0 border-gray-800 overflow-y-auto bg-gray-900/50 flex-shrink-0 p-4 space-y-4 max-h-64 md:max-h-none">
          {/* Patient Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">
              {getInitials(patient.name)}
            </div>
            <div>
              <p className="font-semibold text-white">{patient.name}</p>
              <p className="text-xs text-gray-400">DOB: {patient.dateOfBirth}</p>
              <p className="text-xs text-gray-400">Age {patient.age} · {patient.insuranceProvider}</p>
            </div>
          </div>

          {/* Digital Voicemail / Intake */}
          <div className="bg-gray-800 rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold text-teal-400">Intake / Voicemail</span>
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
                <div key={v.key} className="bg-gray-800 rounded-lg px-2 py-1.5 border border-gray-700">
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
                  <span className="text-teal-400 mt-0.5 flex-shrink-0">•</span> {m}
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
                  <span className="text-purple-400 mt-0.5 flex-shrink-0">•</span> {h}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-5">
          {/* Header bar */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg md:text-xl font-bold text-white">PrognoSX AI Care Plan</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                {generating ? "Building predictive care plan..." : carePlan ? "Pre-visit plan ready — review and sign" : "AI-powered predictive charting"}
              </p>
            </div>
            {!generating && (
              <button
                onClick={generateCarePlan}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium rounded-lg border border-gray-700 transition-colors"
              >
                Regenerate
              </button>
            )}
          </div>

          {/* Loading state */}
          {generating && <LoadingOrb />}

          {/* Error state */}
          {error && !generating && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
              <p className="text-red-400 text-sm font-medium mb-1">Generation failed</p>
              <p className="text-red-300 text-xs">{error}</p>
              <button onClick={generateCarePlan} className="mt-3 text-xs px-3 py-1.5 bg-red-900/30 text-red-400 border border-red-700/40 rounded-lg hover:bg-red-900/50 transition-colors">
                Retry
              </button>
            </div>
          )}

          {carePlan && (
            <>
              {/* LIABILITY FLAGS — always first */}
              {carePlan.liabilityFlags.length > 0 && (
                <div className="bg-gray-900 border border-red-700/40 rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 border-b border-red-700/20 bg-red-900/10">
                    <span className="text-red-400 text-sm">⚠</span>
                    <h3 className="font-bold text-red-400 text-sm">Liability Flags</h3>
                    <span className="text-xs text-gray-500 ml-auto">Address before signing</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {carePlan.liabilityFlags.map((flag, i) => (
                      <div key={i} className={cn("p-3 rounded-lg border", flag.severity === "critical" ? "bg-red-900/20 border-red-700/40" : "bg-amber-900/10 border-amber-700/30")}>
                        <div className="flex items-start gap-2">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded flex-shrink-0", flag.severity === "critical" ? "bg-red-900/40 text-red-400" : "bg-amber-900/40 text-amber-400")}>
                            {flag.severity.toUpperCase()}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{flag.flag}</p>
                            <p className="text-xs text-gray-400 mt-0.5">Action: {flag.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REVENUE INTELLIGENCE */}
              <div className="bg-gray-900 border border-emerald-700/30 rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-emerald-700/20 bg-emerald-900/10">
                  <h3 className="font-bold text-emerald-400 text-sm">Revenue Intelligence</h3>
                  <span className="text-emerald-300 font-bold text-sm">${totalRevenuePotential} total potential</span>
                </div>
                <div className="p-4">
                  {/* Base visit */}
                  <div className="flex items-center justify-between mb-3 p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-white">Base Visit</p>
                      <p className="text-xs text-gray-400">CPT {carePlan.revenueIntelligence.baseCode} · {patient.insuranceProvider}</p>
                    </div>
                    <p className="text-lg font-bold text-white">${carePlan.revenueIntelligence.baseVisit}</p>
                  </div>

                  {/* Upsells */}
                  {carePlan.revenueIntelligence.upsells.length > 0 && (
                    <>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Additional Opportunities</p>
                      <div className="space-y-2">
                        {carePlan.revenueIntelligence.upsells.map((upsell, i) => (
                          <div key={i} className="flex items-start justify-between gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-medium text-white">{upsell.procedure}</p>
                                <span className="text-xs font-mono text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">CPT {upsell.cpt}</span>
                                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", upsell.legalRisk === "low" ? "bg-green-900/40 text-green-400" : upsell.legalRisk === "medium" ? "bg-amber-900/40 text-amber-400" : "bg-red-900/40 text-red-400")}>
                                  {upsell.scopePercent}% scope · {upsell.legalRisk} risk
                                </span>
                              </div>
                              <p className="text-xs text-gray-400 mt-0.5">{upsell.description}</p>
                            </div>
                            <p className="text-base font-bold text-emerald-400 flex-shrink-0">+${upsell.revenue}</p>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* PREDICTED EXAM FINDINGS */}
              <div className="bg-gray-900 border border-purple-700/30 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-purple-700/20 bg-purple-900/10">
                  <h3 className="font-bold text-purple-400 text-sm">Predicted Physical Exam Findings</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Expect to find on examination based on chief complaint and history</p>
                </div>
                <div className="p-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Expected Findings</p>
                    <ul className="space-y-1.5">
                      {carePlan.predictedExamFindings.expected.map((finding, i) => (
                        <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                          <span className="text-purple-400 mt-0.5 flex-shrink-0">→</span>
                          {finding}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {carePlan.predictedExamFindings.warnings.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Watch For (Red Flags)</p>
                      <ul className="space-y-1.5">
                        {carePlan.predictedExamFindings.warnings.map((warn, i) => (
                          <li key={i} className="text-sm text-amber-300 flex items-start gap-2">
                            <span className="text-amber-400 mt-0.5 flex-shrink-0">⚠</span>
                            {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>

              {/* ASSESSMENT */}
              <ClinicalCard
                title="Assessment"
                section={carePlan.assessment}
                status={statuses["assessment"] ?? "idle"}
                onAccept={() => setStatus("assessment", "accepted")}
                onReject={() => setStatus("assessment", "rejected")}
              />

              {/* DIAGNOSTICS */}
              <ClinicalCard
                title="Diagnostics"
                section={carePlan.diagnostics}
                status={statuses["diagnostics"] ?? "idle"}
                onAccept={() => setStatus("diagnostics", "accepted")}
                onReject={() => setStatus("diagnostics", "rejected")}
              />

              {/* TREATMENT PLAN */}
              <ClinicalCard
                title="Treatment Plan"
                section={carePlan.treatmentPlan}
                status={statuses["treatmentPlan"] ?? "idle"}
                onAccept={() => setStatus("treatmentPlan", "accepted")}
                onReject={() => setStatus("treatmentPlan", "rejected")}
              />

              {/* PATIENT EDUCATION */}
              <ClinicalCard
                title="Patient Education"
                section={carePlan.patientEducation}
                status={statuses["patientEducation"] ?? "idle"}
                onAccept={() => setStatus("patientEducation", "accepted")}
                onReject={() => setStatus("patientEducation", "rejected")}
              />

              {/* FOLLOW-UP */}
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
                  <h3 className="font-semibold text-white text-sm">Differential Diagnosis (DDX)</h3>
                  <span className="text-xs text-gray-500">Select if changing primary</span>
                </div>
                <div className="p-4 space-y-2">
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
                        <div className={cn("w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0", selectedDDX === i || (selectedDDX === null && item.recommended) ? "border-teal-400" : "border-gray-600")}>
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
                              <span className="text-xs px-2 py-0.5 bg-teal-900/40 text-teal-400 rounded-full">AI Pick</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {lowestRiskDDX && (
                    <div className="mt-1 px-3 py-2 bg-green-900/20 border border-green-700/40 rounded-lg">
                      <p className="text-xs text-green-400 font-medium">Lowest Legal Risk: {lowestRiskDDX.diagnosis} ({lowestRiskDDX.icd10})</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PRESCRIPTIONS */}
              {carePlan.prescriptions.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
                    <h3 className="font-semibold text-white text-sm">Prescription Orders</h3>
                    <span className="text-xs text-teal-400">Ready to send to pharmacy</span>
                  </div>
                  <div className="p-4 space-y-3">
                    {carePlan.prescriptions.map((rx, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-800 rounded-xl p-3">
                        <div>
                          <p className="font-semibold text-white text-sm">{rx.name}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{rx.dosing}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{rx.pharmacy}</p>
                        </div>
                        <button
                          onClick={() => setStatus(`rx-${i}`, statuses[`rx-${i}`] === "accepted" ? "idle" : "accepted")}
                          className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0", statuses[`rx-${i}`] === "accepted" ? "bg-teal-900/40 text-teal-400 border-teal-700/40" : "border-gray-700 text-gray-400 hover:border-teal-500 hover:text-teal-400")}
                        >
                          {statuses[`rx-${i}`] === "accepted" ? "✓ Send" : "Approve & Send"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RETURN VISIT HOOKS */}
              {carePlan.returnVisitHooks.length > 0 && (
                <div className="bg-gray-900 border border-amber-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 border-b border-amber-700/20 bg-amber-900/5">
                    <h3 className="font-bold text-amber-400 text-sm">Return Visit & Revenue Hooks</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Missed follow-up = missed revenue + potential liability</p>
                  </div>
                  <div className="p-4 space-y-3">
                    {carePlan.returnVisitHooks.map((hook, i) => (
                      <div key={i} className="flex items-start justify-between gap-3 p-3 bg-gray-800/60 rounded-lg border border-gray-700/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{hook.trigger}</p>
                          <p className="text-xs text-gray-400 mt-0.5">Timeframe: {hook.timeframe}</p>
                          {hook.qualityMeasure && (
                            <p className="text-xs text-purple-400 mt-0.5">Quality: {hook.qualityMeasure}</p>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-amber-400">+${hook.revenue}</p>
                          <button className="text-xs text-gray-500 hover:text-white mt-1 transition-colors">Schedule →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOAP DROP CHART */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-800">
                  <h3 className="font-semibold text-white text-sm">Drop Chart — SOAP Note</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Pre-populated · Click Edit to modify any field</p>
                </div>
                <div className="p-4 space-y-3">
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
                            {isEditing ? "Done" : "Edit"}
                          </button>
                        </div>
                        {isEditing ? (
                          <textarea
                            value={text}
                            onChange={e => setSoapEdits(prev => ({ ...prev, [field]: e.target.value }))}
                            rows={4}
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

              {/* CHART OPTIONS + SIGN */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-sm font-semibold text-white mb-3">Chart Options</p>
                <div className="flex flex-wrap gap-4 mb-4">
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
                <button
                  onClick={() => setSigned(true)}
                  disabled={signed}
                  className={cn("w-full py-3 rounded-xl text-sm font-bold transition-colors", signed ? "bg-green-700 text-green-100" : "bg-green-600 hover:bg-green-700 text-white")}
                >
                  {signed ? "✓ Chart Signed & Prescriptions Sent" : "Sign Chart & Send Prescriptions"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
