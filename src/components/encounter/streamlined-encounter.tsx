"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";
import { PatientAvatar } from "@/components/patient-avatar";
import { useVoiceCommand } from "@/hooks/use-voice-command";

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

type RecurringCode = {
  code: string;
  name: string;
  category: string;
  monthlyRevenue: number;
  annualRevenue: number;
  requirement: string;
  eligible: boolean;
  enrollmentAction: string;
};

type RecurringRevenue = {
  qualifies: boolean;
  codes: RecurringCode[];
  totalMonthly: number;
  totalAnnual: number;
  enrollmentNote: string;
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

export type CarePlan = {
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
  recurringRevenue: RecurringRevenue;
  upsells: UpsellItem[];
  qualityMeasures: QualityMeasure[];
  liabilityFlags: LiabilityFlag[];
  returnHooks: ReturnHook[];
};

// Established patient time thresholds (CMS 2021, current 2025)
const TIME_THRESHOLDS = [
  { code: "99211", min: 0,  max: 9,  label: "Minimal" },
  { code: "99212", min: 10, max: 19, label: "Low" },
  { code: "99213", min: 20, max: 29, label: "Low-Moderate" },
  { code: "99214", min: 30, max: 39, label: "Moderate" },
  { code: "99215", min: 40, max: 54, label: "High" },
  { code: "99215+G2212", min: 55, max: 999, label: "High + Prolonged" },
];

function getTimeCode(totalMinutes: number) {
  return TIME_THRESHOLDS.find(t => totalMinutes >= t.min && totalMinutes <= t.max) ?? TIME_THRESHOLDS[0];
}

function useTimer() {
  const [seconds, setSeconds] = useState(0);
  const ref = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    ref.current = setInterval(() => setSeconds(s => s + 1), 1000);
    return () => { if (ref.current) clearInterval(ref.current); };
  }, []);
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return { display: `${m}:${s.toString().padStart(2, "0")}`, totalMinutes: m, totalSeconds: seconds };
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
  onAccept,
  onReject,
  children,
}: {
  title: string;
  items?: string[];
  source?: string;
  confidence?: number;
  status: SectionStatus;
  onAccept: () => void;
  onReject: () => void;
  children?: React.ReactNode;
}) {
  const isRejected = status === "rejected";
  return (
    <div className={cn("rounded-2xl border overflow-hidden transition-all", isRejected ? "border-red-700/40 opacity-55" : "border-gray-700/40")}>
      <div className="flex items-center justify-between px-4 py-3 bg-gray-800/70">
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-semibold text-white text-sm">{title}</span>
          {confidence !== undefined && (
            <span className="text-xs text-gray-400 hidden sm:inline">{confidence}% confidence</span>
          )}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={onReject}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              isRejected ? "bg-red-600 border-red-500 text-white" : "bg-red-900/20 border-red-700/40 text-red-400 hover:bg-red-900/40"
            )}
          >
            ✕ Reject
          </button>
          <button
            onClick={onAccept}
            className={cn("flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
              !isRejected ? "bg-green-600 border-green-500 text-white" : "bg-gray-800 border-gray-600 text-gray-400 hover:bg-gray-700"
            )}
          >
            ✓ Accept
          </button>
        </div>
      </div>
      <div className="px-4 py-3 bg-gray-900/50">
        {items && (
          <ul className="space-y-1.5">
            {items.map((item, i) => (
              <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-purple-400 mt-1 flex-shrink-0 text-xs">●</span>{item}
              </li>
            ))}
          </ul>
        )}
        {children}
      </div>
      {source && (
        <div className="px-4 py-2 border-t border-gray-800/60 bg-gray-900/30">
          <p className="text-xs text-gray-500">☰ Source: {source}</p>
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

// Escape unescaped control characters (literal newlines, tabs, carriage returns)
// inside JSON string values. This is the most common cause of "Expected ',' or '}'"
// errors when an AI generates multi-line clinical text in JSON strings.
function sanitizeJSONStrings(raw: string): string {
  let out = "";
  let inStr = false;
  let esc = false;
  const VALID_ESC = new Set(['"', '\\', '/', 'b', 'f', 'n', 'r', 't', 'u']);

  for (let i = 0; i < raw.length; i++) {
    const c = raw[i];

    if (esc) { out += c; esc = false; continue; }

    if (c === "\\" && inStr) {
      const next = raw[i + 1] ?? "";
      if (VALID_ESC.has(next)) {
        out += c; esc = true;
      } else {
        out += "\\\\"; // bare backslash → escape it (e.g. \U becomes \\U)
      }
      continue;
    }

    if (c === '"') {
      if (!inStr) {
        inStr = true;
        out += c;
        continue;
      }
      // Decide: does this quote close the string, or is it an embedded literal?
      // Peek at the next non-whitespace character. If it's a JSON structural
      // character (, } ] :) or end of input, treat as closing quote.
      // Anything else (a letter, digit, etc.) means the AI put a literal " in a
      // string value — escape it instead of closing the string.
      let j = i + 1;
      while (j < raw.length && (raw[j] === ' ' || raw[j] === '\t')) j++;
      const next = j < raw.length ? raw[j] : '';
      if (next === ',' || next === '}' || next === ']' || next === ':' ||
          next === '\n' || next === '\r' || next === '') {
        inStr = false;
        out += c;
      } else {
        out += '\\"'; // embedded quote → escape it
      }
      continue;
    }

    if (inStr) {
      const code = c.charCodeAt(0);
      if (code === 0x0a) { out += "\\n"; continue; }
      if (code === 0x0d) { out += "\\r"; continue; }
      if (code === 0x09) { out += "\\t"; continue; }
      if (code < 0x20) continue;
    }
    out += c;
  }
  return out;
}

// Try to parse AI response JSON, repairing both control-char corruption and truncation
export function parseCarePlanJSON(text: string): CarePlan {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON in response");
  const raw = text.slice(start);

  // Pass 1: try as-is
  try { return withDefaults(JSON.parse(raw)); } catch { /* repair */ }

  // Pass 2: sanitize unescaped control chars inside strings (fixes literal newlines
  // in SOAP notes, clinical text, etc.) then try again
  const sanitized = sanitizeJSONStrings(raw);
  try { return withDefaults(JSON.parse(sanitized)); } catch { /* repair */ }

  // Pass 3: handle truncation — walk sanitized string tracking brace depth.
  // Track last position where depth dropped 2→1 (a top-level property just closed).
  // Slicing there + appending "}" recovers truncated responses.
  let depth = 0;
  let inStr = false;
  let esc = false;
  let lastCompleteAt1 = 0;

  for (let i = 0; i < sanitized.length; i++) {
    const c = sanitized[i];
    if (esc) { esc = false; continue; }
    if (c === "\\" && inStr) { esc = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "{" || c === "[") depth++;
    if (c === "}" || c === "]") {
      depth--;
      if (depth === 1) lastCompleteAt1 = i + 1;
    }
  }

  if (lastCompleteAt1 > 0) {
    try { return withDefaults(JSON.parse(sanitized.slice(0, lastCompleteAt1) + "}")); } catch { /* continue */ }
  }

  throw new Error("Could not parse AI response — please retry");
}

function withDefaults(p: Partial<CarePlan>): CarePlan {
  return {
    predictiveAccuracy: p.predictiveAccuracy ?? 0,
    assessment: p.assessment ?? { confidence: 0, primary: "Pending", secondaries: [], ruleOut: [], source: "" },
    predictedExam: p.predictedExam ?? { expected: [], redFlags: [] },
    diagnostics: p.diagnostics ?? { confidence: 0, items: [], source: "" },
    treatmentPlan: p.treatmentPlan ?? { confidence: 0, items: [], source: "" },
    patientEducation: p.patientEducation ?? { confidence: 0, items: [], source: "" },
    followUp: p.followUp ?? { confidence: 0, items: [], source: "" },
    ddx: p.ddx ?? [],
    prescriptions: p.prescriptions ?? [],
    soap: p.soap ?? { subjective: "", objective: "", assessment: "", plan: "" },
    billing: p.billing ?? { emCode: "99213", emLevel: "Low MDM", mdm: { problems: "", data: "", risk: "", level: "" }, baseReimbursement: 0, addOnCodes: [], totalBillable: 0, modifiers: [], documentationRequired: [] },
    upsells: p.upsells ?? [],
    qualityMeasures: p.qualityMeasures ?? [],
    liabilityFlags: p.liabilityFlags ?? [],
    returnHooks: p.returnHooks ?? [],
    recurringRevenue: p.recurringRevenue ?? { qualifies: false, codes: [], totalMonthly: 0, totalAnnual: 0, enrollmentNote: "" },
  };
}


export function buildCarePlanPrompt(patient: Patient, appointment: Appointment): string {
  void appointment;
  return `You are PrognoSX — the world's most advanced predictive EHR engine. You are a board-certified Family Practice physician in California with expertise in evidence-based medicine, medical billing, and healthcare law. Generate a COMPLETE predictive pre-visit care plan. The provider will review and sign in under 5 minutes. Return ONLY valid JSON — no markdown, no text outside JSON. CRITICAL JSON RULES: never use literal newline characters inside string values (use \\n instead); never use unescaped double quotes inside string values (use single quotes instead); all string values must be on a single line.

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
2. ALLERGY CHECK: Cross-reference ALL proposed medications against patient allergies
3. E&M BILLING 2025: MDM-based coding — 99212=Straightforward, 99213=Low, 99214=Moderate, 99215=High
4. LEGAL DOCUMENTATION: California PDMP for controlled substances, informed consent, negative findings
5. HEDIS/QUALITY MEASURES: Flag overdue screenings per NCQA 2025 specifications
6. LIABILITY: Flag missed diagnosis risks, medication contraindications, documentation gaps
7. PREDICTIVE EXAM: Hyper-specific expected physical exam findings with precise terminology

Return ONLY this JSON structure (no extra text):
{"predictiveAccuracy":94,"assessment":{"confidence":93,"primary":"Diagnosis (ICD-10: X00.0)","secondaries":["Secondary (ICD-10: X00.0)"],"ruleOut":["Rule out — reason"],"source":"Guideline 2024"},"predictedExam":{"expected":["System: specific finding"],"redFlags":["Red flag finding"]},"diagnostics":{"confidence":88,"items":["Test — indication"],"source":"Guideline"},"treatmentPlan":{"confidence":94,"items":["Treatment with dose/frequency"],"source":"Evidence"},"patientEducation":{"confidence":97,"items":["Education point"],"source":"CDC/AAFP"},"followUp":{"confidence":96,"items":["Return in X for Y","Return immediately if: symptoms"],"source":"AAFP"},"ddx":[{"diagnosis":"Name","icd10":"X00.0","confidence":93,"legalRisk":"low","recommended":true,"description":"Key features"},{"diagnosis":"Name","icd10":"X00.0","confidence":55,"legalRisk":"low","recommended":false,"description":"Rule out if..."},{"diagnosis":"Name","icd10":"X00.0","confidence":35,"legalRisk":"medium","recommended":false,"description":"Consider if..."},{"diagnosis":"Name","icd10":"X00.0","confidence":20,"legalRisk":"high","recommended":false,"description":"Must exclude"},{"diagnosis":"Name","icd10":"X00.0","confidence":10,"legalRisk":"high","recommended":false,"description":"Rare but serious"}],"prescriptions":[{"name":"Drug","dosing":"Xmg","route":"PO","duration":"X days","pharmacy":"CVS Main St","controlled":false}],"soap":{"subjective":"CC: complaint. HPI: detailed history. PMH: relevant. Meds: list. Allergies: list. ROS: positives and negatives.","objective":"Vitals: BP predicted, HR predicted, Temp predicted, SpO2 predicted. General: appearance. Specific system findings.","assessment":"1. Primary Dx (ICD-10) — reasoning. 2. Secondary if applicable.","plan":"1. Medication with dose/sig. 2. Diagnostic test. 3. Referral if needed. 4. Education. 5. Follow-up timing. 6. Billing: E&M code based on MDM."},"billing":{"emCode":"99214","emLevel":"Moderate MDM","mdm":{"problems":"X chronic conditions","data":"Labs reviewed/ordered","risk":"Prescription drug management","level":"Moderate (2/3 MDM elements)"},"baseReimbursement":165,"addOnCodes":[{"code":"G2211","description":"Longitudinal care add-on","revenue":16}],"totalBillable":181,"modifiers":["Modifier 25 if additional procedure"],"documentationRequired":["Document MDM explicitly","Note complexity","List data reviewed","Document risk"]},"upsells":[{"procedure":"Procedure","cpt":"00000","revenue":120,"scopePercent":96,"legalRisk":"low","indication":"Clinical indication for this patient"}],"qualityMeasures":[{"measure":"HEDIS measure","hedis":"Abbreviation","status":"due","action":"Action to satisfy today","liabilityIfMissed":"Risk and consequence"}],"liabilityFlags":[{"severity":"warning","flag":"Specific risk","action":"Corrective action"}],"returnHooks":[{"trigger":"Reason to return","timeframe":"X weeks","revenue":185,"qualityMeasure":"HEDIS measure"}],"recurringRevenue":{"qualifies":true,"codes":[{"code":"99490","name":"Chronic Care Management","category":"CCM","monthlyRevenue":62,"annualRevenue":744,"requirement":"2+ chronic conditions, 20+ min/month","eligible":true,"enrollmentAction":"Obtain CCM consent today"},{"code":"99487","name":"Complex CCM","category":"CCM","monthlyRevenue":134,"annualRevenue":1608,"requirement":"3+ complex conditions, 60+ min/month","eligible":false,"enrollmentAction":"N/A"},{"code":"99454","name":"RPM Device Supply","category":"RPM","monthlyRevenue":55,"annualRevenue":660,"requirement":"CHF/HTN/DM requiring monitoring","eligible":false,"enrollmentAction":"N/A"},{"code":"99457","name":"RPM Management","category":"RPM","monthlyRevenue":54,"annualRevenue":648,"requirement":"20+ min/month reviewing RPM data","eligible":false,"enrollmentAction":"N/A"},{"code":"G0438","name":"Annual Wellness Visit","category":"AWV","monthlyRevenue":0,"annualRevenue":185,"requirement":"Medicare patient only","eligible":false,"enrollmentAction":"N/A"},{"code":"G0507","name":"Behavioral Health Integration","category":"BHI","monthlyRevenue":50,"annualRevenue":600,"requirement":"Behavioral health diagnosis, 20+ min/month","eligible":false,"enrollmentAction":"N/A"}],"totalMonthly":62,"totalAnnual":744,"enrollmentNote":"CCM consent required at this visit."}}

CCM eligible if 2+ chronic conditions. RPM eligible if CHF/uncontrolled HTN/DM/COPD. AWV only for Medicare. BHI for any behavioral health diagnosis.`;
}

export function StreamlinedEncounter({ patient, appointment, onBack, initialCarePlan }: { patient: Patient; appointment: Appointment; onBack: () => void; initialCarePlan?: CarePlan }) {
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
  const [quickMode, setQuickMode] = useState(false);
  const [showAutoBook, setShowAutoBook] = useState(false);
  const visitTimer = useTimer();
  const [preVisitMinutes] = useState(8); // pre-visit chart review time
  const totalEncounterMinutes = preVisitMinutes + visitTimer.totalMinutes;
  const timeCode = getTimeCode(totalEncounterMinutes);
  const nextThreshold = TIME_THRESHOLDS.find(t => t.min > totalEncounterMinutes);
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
          stream: true,
          prompt: buildCarePlanPrompt(patient, appointment),
        }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        throw new Error(errData.error || `API ${res.status}`);
      }
      if (!res.body) throw new Error("No response body");

      // Accumulate the full SSE stream (faster than stream:false which holds entire
      // response in Vercel memory, often hitting the 60s serverless timeout)
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let text = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const chunk = line.slice(6).trim();
          if (!chunk || chunk === "[DONE]") continue;
          try {
            const evt = JSON.parse(chunk);
            if (evt.type === "content_block_delta" && evt.delta?.type === "text_delta") {
              text += evt.delta.text;
            }
          } catch { /* skip malformed SSE line */ }
        }
      }
      const parsed = parseCarePlanJSON(text);
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

  // If a pre-generated care plan was passed in, initialize from it immediately
  useEffect(() => {
    if (!initialCarePlan) return;
    setCarePlan(initialCarePlan);
    setSoapEdits(initialCarePlan.soap);
    const s: Record<string, SectionStatus> = {
      assessment: "accepted", diagnostics: "accepted", treatmentPlan: "accepted",
      patientEducation: "accepted", followUp: "accepted",
    };
    initialCarePlan.prescriptions.forEach((_, i) => { s[`rx-${i}`] = "accepted"; });
    initialCarePlan.upsells.forEach((_, i) => { s[`upsell-${i}`] = "accepted"; });
    setStatuses(s);
    setSelectedDDX(initialCarePlan.ddx.findIndex(d => d.recommended) ?? 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (!initialCarePlan) generate(); }, [generate, initialCarePlan]);

  function toggle(key: string) {
    setStatuses(prev => ({ ...prev, [key]: prev[key] === "rejected" ? "accepted" : "rejected" }));
  }
  function accept(key: string) { setStatuses(prev => ({ ...prev, [key]: "accepted" })); }
  function reject(key: string) { setStatuses(prev => ({ ...prev, [key]: "rejected" })); }

  function confirmAll() {
    if (!carePlan) return;
    const next: Record<string, SectionStatus> = {
      assessment: "accepted", diagnostics: "accepted", treatmentPlan: "accepted",
      patientEducation: "accepted", followUp: "accepted",
    };
    carePlan.prescriptions.forEach((_, i) => { next[`rx-${i}`] = "accepted"; });
    carePlan.upsells.forEach((_, i) => { next[`upsell-${i}`] = "accepted"; });
    setStatuses(next);
  }

  // "Hello PrognoSX" voice command
  const voice = useVoiceCommand({
    onCommand: cmd => {
      if (cmd === "confirm-all") confirmAll();
      else if (cmd === "sign") { if (carePlan && !signed) setShowConfirm(true); }
      else if (cmd === "quick-mode") setQuickMode(m => !m);
      else if (cmd === "back") onBack();
      else if (cmd === "regenerate") generate();
      else if (cmd === "reject-assessment") toggle("assessment");
      else if (cmd === "reject-diagnostics") toggle("diagnostics");
      else if (cmd === "reject-treatment") toggle("treatmentPlan");
    },
  });

  const criticalFlags = (carePlan?.liabilityFlags ?? []).filter(f => f.severity === "critical");
  const allAccepted = carePlan ? Object.values(statuses).every(s => s !== "rejected") : false;
  const totalRevenue = carePlan ? ((carePlan.billing?.totalBillable ?? 0) + (carePlan.upsells ?? []).filter((_, i) => statuses[`upsell-${i}`] !== "rejected").reduce((s, u) => s + u.revenue, 0)) : 0;

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Confirm modal */}
      {showConfirm && carePlan && (
        <ConfirmModal
          carePlan={carePlan}
          patient={patient}
          onConfirm={() => {
            setSigned(true);
            setShowConfirm(false);
            if (carePlan.returnHooks.length > 0) setShowAutoBook(true);
          }}
          onClose={() => setShowConfirm(false)}
        />
      )}

      {/* Auto-book return appointment modal */}
      {showAutoBook && carePlan && carePlan.returnHooks[0] && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm shadow-2xl">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📅</span>
              <div>
                <p className="text-white font-bold text-sm">Book Follow-Up?</p>
                <p className="text-xs text-gray-400">Capture the next visit before they leave</p>
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-3 mb-4">
              <p className="text-xs font-semibold text-teal-400 mb-1">{patient.name}</p>
              <p className="text-sm text-white font-medium">{carePlan.returnHooks[0].trigger}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-xs px-2 py-0.5 bg-blue-900/30 text-blue-400 border border-blue-700/40 rounded-full">
                  📆 {carePlan.returnHooks[0].timeframe}
                </span>
                <span className="text-xs px-2 py-0.5 bg-emerald-900/20 text-emerald-400 border border-emerald-700/30 rounded-full">
                  ${carePlan.returnHooks[0].revenue} est.
                </span>
              </div>
              {carePlan.returnHooks[0].qualityMeasure && (
                <p className="text-xs text-purple-400 mt-1.5">✓ Satisfies: {carePlan.returnHooks[0].qualityMeasure}</p>
              )}
            </div>
            {carePlan.returnHooks.length > 1 && (
              <p className="text-xs text-gray-500 mb-3">+{carePlan.returnHooks.length - 1} more follow-up hooks available</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAutoBook(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-bold transition-colors"
              >
                📅 Book Appointment
              </button>
              <button
                onClick={() => setShowAutoBook(false)}
                className="px-4 py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-2.5 flex items-center justify-between flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="text-gray-500 hover:text-white text-sm flex-shrink-0">← Back</button>
          <div className="h-4 w-px bg-gray-700 flex-shrink-0" />
          {/* Patient avatar in top bar */}
          <PatientAvatar patient={patient} size={32} />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-white font-bold text-sm">{patient.name}</span>
              <span className="text-gray-400 text-xs hidden sm:inline">{patient.age}yo · {aptTime}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-700/40 font-semibold">● Within Scope</span>
              {patient.insuranceProvider && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/30 hidden sm:inline">
                  {patient.insuranceProvider} {patient.insurancePlan}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
          {/* Voice listening indicator */}
          {voice.supported && (
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all",
              voice.listening
                ? "border-green-500/60 bg-green-900/30 text-green-300 animate-pulse"
                : "border-gray-700 bg-gray-800/50 text-gray-600"
            )}>
              <span>{voice.listening ? "🎤" : "🎙"}</span>
              <span className="hidden sm:inline font-medium">
                {voice.lastCommand || (voice.listening ? "Listening…" : "Hello PrognoSX")}
              </span>
            </div>
          )}
          {/* Visit timer + time-based billing code */}
          <span className="text-xs font-mono px-2 py-1 bg-gray-800 text-gray-400 rounded border border-gray-700 flex items-center gap-1.5">
            <span>⏱ {visitTimer.display}</span>
            <span className="text-gray-600">|</span>
            <span className="text-teal-400 font-semibold">{timeCode.code}</span>
            <span className="text-gray-500 hidden sm:inline">{totalEncounterMinutes}min</span>
          </span>
          {/* Quick Confirm Mode toggle */}
          {carePlan && !generating && (
            <button
              onClick={() => setQuickMode(m => !m)}
              className={cn(
                "px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors border",
                quickMode
                  ? "bg-yellow-600/30 border-yellow-500/50 text-yellow-300"
                  : "bg-gray-800 border-gray-700 text-gray-400 hover:text-white"
              )}
            >
              ⚡ {quickMode ? "Quick Mode ON" : "Quick Mode"}
            </button>
          )}
          {criticalFlags.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-red-900/30 text-red-400 border border-red-700/40 font-bold animate-pulse">
              ⚠ {criticalFlags.length} Flag{criticalFlags.length > 1 ? "s" : ""}
            </span>
          )}
          {carePlan && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-900/20 text-emerald-400 border border-emerald-700/40 font-semibold">
                ${totalRevenue} today
              </span>
              {carePlan.recurringRevenue?.totalMonthly > 0 && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-purple-900/20 text-purple-400 border border-purple-700/40 font-semibold hidden sm:inline">
                  +${carePlan.recurringRevenue.totalMonthly}/mo
                </span>
              )}
            </div>
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

      {/* Pre-room prep status bar */}
      {carePlan && !generating && (
        <div className={cn(
          "border-b px-4 py-2 flex items-center gap-3 overflow-x-auto flex-shrink-0 text-xs",
          signed
            ? "bg-green-950/30 border-green-800/40"
            : "bg-gray-900/60 border-gray-800"
        )}>
          <span className="text-gray-500 flex-shrink-0 font-semibold">Pre-Room:</span>
          {[
            { icon: "💊", label: `Rx queued → ${carePlan.prescriptions[0]?.pharmacy ?? "Pharmacy"}`, done: true },
            { icon: "🧪", label: `${carePlan.diagnostics.items?.length ?? 0} labs ordered`, done: true },
            { icon: "📱", label: "Patient education ready", done: true },
            { icon: "📋", label: "SOAP complete", done: true },
            { icon: "🔒", label: signed ? "Sent ✓" : "Awaiting signature", done: signed },
          ].map(item => (
            <span key={item.label} className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink-0 whitespace-nowrap",
              item.done
                ? "border-green-700/40 bg-green-900/20 text-green-400"
                : "border-gray-700 text-gray-500"
            )}>
              {item.icon} {item.label}
            </span>
          ))}
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
        {/* Left panel */}
        <div className="w-full md:w-64 md:border-r border-b md:border-b-0 border-gray-800 overflow-y-auto bg-gray-900/40 flex-shrink-0 p-4 space-y-4 max-h-56 md:max-h-none">
          <div className="flex items-center gap-3">
            <PatientAvatar patient={patient} size={48} />
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
              {(patient.allergies ?? []).filter(a => a !== "None").length > 0
                ? (patient.allergies ?? []).filter(a => a !== "None").map(a => <span key={a} className="text-xs px-2 py-0.5 bg-red-900/30 text-red-400 border border-red-700/40 rounded-full">{a}</span>)
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
              <h2 className="text-lg font-bold text-white">✦ AI Care Plan Studio</h2>
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

          {/* ── QUICK CONFIRM MODE ── */}
          {carePlan && !generating && quickMode && (
            <div className="space-y-2">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs text-yellow-400 font-bold">⚡ Quick Confirm — tap to reject</p>
                <span className="text-xs text-gray-500">
                  {Object.values(statuses).filter(s => s === "accepted").length} / {Object.keys(statuses).length} confirmed
                </span>
              </div>

              {/* Liability flags always shown even in quick mode */}
              {carePlan.liabilityFlags.filter(f => f.severity === "critical").map((f, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-red-900/20 border border-red-700/40 flex items-center gap-2">
                  <span className="text-red-400 text-xs font-bold flex-shrink-0">⚠ CRITICAL</span>
                  <p className="text-xs text-red-300 flex-1">{f.flag}</p>
                </div>
              ))}

              {/* Compact section rows */}
              {[
                { key: "assessment", icon: "🔍", label: "Assessment", detail: carePlan.assessment.primary },
                { key: "diagnostics", icon: "🧪", label: "Diagnostics", detail: (carePlan.diagnostics.items ?? []).slice(0, 2).join(" · ") },
                { key: "treatmentPlan", icon: "💊", label: "Treatment", detail: (carePlan.treatmentPlan.items ?? []).slice(0, 2).join(" · ") },
                { key: "patientEducation", icon: "📚", label: "Patient Education", detail: (carePlan.patientEducation.items ?? [])[0] },
                { key: "followUp", icon: "📅", label: "Follow-Up", detail: (carePlan.followUp.items ?? [])[0] },
              ].map(row => {
                const st = statuses[row.key] ?? "accepted";
                return (
                  <button
                    key={row.key}
                    onClick={() => toggle(row.key)}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      st === "rejected"
                        ? "border-red-700/50 bg-red-900/10"
                        : "border-green-700/40 bg-green-900/10"
                    )}
                  >
                    <span className="text-lg flex-shrink-0">{row.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold", st === "rejected" ? "text-red-400" : "text-green-400")}>{row.label}</p>
                      <p className="text-xs text-gray-400 truncate">{row.detail}</p>
                    </div>
                    <span className={cn("text-lg flex-shrink-0", st === "rejected" ? "text-red-500" : "text-green-500")}>
                      {st === "rejected" ? "✗" : "✓"}
                    </span>
                  </button>
                );
              })}

              {/* Prescriptions */}
              {carePlan.prescriptions.map((rx, i) => {
                const st = statuses[`rx-${i}`] ?? "accepted";
                return (
                  <button
                    key={i}
                    onClick={() => toggle(`rx-${i}`)}
                    className={cn(
                      "w-full flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all",
                      st === "rejected" ? "border-red-700/50 bg-red-900/10" : "border-green-700/40 bg-green-900/10"
                    )}
                  >
                    <span className="text-lg flex-shrink-0">💊</span>
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs font-bold", st === "rejected" ? "text-red-400" : "text-green-400")}>
                        Rx: {rx.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate">{rx.dosing} {rx.route} × {rx.duration}</p>
                    </div>
                    <span className={cn("text-lg flex-shrink-0", st === "rejected" ? "text-red-500" : "text-green-500")}>
                      {st === "rejected" ? "✗" : "✓"}
                    </span>
                  </button>
                );
              })}

              {/* Confirm All + Sign buttons */}
              <div className="pt-2 flex gap-2">
                <button
                  onClick={confirmAll}
                  className="flex-1 py-3 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-sm font-bold transition-colors"
                >
                  ✓ Confirm All
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={signed}
                  className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white text-sm font-bold transition-colors"
                >
                  Sign & Send All
                </button>
              </div>
            </div>
          )}

          {carePlan && !generating && !quickMode && (
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

                  {/* Time-based billing panel */}
                  <div className="mt-3 pt-3 border-t border-gray-800">
                    <p className="text-xs font-semibold text-gray-400 mb-2">
                      Time-Based Billing Alternative
                      <span className="text-gray-600 font-normal ml-1">(CMS 2021 — use whichever supports the higher code)</span>
                    </p>
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {TIME_THRESHOLDS.slice(1).map(t => {
                        const active = totalEncounterMinutes >= t.min && totalEncounterMinutes <= t.max;
                        const past = totalEncounterMinutes > t.max;
                        return (
                          <div key={t.code} className={cn(
                            "flex flex-col items-center px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
                            active ? "border-teal-500 bg-teal-900/20 text-teal-300" :
                            past ? "border-green-800/50 bg-green-900/10 text-green-600" :
                            "border-gray-700 text-gray-600"
                          )}>
                            <span className="font-bold">{t.code}</span>
                            <span className="text-xs opacity-70">{t.min}+ min</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-2">
                      <div>
                        <p className="text-xs text-gray-400">
                          Total encounter time: <span className="text-white font-semibold">{totalEncounterMinutes} min</span>
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          Includes {preVisitMinutes} min pre-visit chart review + {visitTimer.totalMinutes} min face-to-face
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-teal-400">{timeCode.code}</p>
                        <p className="text-xs text-gray-500">{timeCode.label}</p>
                      </div>
                    </div>
                    {nextThreshold && (
                      <p className="text-xs text-amber-400 mt-1.5">
                        {nextThreshold.min - totalEncounterMinutes} more min → <span className="font-bold">{nextThreshold.code}</span> — add complexity documentation or additional counseling time
                      </p>
                    )}
                    <p className="text-xs text-gray-600 mt-1.5">
                      Bill with: <span className="text-gray-400 font-medium">higher of MDM ({carePlan.billing.emCode}) or time-based ({timeCode.code})</span> — document chosen path in chart
                    </p>
                  </div>
                </div>
              </div>

              {/* RECURRING REVENUE — CCM / RPM / AWV / BHI */}
              {carePlan.recurringRevenue?.qualifies && (
                <div className="bg-gray-900 border border-purple-700/40 rounded-xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-purple-700/20 bg-purple-900/10 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-purple-400 text-sm">Recurring Monthly Revenue</span>
                      <span className="text-xs text-gray-500 ml-2">No additional visit required</span>
                    </div>
                    <div className="text-right">
                      <p className="text-purple-300 font-bold text-sm">${carePlan.recurringRevenue.totalMonthly}/mo</p>
                      <p className="text-xs text-gray-500">${carePlan.recurringRevenue.totalAnnual.toLocaleString()}/yr</p>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <div className="mb-3 p-3 bg-purple-900/10 border border-purple-700/20 rounded-lg">
                      <p className="text-xs text-purple-300 font-medium">Strategy: Keep visits short (12-18 min), bill via MDM complexity — then layer monthly recurring codes on top. This patient qualifies for codes that generate revenue every month with no face-to-face required.</p>
                    </div>
                    {carePlan.recurringRevenue.codes.map((code, i) => (
                      <div key={i} className={cn("p-3 rounded-xl border transition-all", code.eligible ? "border-purple-700/40 bg-purple-900/5" : "border-gray-700/40 opacity-50")}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-mono text-sm font-bold text-purple-300">{code.code}</span>
                              <span className="text-sm font-medium text-white">{code.name}</span>
                              <span className="text-xs px-2 py-0.5 bg-gray-800 text-gray-400 rounded">{code.category}</span>
                              {!code.eligible && <span className="text-xs text-red-400">Not eligible</span>}
                            </div>
                            <p className="text-xs text-gray-400">{code.requirement}</p>
                            {code.eligible && <p className="text-xs text-teal-400 mt-1">→ {code.enrollmentAction}</p>}
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-base font-bold text-purple-400">${code.monthlyRevenue}/mo</p>
                            <p className="text-xs text-gray-500">${code.annualRevenue}/yr</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {carePlan.recurringRevenue.enrollmentNote && (
                      <div className="pt-2 border-t border-gray-800">
                        <p className="text-xs text-gray-500">{carePlan.recurringRevenue.enrollmentNote}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

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
              <SectionCard title="Assessment" confidence={carePlan.assessment.confidence} source={carePlan.assessment.source} status={statuses["assessment"] ?? "accepted"} onAccept={() => accept("assessment")} onReject={() => reject("assessment")}
                items={[carePlan.assessment.primary, ...carePlan.assessment.secondaries, ...carePlan.assessment.ruleOut.map(r => `Rule out: ${r}`)].filter(Boolean)}
              />

              {/* DIAGNOSTICS */}
              <SectionCard title="Diagnostics & Labs" confidence={carePlan.diagnostics.confidence} source={carePlan.diagnostics.source} status={statuses["diagnostics"] ?? "accepted"} onAccept={() => accept("diagnostics")} onReject={() => reject("diagnostics")} items={carePlan.diagnostics.items} />

              {/* TREATMENT PLAN */}
              <SectionCard title="Treatment Plan" confidence={carePlan.treatmentPlan.confidence} source={carePlan.treatmentPlan.source} status={statuses["treatmentPlan"] ?? "accepted"} onAccept={() => accept("treatmentPlan")} onReject={() => reject("treatmentPlan")} items={carePlan.treatmentPlan.items} />

              {/* PATIENT EDUCATION */}
              <SectionCard title="Patient Education" confidence={carePlan.patientEducation.confidence} source={carePlan.patientEducation.source} status={statuses["patientEducation"] ?? "accepted"} onAccept={() => accept("patientEducation")} onReject={() => reject("patientEducation")} items={carePlan.patientEducation.items} />

              {/* FOLLOW-UP */}
              <SectionCard title="Follow-up & Red Flags" confidence={carePlan.followUp.confidence} source={carePlan.followUp.source} status={statuses["followUp"] ?? "accepted"} onAccept={() => accept("followUp")} onReject={() => reject("followUp")} items={carePlan.followUp.items} />

              {/* DDX — Replit-style radio cards */}
              <div className="rounded-2xl border border-amber-700/50 overflow-hidden">
                <div className="px-4 py-3 bg-amber-900/20 border-b border-amber-700/30 flex items-center justify-between">
                  <span className="font-bold text-amber-300 text-sm">Differential Diagnosis Options (DDX)</span>
                  <span className="text-xs text-amber-600">Select if rejecting primary</span>
                </div>
                <div className="px-3 py-1 bg-gray-900/40 border-b border-gray-800/60">
                  <p className="text-xs text-gray-500 py-1.5">Primary diagnosis shown first. Tap to select alternative. Legal risk reflects standard of care liability.</p>
                </div>
                <div className="p-3 space-y-2 bg-gray-900/30">
                  {carePlan.ddx.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedDDX(i)}
                      className={cn("w-full text-left p-3 rounded-xl border transition-all",
                        selectedDDX === i
                          ? "border-amber-500/60 bg-amber-900/15"
                          : "border-gray-700/50 bg-gray-800/30 hover:border-gray-600"
                      )}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={cn("w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5",
                          selectedDDX === i ? "border-amber-400 bg-amber-400" : "border-gray-600"
                        )} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 flex-wrap">
                            <p className="font-bold text-white text-sm leading-snug">{d.diagnosis}</p>
                            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap justify-end">
                              {d.recommended && <span className="text-xs px-2 py-0.5 bg-amber-900/50 text-amber-300 rounded-full font-medium">Recommended</span>}
                              <span className="text-xs font-mono text-gray-400 bg-gray-700/60 px-1.5 py-0.5 rounded">{d.icd10}</span>
                              <span className="text-xs text-gray-300 font-semibold">{d.confidence}%</span>
                              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                                d.legalRisk === "low" ? "bg-green-900/40 text-green-400" :
                                d.legalRisk === "medium" ? "bg-amber-900/40 text-amber-400" :
                                "bg-red-900/40 text-red-400"
                              )}>
                                {d.legalRisk} legal risk
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{d.description}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* PRESCRIPTION ORDERS */}
              {carePlan.prescriptions.length > 0 && (
                <div className="rounded-2xl border border-gray-700/40 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-800/70 border-b border-gray-700/40 flex items-center justify-between">
                    <span className="font-bold text-white text-sm">Prescription Orders</span>
                    <span className="text-xs font-mono text-gray-400">CPT: Main Rx</span>
                  </div>
                  <div className="p-3 space-y-2 bg-gray-900/40">
                    {carePlan.prescriptions.map((rx, i) => {
                      const removed = statuses[`rx-${i}`] === "rejected";
                      return (
                        <div key={i} className={cn("flex items-center justify-between gap-3 p-3 rounded-xl border", removed ? "border-red-700/30 opacity-50 bg-red-900/5" : "border-gray-700/50 bg-gray-800/30")}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-white text-sm">{rx.name} {rx.dosing}</p>
                              {rx.controlled && <span className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded font-bold">C-II</span>}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{rx.route} · {rx.duration}</p>
                            <p className="text-xs text-gray-500">{rx.pharmacy}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!removed && (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-900/30 border border-green-700/40 text-green-400 font-semibold">Pending</span>
                            )}
                            <button
                              onClick={() => toggle(`rx-${i}`)}
                              className={cn("text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors",
                                removed
                                  ? "border-teal-700/40 bg-teal-900/20 text-teal-400 hover:bg-teal-900/40"
                                  : "border-red-700/30 text-red-500 bg-red-900/10 hover:bg-red-900/20"
                              )}
                            >
                              {removed ? "Restore" : "Remove"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
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

              {/* CHART OPTIONS + ACCEPT ALL */}
              <div className="rounded-2xl border border-gray-700/40 overflow-hidden">
                <div className="px-4 py-3 bg-gray-800/70 border-b border-gray-700/30">
                  <p className="text-sm font-semibold text-gray-300">Chart Options:</p>
                </div>
                <div className="px-4 py-3 bg-gray-900/40 space-y-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="chartOption" defaultChecked className="accent-teal-500" />
                      <span className="text-sm text-gray-300">Link to Company EHR (Epic, Cerner, etc.)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="chartOption" className="accent-teal-500" />
                      <span className="text-sm text-gray-300">Use as Standalone EHR Record</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        if (carePlan) navigator.clipboard?.writeText(JSON.stringify(carePlan, null, 2)).catch(() => {});
                      }}
                      className="flex-1 py-2.5 rounded-xl border border-gray-600 text-gray-300 text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      📋 Copy to Clipboard
                    </button>
                    <button className="flex-1 py-2.5 rounded-xl border border-blue-700/50 bg-blue-900/20 text-blue-400 text-sm font-medium hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-1.5">
                      ↗ Export to EHR
                    </button>
                  </div>
                </div>
              </div>

              <div className="pb-8">
                {!signed ? (
                  <>
                    <button
                      onClick={() => setShowConfirm(true)}
                      className="w-full py-4 rounded-2xl bg-green-600 hover:bg-green-500 text-white text-base font-bold transition-colors shadow-lg flex items-center justify-center gap-2"
                    >
                      ✈ Accept All &amp; Complete Visit
                    </button>
                    <p className="text-center text-xs text-gray-500 mt-2">Accepts care plan, sends prescriptions to pharmacy, and finalizes clinical note.</p>
                  </>
                ) : (
                  <div className="w-full py-4 rounded-2xl bg-green-900/40 border border-green-700/40 text-center">
                    <p className="text-green-400 font-bold">✓ Visit Complete</p>
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
