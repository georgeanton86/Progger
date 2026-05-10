"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

type SectionStatus = "accepted" | "rejected" | "edited";

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
  route: string;
  duration: string;
  pharmacy: string;
  controlled: boolean;
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
  indication: string;
};

type MDMBreakdown = {
  problems: string;
  data: string;
  risk: string;
  level: string;
};

type BillingIntelligence = {
  emCode: string;
  emLevel: string;
  mdm: MDMBreakdown;
  baseReimbursement: number;
  addOnCodes: { code: string; description: string; revenue: number }[];
  totalBillable: number;
  modifiers: string[];
  documentationRequired: string[];
};

type QualityMeasure = {
  measure: string;
  hedis: string;
  status: "due" | "overdue" | "met" | "na";
  action: string;
  liabilityIfMissed: string;
};

type PredictedExam = {
  expected: string[];
  redFlags: string[];
};

type LiabilityFlag = {
  severity: "critical" | "warning";
  flag: string;
  action: string;
};

type ReturnHook = {
  trigger: string;
  timeframe: string;
  revenue: number;
  qualityMeasure?: string;
};

type CarePlan = {
  predictiveAccuracy: number;
  assessment: CarePlanSection & { primary: string; secondaries: string[]; ruleOut: string[] };
  predictedExam: PredictedExam;
  diagnostics: CarePlanSection;
  treatmentPlan: CarePlanSection;
  patientEducation: CarePlanSection;
  followUp: CarePlanSection;
  ddx: DDXItem[];
  prescriptions: PrescriptionItem[];
  soap: SOAPNote;
  billing: BillingIntelligence;
  upsells: UpsellItem[];
  qualityMeasures: QualityMeasure[];
  liabilityFlags: LiabilityFlag[];
  returnHooks: ReturnHook[];
};

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function ConfBadge({ value }: { value: number }) {
  const color = value >= 90 ? "text-teal-400 bg-teal-900/30 border-teal-700/40" : value >= 75 ? "text-yellow-400 bg-yellow-900/30 border-yellow-700/40" : "text-red-400 bg-red-900/30 border-red-700/40";
  return <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", color)}>{value}% confidence</span>;
}

function SectionCard({
  title,
  items,
  source,
  confidence,
  status,
  onToggle,
  onEdit,
  children,
}: {
  title: string;
  items?: string[];
  source?: string;
  confidence?: number;
  status: SectionStatus;
  onToggle: () => void;
  onEdit?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn(
      "bg-gray-900 border rounded-xl overflow-hidden transition-all",
      status === "rejected" ? "border-red-700/40 opacity-60" : status === "edited" ? "border-amber-600/50" : "border-teal-600/40"
    )}>
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/80">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span className={cn("text-xs font-bold", status === "rejected" ? "text-red-400" : status === "edited" ? "text-amber-400" : "text-teal-400")}>
            {status === "rejected" ? "✕ REJECTED" : status === "edited" ? "✎ EDITED" : "✓ CONFIRMED"}
          </span>
          <span className="font-semibold text-white text-sm">{title}</span>
          {confidence !== undefined && <ConfBadge value={confidence} />}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          {onEdit && status !== "rejected" && (
            <button onClick={onEdit} className="text-xs px-2 py-1 rounded border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-700 transition-colors">
              Edit
            </button>
          )}
          <button
            onClick={onToggle}
            className={cn("text-xs px-2.5 py-1 rounded border transition-colors", status === "rejected" ? "bg-gray-800 text-gray-400 border-gray-700 hover:text-white" : "border-red-800 text-red-500 hover:bg-red-900/20")}
          >
            {status === "rejected" ? "Restore" : "Reject"}
          </button>
        </div>
      </div>
      <div className="px-4 py-3">
        {items && (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span> {item}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
      {source && (
        <div className="px-4 py-1.5 border-t border-gray-800/40">
          <p className="text-xs text-gray-600">Evidence: {source}</p>
        </div>
      )}
    </div>
  );
}

function LoadingScreen() {
  const steps = ["Analyzing Chief Complaint", "Applying 2025 EBM Guidelines", "Generating DDX + ICD-10", "Writing SOAP Note", "Calculating E&M Billing", "Checking HEDIS Measures", "Flagging Liability Risks", "Finalizing Rx Orders"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 800);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-6 px-6 py-12">
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 rounded-full border-4 border-teal-900/40 border-t-teal-400 animate-spin" />
        <div className="absolute inset-3 rounded-full border-4 border-teal-900/20 border-b-teal-600 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl">Rx</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-xl mb-1">Building Predictive Chart</p>
        <p className="text-teal-400 text-sm font-medium animate-pulse">{steps[step]}...</p>
        <p className="text-gray-500 text-xs mt-2">Applying AHA · ADA · USPSTF · IDSA · AAFP 2025 guidelines</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-xs w-full">
        {["Evidence-Based Rx", "E&M Billing", "Legal Guard", "HEDIS Checks"].map((s, i) => (
          <div key={s} className={cn("text-xs px-3 py-1.5 rounded-lg border text-center transition-colors", i <= step % 4 ? "border-teal-700/60 bg-teal-900/20 text-teal-400" : "border-gray-800 text-gray-600")}>
            {i <= step % 4 ? "✓ " : ""}{s}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConfirmModal({ carePlan, patient, onConfirm, onClose }: { carePlan: CarePlan; patient: Patient; onConfirm: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-teal-700/40 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <h3 className="font-bold text-white text-lg mb-1">Confirm & Send Everything</h3>
        <p className="text-gray-400 text-sm mb-4">The following will be submitted simultaneously:</p>
        <div className="space-y-2 mb-5">
          {[
            { icon: "📋", label: "SOAP Note", detail: "Signed to " + (patient.insuranceProvider ?? "EHR") },
            { icon: "💊", label: `${carePlan.prescriptions.filter(r => !r.controlled).length} Prescription(s)`, detail: "Sent to pharmacy" },
            { icon: "🧪", label: "Lab Orders", detail: carePlan.diagnostics.items?.slice(0, 2).join(", ") ?? "As ordered" },
            { icon: "💳", label: `Billing: ${carePlan.billing.emCode}`, detail: `$${carePlan.billing.totalBillable} · ${carePlan.billing.emLevel}` },
            { icon: "📅", label: "Follow-up", detail: carePlan.followUp.items?.[0] ?? "Scheduled" },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-lg">
              <span className="text-lg flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{item.label}</p>
                <p className="text-xs text-gray-400 truncate">{item.detail}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-700 text-gray-400 text-sm hover:text-white transition-colors">
            Review More
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 text-white text-sm font-bold transition-colors">
            Sign & Send All
          </button>
        </div>
      </div>
    </div>
  );
}

export function StreamlinedEncounter({ patient, appointment, onBack }: { patient: Patient; appointment: Appointment; onBack: () => void }) {
  const [generating, setGenerating] = useState(false);
  const [carePlan, setCarePlan] = useState<CarePlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, SectionStatus>>({});
  const [selectedDDX, setSelectedDDX] = useState<number | null>(null);
  const [editingSOAP, setEditingSOAP] = useState<Record<string, boolean>>({});
  const [soapEdits, setSoapEdits] = useState<Partial<SOAPNote>>({});
  const [vitals, setVitals] = useState({ bp: "", hr: "", temp: "", spo2: "", wt: "" });
  const [signed, setSigned] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const visitTime = useTimer();
  const aptTime = new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const generate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    setCarePlan(null);
    setStatuses({});
    setSelectedDDX(null);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stream: false,
          prompt: `You are PrognoSX — the world's most advanced predictive EHR engine. You are a board-certified Family Practice physician in California with expertise in evidence-based medicine, medical billing, and healthcare law. Generate a COMPLETE predictive pre-visit care plan. The provider will review and sign in under 5 minutes. Return ONLY valid JSON — no markdown, no text outside JSON.

PATIENT:
Name: ${patient.name} | Age: ${patient.age} | DOB: ${patient.dateOfBirth}
Chief Complaint: ${patient.primaryComplaint}
HPI: ${patient.hpiPreview}
PMH: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")} ← CHECK ALL Rx AGAINST THESE
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}

REQUIREMENTS — apply ALL of these:
1. EVIDENCE-BASED (2024-2025): USPSTF, AHA/ACC, ADA, IDSA, AAFP, Cochrane, UpToDate
2. ALLERGY CHECK: Cross-reference ALL proposed medications against patient allergies (penicillin allergy = avoid amoxicillin, ampicillin, augmentin; sulfa allergy = avoid Bactrim/sulfamethoxazole; NSAID allergy = avoid ibuprofen/naproxen)
3. E&M BILLING 2025: Use MDM-based coding (AMA 2021 guidelines, still current): 99202/99212=Straightforward, 99203/99213=Low, 99204/99214=Moderate, 99205/99215=High. MDM has 3 elements: Number/Complexity of Problems, Amount/Complexity of Data, Risk of Complications. Need 2/3 elements to meet a level.
4. LEGAL DOCUMENTATION: California PDMP for controlled substances, mandatory reporting, informed consent documentation, negative finding documentation, shared decision making
5. HEDIS/QUALITY MEASURES: Flag overdue screenings (mammogram, colonoscopy, A1C, BP control, depression screen PHQ-9, tobacco cessation, etc.) per NCQA 2025 specifications
6. LIABILITY: Flag any missed diagnosis risks, medication contraindications, overdue labs, documentation gaps that could create liability
7. PREDICTIVE EXAM: Be hyper-specific about expected physical exam findings (don't say "abnormal breath sounds" — say "bilateral expiratory wheezes, prolonged expiration ratio 1:3, decreased air movement at bases")

Return this exact JSON:
{
  "predictiveAccuracy": 94,
  "assessment": {
    "confidence": 93,
    "primary": "Diagnosis Name (ICD-10: X00.0)",
    "secondaries": ["Secondary finding (ICD-10: X00.0)"],
    "ruleOut": ["Diagnosis to rule out — reason"],
    "source": "Specific guideline citation with year"
  },
  "predictedExam": {
    "expected": [
      "System: Specific finding description with expected values/appearance",
      "HEENT: describe exactly what to expect",
      "Lungs: describe exactly",
      "Abd: describe exactly"
    ],
    "redFlags": ["Red flag finding that would change diagnosis/plan"]
  },
  "diagnostics": {
    "confidence": 88,
    "items": ["Test name — clinical indication and expected result"],
    "source": "Guideline citation"
  },
  "treatmentPlan": {
    "confidence": 94,
    "items": ["Specific treatment with dose/frequency/duration"],
    "source": "Evidence citation"
  },
  "patientEducation": {
    "confidence": 97,
    "items": ["Specific education point"],
    "source": "CDC/AAFP"
  },
  "followUp": {
    "confidence": 96,
    "items": ["Return in X timeframe for Y reason", "Return immediately if: [specific symptoms]"],
    "source": "AAFP"
  },
  "ddx": [
    {"diagnosis": "Name", "icd10": "X00.0", "confidence": 93, "legalRisk": "low", "recommended": true, "description": "Key distinguishing features"},
    {"diagnosis": "Name", "icd10": "X00.0", "confidence": 55, "legalRisk": "low", "recommended": false, "description": "Rule out if..."},
    {"diagnosis": "Name", "icd10": "X00.0", "confidence": 35, "legalRisk": "medium", "recommended": false, "description": "Consider if..."},
    {"diagnosis": "Name", "icd10": "X00.0", "confidence": 20, "legalRisk": "high", "recommended": false, "description": "Must exclude — can't miss"},
    {"diagnosis": "Name", "icd10": "X00.0", "confidence": 10, "legalRisk": "high", "recommended": false, "description": "Rare but serious"}
  ],
  "prescriptions": [
    {"name": "Drug Name", "dosing": "Xmg", "route": "PO/IM/topical", "duration": "X days", "pharmacy": "CVS Main St", "controlled": false},
    {"name": "Drug Name", "dosing": "Xmg PRN", "route": "PO", "duration": "30 day supply", "pharmacy": "CVS Main St", "controlled": false}
  ],
  "soap": {
    "subjective": "CC: [complaint]. HPI: [detailed]. PMH: [relevant]. Meds: [list]. Allergies: [list]. ROS: [pertinent positives and negatives].",
    "objective": "Vitals: BP [predicted], HR [predicted], Temp [predicted], SpO2 [predicted]. General: [appearance]. [System-by-system with SPECIFIC predicted findings — be a clinician, not vague].",
    "assessment": "1. [Primary Dx (ICD-10)] — [clinical reasoning]. 2. [Secondary if applicable].",
    "plan": "1. [Specific medication with dose/sig]. 2. [Specific diagnostic test ordered]. 3. [Referral if indicated]. 4. [Patient education point]. 5. [Follow-up timing and reason]. 6. [Billing: E&M code documented as X based on MDM]."
  },
  "billing": {
    "emCode": "99214",
    "emLevel": "Moderate Medical Decision Making",
    "mdm": {
      "problems": "X — meets moderate/high/low based on [specific problem type]",
      "data": "X — [what data reviewed/ordered that contributes to MDM level]",
      "risk": "X — [specific risk element, e.g. prescription drug management = moderate risk]",
      "level": "Moderate (2 of 3 MDM elements at moderate level)"
    },
    "baseReimbursement": 165,
    "addOnCodes": [
      {"code": "G2211", "description": "Longitudinal primary care complexity add-on", "revenue": 16},
      {"code": "99000", "description": "Specimen handling fee if labs drawn", "revenue": 18}
    ],
    "totalBillable": 199,
    "modifiers": ["Modifier 25 if additional procedure same day"],
    "documentationRequired": ["Document MDM elements explicitly in chart", "Note complexity of problems", "List data reviewed", "Document risk — prescription management"]
  },
  "upsells": [
    {
      "procedure": "Procedure name",
      "cpt": "00000",
      "revenue": 120,
      "scopePercent": 96,
      "legalRisk": "low",
      "indication": "Why clinically indicated for this patient today"
    }
  ],
  "qualityMeasures": [
    {
      "measure": "HEDIS measure name",
      "hedis": "Measure abbreviation",
      "status": "due",
      "action": "Specific action to satisfy this measure today",
      "liabilityIfMissed": "Risk level and consequence"
    }
  ],
  "liabilityFlags": [
    {
      "severity": "critical",
      "flag": "Specific risk (e.g. 'Augmentin contains amoxicillin — patient allergic to amoxicillin')",
      "action": "Exact corrective action required"
    }
  ],
  "returnHooks": [
    {
      "trigger": "Reason patient MUST return",
      "timeframe": "X weeks/days",
      "revenue": 185,
      "qualityMeasure": "HEDIS measure satisfied by return visit"
    }
  ]
}`,
        }),
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const data = await res.json();
      const text: string = data.reply || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON returned");
      const parsed = JSON.parse(match[0]) as CarePlan;
      setCarePlan(parsed);
      setSoapEdits(parsed.soap);
      // Default all sections to accepted
      const defaultStatuses: Record<string, SectionStatus> = {
        assessment: "accepted", diagnostics: "accepted", treatmentPlan: "accepted",
        patientEducation: "accepted", followUp: "accepted",
      };
      parsed.prescriptions.forEach((_, i) => { defaultStatuses[`rx-${i}`] = "accepted"; });
      parsed.upsells.forEach((_, i) => { defaultStatuses[`upsell-${i}`] = "accepted"; });
      setStatuses(defaultStatuses);
      // Auto-select recommended DDX
      const recIdx = parsed.ddx.findIndex(d => d.recommended);
      setSelectedDDX(recIdx >= 0 ? recIdx : 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  }, [patient, appointment]);

  useEffect(() => { generate(); }, [generate]);

  function toggle(key: string) {
    setStatuses(prev => ({ ...prev, [key]: prev[key] === "rejected" ? "accepted" : "rejected" }));
  }

  const criticalFlags = carePlan?.liabilityFlags.filter(f => f.severity === "critical") ?? [];
  const allAccepted = carePlan ? Object.values(statuses).every(s => s !== "rejected") : false;
  const totalRevenue = carePlan ? (carePlan.billing.totalBillable + carePlan.upsells.filter((_, i) => statuses[`upsell-${i}`] !== "rejected").reduce((s, u) => s + u.revenue, 0)) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Confirm modal */}
      {showConfirm && carePlan && (
        <ConfirmModal
          carePlan={carePlan}
          patient={patient}
          onConfirm={() => { setSigned(true); setShowConfirm(false); }}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-500 hover:text-white text-sm flex-shrink-0">← Back</button>
          <div className="h-4 w-px bg-gray-700 flex-shrink-0" />
          <div className="min-w-0">
            <span className="text-white font-bold">{patient.name}</span>
            <span className="text-gray-400 text-xs ml-2 hidden sm:inline">· Age {patient.age} · {aptTime}</span>
          </div>
          {carePlan && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-teal-900/30 text-teal-400 border border-teal-700/40 font-semibold hidden sm:inline">
              {carePlan.predictiveAccuracy}% predictive
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Visit timer */}
          <span className="text-xs font-mono px-2 py-1 bg-gray-800 text-gray-400 rounded border border-gray-700">⏱ {visitTime}</span>
          {criticalFlags.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/40 font-bold animate-pulse">
              ⚠ {criticalFlags.length} Critical Flag{criticalFlags.length > 1 ? "s" : ""}
            </span>
          )}
          {carePlan && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-700/40 font-semibold">
              ${totalRevenue} billable
            </span>
          )}
          {!signed ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={generating || !carePlan}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
            >
              Sign & Send All
            </button>
          ) : (
            <span className="px-4 py-2 rounded-lg bg-green-800 text-green-200 text-sm font-bold">✓ Signed & Sent</span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full md:w-64 md:border-r border-b md:border-b-0 border-gray-800 overflow-y-auto bg-gray-900/40 flex-shrink-0 p-4 space-y-4 max-h-56 md:max-h-none">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-teal-600 flex items-center justify-center text-white font-bold flex-shrink-0">{getInitials(patient.name)}</div>
            <div>
              <p className="font-bold text-white text-sm">{patient.name}</p>
              <p className="text-xs text-gray-400">{patient.insuranceProvider} · Age {patient.age}</p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-3">
            <p className="text-xs font-semibold text-teal-400 mb-1">Intake / Call Notes</p>
            <p className="text-xs text-gray-300 leading-relaxed">{patient.hpiPreview}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Chief Complaint</p>
            <p className="text-sm font-bold text-white">{patient.primaryComplaint}</p>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Vitals</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { key: "bp", label: "BP", placeholder: "120/80", color: "text-red-400" },
                { key: "hr", label: "HR", placeholder: "72", color: "text-orange-400" },
                { key: "temp", label: "Temp", placeholder: "98.6", color: "text-yellow-400" },
                { key: "spo2", label: "SpO₂", placeholder: "98%", color: "text-teal-400" },
                { key: "wt", label: "Wt", placeholder: "lbs", color: "text-purple-400" },
              ].map(v => (
                <div key={v.key} className="bg-gray-800 rounded-lg px-2 py-1.5 border border-gray-700">
                  <p className={cn("text-xs font-semibold", v.color)}>{v.label}</p>
                  <input type="text" value={vitals[v.key as keyof typeof vitals]} onChange={e => setVitals(p => ({ ...p, [v.key]: e.target.value }))} placeholder={v.placeholder} className="w-full bg-transparent text-xs text-gray-300 focus:outline-none placeholder-gray-600 mt-0.5" />
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-red-400 uppercase tracking-wider mb-1.5">⚠ Allergies</p>
            <div className="flex flex-wrap gap-1">
              {patient.allergies.filter(a => a !== "None").length > 0
                ? patient.allergies.filter(a => a !== "None").map(a => <span key={a} className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-700/40 rounded-full">{a}</span>)
                : <span className="text-xs text-gray-500">NKDA</span>}
            </div>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Medications</p>
            <ul className="space-y-0.5">{patient.medications.map(m => <li key={m} className="text-xs text-gray-300">• {m}</li>)}</ul>
          </div>

          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">History</p>
            <ul className="space-y-0.5">{patient.medicalHistory.map(h => <li key={h} className="text-xs text-gray-400">• {h}</li>)}</ul>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-white">PrognoSX Predictive Chart</h2>
              <p className="text-xs text-gray-500">
                {generating ? "Building evidence-based care plan..." : carePlan ? `${Object.values(statuses).filter(s => s === "accepted").length} sections confirmed · ${Object.values(statuses).filter(s => s === "rejected").length} rejected` : ""}
              </p>
            </div>
            {carePlan && !generating && (
              <button onClick={generate} className="text-xs px-3 py-1.5 bg-gray-800 text-gray-400 border border-gray-700 rounded-lg hover:text-white transition-colors">
                Regenerate
              </button>
            )}
          </div>

          {generating && <LoadingScreen />}

          {error && !generating && (
            <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-4">
              <p className="text-red-400 font-medium text-sm">{error}</p>
              <button onClick={generate} className="mt-2 text-xs px-3 py-1 bg-red-900/30 text-red-400 border border-red-700/40 rounded-lg">Retry</button>
            </div>
          )}

          {carePlan && !generating && (
            <>
              {/* CRITICAL LIABILITY FLAGS */}
              {carePlan.liabilityFlags.length > 0 && (
                <div className="bg-gray-900 border border-red-700/50 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 bg-red-900/15 border-b border-red-700/30 flex items-center gap-2">
                    <span className="text-red-400 font-bold text-sm">⚠ Liability Flags — Review Before Signing</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {carePlan.liabilityFlags.map((f, i) => (
                      <div key={i} className={cn("p-3 rounded-lg border", f.severity === "critical" ? "bg-red-900/20 border-red-700/40" : "bg-amber-900/10 border-amber-700/30")}>
                        <div className="flex gap-2 items-start">
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded flex-shrink-0 mt-0.5", f.severity === "critical" ? "bg-red-900/50 text-red-300" : "bg-amber-900/50 text-amber-300")}>
                            {f.severity.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm text-white font-medium">{f.flag}</p>
                            <p className="text-xs text-gray-400 mt-0.5">→ {f.action}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* BILLING INTELLIGENCE */}
              <div className="bg-gray-900 border border-emerald-700/30 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-emerald-700/20 bg-emerald-900/10 flex items-center justify-between">
                  <span className="font-bold text-emerald-400 text-sm">Billing Intelligence</span>
                  <span className="text-emerald-300 font-bold">${carePlan.billing.totalBillable} billable</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="text-center px-4 py-3 bg-emerald-900/20 border border-emerald-700/40 rounded-xl">
                      <p className="text-2xl font-bold text-emerald-400">{carePlan.billing.emCode}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{carePlan.billing.emLevel}</p>
                    </div>
                    <div className="flex-1 space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16 flex-shrink-0">Problems:</span>
                        <span className="text-gray-300">{carePlan.billing.mdm.problems}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16 flex-shrink-0">Data:</span>
                        <span className="text-gray-300">{carePlan.billing.mdm.data}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 w-16 flex-shrink-0">Risk:</span>
                        <span className="text-gray-300">{carePlan.billing.mdm.risk}</span>
                      </div>
                    </div>
                  </div>
                  {carePlan.billing.addOnCodes.length > 0 && (
                    <div className="space-y-1 mb-3">
                      {carePlan.billing.addOnCodes.map((code, i) => (
                        <div key={i} className="flex items-center justify-between text-xs py-1 border-t border-gray-800">
                          <span className="text-gray-400"><span className="font-mono text-gray-300">{code.code}</span> — {code.description}</span>
                          <span className="text-emerald-400 font-semibold">+${code.revenue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="bg-gray-800 rounded-lg p-2.5">
                    <p className="text-xs text-gray-500 mb-1 font-semibold">Documentation required to justify {carePlan.billing.emCode}:</p>
                    <ul className="space-y-0.5">{carePlan.billing.documentationRequired.map((d, i) => <li key={i} className="text-xs text-gray-400">• {d}</li>)}</ul>
                  </div>
                  {carePlan.billing.modifiers.length > 0 && (
                    <p className="text-xs text-gray-500 mt-2">Modifiers: {carePlan.billing.modifiers.join(" · ")}</p>
                  )}
                </div>
              </div>

              {/* QUALITY MEASURES */}
              {carePlan.qualityMeasures.length > 0 && (
                <div className="bg-gray-900 border border-purple-700/30 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-purple-700/20 bg-purple-900/10">
                    <span className="font-bold text-purple-400 text-sm">HEDIS Quality Measures</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {carePlan.qualityMeasures.map((qm, i) => (
                      <div key={i} className={cn("p-3 rounded-lg border", qm.status === "overdue" ? "bg-red-900/10 border-red-700/30" : qm.status === "due" ? "bg-amber-900/10 border-amber-700/30" : "bg-green-900/10 border-green-700/30")}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-white font-medium">{qm.measure}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{qm.action}</p>
                          </div>
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            <span className={cn("text-xs font-bold px-2 py-0.5 rounded", qm.status === "overdue" ? "bg-red-900/40 text-red-400" : qm.status === "due" ? "bg-amber-900/40 text-amber-400" : "bg-green-900/40 text-green-400")}>
                              {qm.status.toUpperCase()}
                            </span>
                            <span className="text-xs text-gray-600 font-mono">{qm.hedis}</span>
                          </div>
                        </div>
                        {qm.liabilityIfMissed && <p className="text-xs text-red-400 mt-1">Liability: {qm.liabilityIfMissed}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PREDICTED EXAM */}
              <div className="bg-gray-900 border border-blue-700/30 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-blue-700/20 bg-blue-900/10">
                  <p className="font-bold text-blue-400 text-sm">Predicted Physical Exam</p>
                  <p className="text-xs text-gray-500 mt-0.5">Expect to find — confirm or reject based on actual exam</p>
                </div>
                <div className="p-4 space-y-3">
                  <ul className="space-y-1.5">
                    {carePlan.predictedExam.expected.map((f, i) => (
                      <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-blue-400 flex-shrink-0 mt-0.5">→</span>{f}
                      </li>
                    ))}
                  </ul>
                  {carePlan.predictedExam.redFlags.length > 0 && (
                    <div className="pt-2 border-t border-gray-800">
                      <p className="text-xs font-semibold text-red-400 mb-1.5">If you find these — escalate plan:</p>
                      {carePlan.predictedExam.redFlags.map((r, i) => (
                        <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                          <span className="flex-shrink-0">⚠</span>{r}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ASSESSMENT */}
              <SectionCard title="Assessment" confidence={carePlan.assessment.confidence} source={carePlan.assessment.source} status={statuses["assessment"] ?? "accepted"} onToggle={() => toggle("assessment")}
                items={[carePlan.assessment.primary, ...carePlan.assessment.secondaries, ...carePlan.assessment.ruleOut.map(r => `Rule out: ${r}`)].filter(Boolean)}
              />

              {/* DIAGNOSTICS */}
              <SectionCard title="Diagnostics & Labs" confidence={carePlan.diagnostics.confidence} source={carePlan.diagnostics.source} status={statuses["diagnostics"] ?? "accepted"} onToggle={() => toggle("diagnostics")} items={carePlan.diagnostics.items} />

              {/* TREATMENT PLAN */}
              <SectionCard title="Treatment Plan" confidence={carePlan.treatmentPlan.confidence} source={carePlan.treatmentPlan.source} status={statuses["treatmentPlan"] ?? "accepted"} onToggle={() => toggle("treatmentPlan")} items={carePlan.treatmentPlan.items} />

              {/* PATIENT EDUCATION */}
              <SectionCard title="Patient Education" confidence={carePlan.patientEducation.confidence} source={carePlan.patientEducation.source} status={statuses["patientEducation"] ?? "accepted"} onToggle={() => toggle("patientEducation")} items={carePlan.patientEducation.items} />

              {/* FOLLOW-UP */}
              <SectionCard title="Follow-up & Return Precautions" confidence={carePlan.followUp.confidence} source={carePlan.followUp.source} status={statuses["followUp"] ?? "accepted"} onToggle={() => toggle("followUp")} items={carePlan.followUp.items} />

              {/* DDX */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                  <span className="font-bold text-white text-sm">Differential Diagnosis</span>
                  <span className="text-xs text-gray-500">Tap to change primary</span>
                </div>
                <div className="p-4 space-y-2">
                  {carePlan.ddx.map((d, i) => (
                    <button key={i} onClick={() => setSelectedDDX(i)} className={cn("w-full text-left p-3 rounded-xl border transition-all", selectedDDX === i ? "border-teal-500 bg-teal-900/15" : "border-gray-700 bg-gray-800/40 hover:border-gray-600")}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={cn("w-3.5 h-3.5 rounded-full border-2 flex-shrink-0", selectedDDX === i ? "border-teal-400 bg-teal-400" : "border-gray-600")} />
                        <span className="font-medium text-white text-sm">{d.diagnosis}</span>
                        <span className="text-xs font-mono text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">{d.icd10}</span>
                        <span className="text-xs text-gray-400">{d.confidence}%</span>
                        <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", d.legalRisk === "low" ? "bg-green-900/40 text-green-400" : d.legalRisk === "medium" ? "bg-amber-900/40 text-amber-400" : "bg-red-900/40 text-red-400")}>
                          {d.legalRisk} risk
                        </span>
                        {d.recommended && selectedDDX === i && <span className="text-xs px-2 py-0.5 bg-teal-900/40 text-teal-400 rounded-full">AI Pick</span>}
                      </div>
                      <p className="text-xs text-gray-400 mt-1 ml-5">{d.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* PRESCRIPTIONS */}
              {carePlan.prescriptions.length > 0 && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-gray-800 flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Prescriptions</span>
                    <span className="text-xs text-teal-400">Ready to send to pharmacy</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {carePlan.prescriptions.map((rx, i) => (
                      <div key={i} className={cn("flex items-center justify-between p-3 rounded-xl border", statuses[`rx-${i}`] === "rejected" ? "border-red-700/30 opacity-50" : "border-teal-700/30 bg-teal-900/5")}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-white text-sm">{rx.name} {rx.dosing}</p>
                            {rx.controlled && <span className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded">C-II</span>}
                          </div>
                          <p className="text-xs text-gray-400">{rx.route} · {rx.duration} · {rx.pharmacy}</p>
                        </div>
                        <button onClick={() => toggle(`rx-${i}`)} className={cn("text-xs px-3 py-1.5 rounded-lg border transition-colors flex-shrink-0 ml-2", statuses[`rx-${i}`] === "rejected" ? "border-gray-700 text-gray-500" : "border-teal-700/40 text-teal-400 bg-teal-900/20")}>
                          {statuses[`rx-${i}`] === "rejected" ? "Removed" : "✓ Send"}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* REVENUE UPSELLS */}
              {carePlan.upsells.length > 0 && (
                <div className="bg-gray-900 border border-emerald-700/20 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-emerald-700/20 bg-emerald-900/5">
                    <span className="font-bold text-emerald-400 text-sm">Additional Revenue Opportunities</span>
                  </div>
                  <div className="p-4 space-y-2">
                    {carePlan.upsells.map((u, i) => (
                      <div key={i} className={cn("flex items-start justify-between gap-3 p-3 rounded-xl border", statuses[`upsell-${i}`] === "rejected" ? "border-gray-700 opacity-50" : "border-gray-700 hover:border-emerald-700/40")}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium text-white text-sm">{u.procedure}</p>
                            <span className="text-xs font-mono text-gray-400 bg-gray-700 px-1.5 py-0.5 rounded">CPT {u.cpt}</span>
                            <span className={cn("text-xs px-2 py-0.5 rounded-full", u.legalRisk === "low" ? "bg-green-900/30 text-green-400" : u.legalRisk === "medium" ? "bg-amber-900/30 text-amber-400" : "bg-red-900/30 text-red-400")}>
                              {u.scopePercent}% scope · {u.legalRisk} risk
                            </span>
                          </div>
                          <p className="text-xs text-gray-400 mt-0.5">{u.indication}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <p className="text-sm font-bold text-emerald-400">+${u.revenue}</p>
                          <button onClick={() => toggle(`upsell-${i}`)} className="text-xs text-gray-500 hover:text-white transition-colors">
                            {statuses[`upsell-${i}`] === "rejected" ? "Add back" : "Remove"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* RETURN VISIT HOOKS */}
              {carePlan.returnHooks.length > 0 && (
                <div className="bg-gray-900 border border-amber-700/25 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-amber-700/20 bg-amber-900/5">
                    <p className="font-bold text-amber-400 text-sm">Return Visit Hooks</p>
                    <p className="text-xs text-gray-500">Schedule now or miss the revenue + quality measures</p>
                  </div>
                  <div className="p-4 space-y-2">
                    {carePlan.returnHooks.map((h, i) => (
                      <div key={i} className="flex items-center justify-between gap-3 p-3 bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white">{h.trigger}</p>
                          <p className="text-xs text-gray-400">{h.timeframe}{h.qualityMeasure ? ` · ${h.qualityMeasure}` : ""}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-amber-400">+${h.revenue}</p>
                          <button className="text-xs text-teal-500 hover:text-teal-300 mt-0.5 transition-colors">Schedule →</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SOAP DROP CHART */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-800">
                  <p className="font-bold text-white text-sm">SOAP Note — Pre-Written</p>
                  <p className="text-xs text-gray-500">Edit any field · Click Done when satisfied</p>
                </div>
                <div className="p-4 space-y-3">
                  {(["subjective", "objective", "assessment", "plan"] as const).map(field => {
                    const isEditing = !!editingSOAP[field];
                    const text = soapEdits[field] ?? carePlan.soap[field];
                    return (
                      <div key={field} className="bg-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">{field}</span>
                          <button onClick={() => setEditingSOAP(p => ({ ...p, [field]: !p[field] }))} className="text-xs text-gray-500 hover:text-white transition-colors">
                            {isEditing ? "Done" : "Edit"}
                          </button>
                        </div>
                        {isEditing
                          ? <textarea value={text} onChange={e => setSoapEdits(p => ({ ...p, [field]: e.target.value }))} rows={4} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" />
                          : <p className="text-sm text-gray-300 leading-relaxed">{text}</p>
                        }
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* SIGN BUTTON */}
              <div className="pb-6">
                {!signed ? (
                  <button onClick={() => setShowConfirm(true)} className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-base font-bold transition-colors shadow-lg">
                    Sign & Send All — Chart · Rx · Labs · Billing
                  </button>
                ) : (
                  <div className="w-full py-4 rounded-2xl bg-green-900/40 border border-green-700/40 text-center">
                    <p className="text-green-400 font-bold">✓ Chart Signed</p>
                    <p className="text-xs text-gray-500 mt-0.5">Rx sent · Labs ordered · Claim submitted · Follow-up scheduled</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
