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

// ── LEGAL SHIELD ─────────────────────────────────────────────────────────────

type LegalShieldItem = {
  dx: string;
  severity: "emergent" | "urgent" | "high";
  pitfall: string;
  mandatoryTests: string[];
  docPhrase: string;
  score?: string;
  malpracticeRisk: "critical" | "high" | "moderate";
};

function getLegalShield(cc: string): LegalShieldItem[] {
  const c = cc.toLowerCase();
  const items: LegalShieldItem[] = [];

  if (c.includes("chest") || c.includes("palpitation") || c.includes("cardiac")) {
    items.push(
      { dx: "Acute Coronary Syndrome / STEMI", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Atypical presentation in women, diabetics, elderly — jaw/arm/epigastric pain without classic CP",
        mandatoryTests: ["EKG within 10 min of arrival", "Troponin ×2 (0h and 3h)", "CXR", "Aspirin 325mg if ACS suspected"],
        docPhrase: "HEART score: _/10. EKG: ___. Troponin: ___. ACS ruled in/out by: ___.",
        score: "HEART Score ≥4 → admit/expedite" },
      { dx: "Pulmonary Embolism", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Dyspnea attributed to anxiety; Wells criteria not applied; D-dimer not ordered",
        mandatoryTests: ["Wells PE score", "D-dimer (if Wells <4)", "CT-PA (if Wells ≥4 or D-dimer elevated)"],
        docPhrase: "Wells PE: _/12.5. D-dimer: ___. SpO2: ___. PE ruled out by: ___.",
        score: "Wells ≥4 → CT-PA without D-dimer" },
      { dx: "Aortic Dissection", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "15% have normal CXR; tearing/ripping quality of pain not elicited; BP differential not checked",
        mandatoryTests: ["BP both arms (>20 mmHg diff suspicious)", "CXR", "ADD-RS score", "CT angio if ADD-RS ≥1"],
        docPhrase: "Pain character: ___. BP right arm: ___ / left: ___. ADD-RS: _. Dissection ruled out by: ___.",
        score: "ADD-RS ≥1 → CT Angiography" }
    );
  }

  if ((c.includes("breath") || c.includes("dyspnea") || c.includes("sob")) && !c.includes("chest")) {
    items.push(
      { dx: "Pulmonary Embolism", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Wells score not calculated; leg swelling/DVT symptoms not asked",
        mandatoryTests: ["Wells PE score", "D-dimer or CT-PA"],
        docPhrase: "Wells PE: _. Leg swelling/DVT symptoms: ___. PE workup: ___.",
        score: "Wells ≥4 → CT-PA" },
      { dx: "CHF / Acute Pulmonary Edema", severity: "urgent", malpracticeRisk: "high",
        pitfall: "Treated as COPD exacerbation; BNP not ordered; prior EF not referenced",
        mandatoryTests: ["BNP or NT-proBNP", "CXR", "EKG", "SpO2 trend"],
        docPhrase: "BNP: ___. CXR: ___. Prior EF: ___. Prior CHF history: ___." }
    );
  }

  if (c.includes("headache") || c.includes("head pain")) {
    items.push(
      { dx: "Subarachnoid Hemorrhage", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Thunderclap onset not elicited; 'sentinel headache' dismissed as migraine; Ottawa rule not applied",
        mandatoryTests: ["Ottawa SAH Rule applied", "Non-contrast CT head", "LP if CT negative + onset <6h or high suspicion"],
        docPhrase: "Ottawa SAH Rule: ___. Pain onset: ___. 'Worst headache of life': yes/no. CT result: ___. LP: ___.",
        score: "Ottawa SAH Rule — any positive → CT + LP" },
      { dx: "Bacterial Meningitis", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Classic triad absent in 50%; antibiotics delayed waiting for LP; Kernig/Brudzinski not documented",
        mandatoryTests: ["LP (or start antibiotics if LP delayed >30 min)", "Blood cultures ×2", "Ceftriaxone 2g IV + dexamethasone"],
        docPhrase: "Neck stiffness: ___. Kernig: ___. Brudzinski: ___. Jolt accentuation: ___. Antibiotics started at: ___." },
      { dx: "Hypertensive Emergency", severity: "urgent", malpracticeRisk: "high",
        pitfall: "BP not rechecked; end-organ damage (papilledema, neuro changes, AKI) not assessed",
        mandatoryTests: ["BP ×2 both arms", "Funduscopic exam", "BMP (creatinine)", "EKG", "UA for proteinuria"],
        docPhrase: "BP: ___. Funduscopy: ___. Neuro exam: ___. Creatinine: ___. End-organ damage: ___." }
    );
  }

  if (c.includes("abdom") || c.includes("stomach") || c.includes("belly") || c.includes("nausea") || c.includes("vomit") || c.includes("rlq") || c.includes("llq")) {
    items.push(
      { dx: "Appendicitis", severity: "urgent", malpracticeRisk: "high",
        pitfall: "Normal WBC in 1/3 of cases; retrocecal position = atypical location; perforation rate rises with delay",
        mandatoryTests: ["Alvarado score", "CBC with diff", "CT abdomen/pelvis with contrast (Alvarado 4-6)", "Surgical consult (Alvarado ≥7)"],
        docPhrase: "Alvarado score: _/10. RLQ tenderness: ___. Rebound/guarding: ___. Psoas/Rovsing sign: ___. CT or surgical plan: ___.",
        score: "Alvarado ≥7 → surgical consult without CT" },
      { dx: "Ectopic Pregnancy (reproductive-age female)", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "LMP not confirmed; prior US showing IUP falsely reassuring for heterotopic; hCG not ordered",
        mandatoryTests: ["Urine hCG → quantitative serum if positive", "Transvaginal pelvic ultrasound", "OB/GYN consult if hCG positive without confirmed IUP"],
        docPhrase: "LMP: ___. Urine hCG: ___. US IUP confirmed: yes/no. Ectopic excluded by: ___. OB consult at: ___." }
    );
  }

  if (c.includes("back") || c.includes("lumbar") || c.includes("spine")) {
    items.push(
      { dx: "Cauda Equina Syndrome", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Saddle anesthesia and urinary retention not specifically asked; MRI delayed or not ordered",
        mandatoryTests: ["Specifically ask: saddle anesthesia, urinary retention, bowel incontinence", "Post-void residual (bladder scan)", "MRI lumbar spine STAT", "Neurosurgery consult"],
        docPhrase: "Saddle anesthesia: yes/no. Urinary retention: yes/no. Bowel incontinence: yes/no. MRI ordered at: ___. Neuro consult: ___." },
      { dx: "Aortic Aneurysm Rupture (age >60)", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Pulsatile abdominal mass not palpated; back/flank pain in elderly attributed to musculoskeletal",
        mandatoryTests: ["Bedside abdominal ultrasound (AAA screening)", "BP both arms", "STAT CT if AAA >5cm or unstable"],
        docPhrase: "Pulsatile abdominal mass: ___. Bedside US: ___. BP: ___. Age + cardiovascular risk factors documented." }
    );
  }

  if (c.includes("fever") || c.includes("febrile")) {
    items.push(
      { dx: "Sepsis / Septic Shock", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "qSOFA not calculated; lactate not ordered; antibiotics delayed >1 hour from recognition",
        mandatoryTests: ["qSOFA score (RR≥22, AMS, SBP≤100)", "Blood cultures ×2 before antibiotics", "Lactate", "Broad-spectrum antibiotics within 1 hour"],
        docPhrase: "qSOFA: _/3. Lactate: ___. Source: ___. Blood cultures at: ___. Antibiotics started at: ___ (≤1h from recognition).",
        score: "qSOFA ≥2 = high-risk sepsis — treat as sepsis" },
      { dx: "Bacterial Meningitis", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Antibiotics delayed for LP; no LP performed; Kernig/Brudzinski not documented",
        mandatoryTests: ["LP or empiric antibiotics if LP delayed", "Blood cultures ×2", "CBC/CMP", "Ceftriaxone 2g IV + dexamethasone"],
        docPhrase: "Kernig: ___. Brudzinski: ___. LP: ___. If LP delayed, antibiotics at: ___." }
    );
  }

  if (c.includes("leg") || c.includes("calf") || c.includes("swelling") || c.includes("dvt")) {
    items.push(
      { dx: "DVT → Pulmonary Embolism", severity: "urgent", malpracticeRisk: "high",
        pitfall: "Wells DVT score not applied; compression ultrasound not ordered; bilateral assessment skipped",
        mandatoryTests: ["Wells DVT score", "D-dimer (if Wells <2)", "Venous duplex ultrasound"],
        docPhrase: "Wells DVT: _/8. D-dimer: ___. Duplex US: ___. Anticoagulation plan: ___.",
        score: "Wells DVT ≥2 → ultrasound regardless of D-dimer" },
      { dx: "Necrotizing Fasciitis", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Appears as cellulitis early; crepitus not palpated; pain out of proportion to exam ignored",
        mandatoryTests: ["LRINEC score", "Soft tissue X-ray (gas in tissues)", "CT with contrast", "Surgical consult — clinical diagnosis"],
        docPhrase: "LRINEC score: ___. Crepitus: ___. Pain out of proportion: ___. Surgical consult: ___.",
        score: "LRINEC ≥6 = high risk necrotizing fasciitis" }
    );
  }

  if (c.includes("dizz") || c.includes("syncope") || c.includes("vertigo") || c.includes("faint")) {
    items.push(
      { dx: "Posterior Stroke / Cerebellar Stroke", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "HINTS exam not performed; posterior fossa stroke missed on CT (requires MRI); thrombolytics window missed",
        mandatoryTests: ["HINTS exam (Head-Impulse, Nystagmus, Test-of-Skew)", "NIHSS score", "Non-contrast CT head", "MRI-DWI if HINTS abnormal", "Neurology consult"],
        docPhrase: "HINTS: HI ___, Nystagmus ___, Skew ___. NIHSS: ___. Last known well: ___. CT result: ___. Neuro at: ___.",
        score: "HINTS more sensitive than CT for posterior stroke" },
      { dx: "Cardiac Syncope (arrhythmia / structural)", severity: "urgent", malpracticeRisk: "high",
        pitfall: "Syncope labeled vasovagal without EKG; Brugada/long QT pattern missed; no orthostatics",
        mandatoryTests: ["12-lead EKG", "Orthostatic BP measurements", "Holter monitor if recurrent", "Echo if structural suspected"],
        docPhrase: "EKG result: ___. Orthostatics: ___. Prodrome (nausea/diaphoresis vs. palpitations): ___. Cardiac vs. vasovagal criteria: ___." }
    );
  }

  if (c.includes("throat") || c.includes("sore")) {
    items.push(
      { dx: "Peritonsillar Abscess / Deep Space Neck Infection", severity: "urgent", malpracticeRisk: "high",
        pitfall: "Treated as viral pharyngitis; uvular deviation and trismus not assessed; airway risk missed",
        mandatoryTests: ["Uvular deviation assessment", "Trismus: can patient open mouth >3cm?", "CT neck if deep space infection suspected", "ENT consult if PTA suspected"],
        docPhrase: "Uvular deviation: ___. Trismus: ___. Drooling/muffled voice: ___. ENT consulted: ___." },
      { dx: "Epiglottitis (increasingly common in adults)", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "Adult epiglottitis dismissed as pharyngitis; drooling/tripod position missed; airway not secured",
        mandatoryTests: ["Lateral neck soft tissue X-ray (thumbprint sign)", "ENT/anesthesia at bedside — do NOT agitate", "Anticipate airway"],
        docPhrase: "Drooling: ___. Tripod position: ___. Lateral neck X-ray: ___. Airway plan: ___. ENT at: ___." }
    );
  }

  if (c.includes("scrotal") || c.includes("testicle") || c.includes("testicular")) {
    items.push(
      { dx: "Testicular Torsion", severity: "emergent", malpracticeRisk: "critical",
        pitfall: "6-hour salvage window missed; doppler ordered but surgical consult delayed; epididymitis assumed without imaging",
        mandatoryTests: ["Scrotal Doppler ultrasound STAT", "Urology consult simultaneously (not after US)", "Manual detorsion attempt if delay anticipated"],
        docPhrase: "Pain onset: ___. Scrotal Doppler: ___. Urology consulted at: ___. Manual detorsion attempted: ___." }
    );
  }

  return items.slice(0, 4);
}

function LegalShieldSection({ chiefComplaint }: { chiefComplaint: string }) {
  const items = getLegalShield(chiefComplaint);
  const [expanded, setExpanded] = useState<number | null>(null);

  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-800/60 overflow-hidden">
      <div className="px-4 py-3 bg-red-950/40 border-b border-red-800/40 flex items-center justify-between">
        <div>
          <span className="font-bold text-red-300 text-sm">⚖ Legal Shield — Must-Not-Miss</span>
          <span className="text-xs text-red-400/60 ml-2">Primary care malpractice defense</span>
        </div>
        <span className="text-xs text-gray-600">CRICO/RMF · The Doctors Company</span>
      </div>
      <div className="p-3 space-y-2 bg-gray-950/50">
        {items.map((item, i) => {
          const isOpen = expanded === i;
          const borderColor = item.malpracticeRisk === "critical" ? "border-red-700/50" : item.malpracticeRisk === "high" ? "border-amber-700/40" : "border-gray-700/40";
          const bgColor = item.malpracticeRisk === "critical" ? "bg-red-950/20" : item.malpracticeRisk === "high" ? "bg-amber-950/10" : "bg-gray-900/30";
          const badgeColor = item.malpracticeRisk === "critical" ? "bg-red-900/50 text-red-400" : item.malpracticeRisk === "high" ? "bg-amber-900/40 text-amber-400" : "bg-gray-700 text-gray-400";
          return (
            <div key={i} className={cn("rounded-xl border transition-all", borderColor, bgColor)}>
              <button
                className="w-full flex items-center gap-3 p-3 text-left"
                onClick={() => setExpanded(isOpen ? null : i)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white text-sm">{item.dx}</p>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-bold", badgeColor)}>
                      {item.severity.toUpperCase()}
                    </span>
                    {item.score && <span className="text-xs text-blue-400 hidden sm:inline">📊 {item.score}</span>}
                  </div>
                  <p className="text-xs text-red-300/70 mt-0.5">⚠ Common miss: {item.pitfall}</p>
                </div>
                <span className="text-gray-500 text-xs flex-shrink-0">{isOpen ? "▲" : "▼"}</span>
              </button>
              {isOpen && (
                <div className="px-3 pb-3 space-y-2">
                  <div>
                    <p className="text-xs font-bold text-gray-400 mb-1">Mandatory Tests / Actions:</p>
                    <ul className="space-y-0.5">
                      {item.mandatoryTests.map((t, j) => (
                        <li key={j} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <span className="text-teal-500 mt-0.5 flex-shrink-0">•</span>{t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="px-3 py-2 bg-gray-800/60 rounded-lg border border-gray-700/40">
                    <p className="text-xs font-bold text-gray-500 mb-0.5">Chart documentation required (copy into SOAP):</p>
                    <p className="text-xs text-gray-300 italic">{item.docPhrase}</p>
                  </div>
                  {item.score && (
                    <div className="px-2.5 py-1.5 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                      <p className="text-xs text-blue-300">📊 Decision Rule: {item.score}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-2 bg-gray-900/20 border-t border-gray-800/60">
        <p className="text-xs text-gray-600">Documenting these rule-outs elevates MDM complexity → supports a higher E&M code.</p>
      </div>
    </div>
  );
}

// ── PRINTABLE VISIT SUMMARY ───────────────────────────────────────────────────

function PrintableVisitSummary({ carePlan, patient, appointment, soapNote, onClose }: {
  carePlan: CarePlan;
  patient: Patient;
  appointment: Appointment;
  soapNote: Partial<SOAPNote>;
  onClose: () => void;
}) {
  const aptDate = new Date(appointment.appointmentTime).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const aptTime = new Date(appointment.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div id="visit-summary-print-root" className="fixed inset-0 bg-white z-50 overflow-auto">
      <style>{`
        @media print {
          body > *:not(#visit-summary-print-root) { display: none !important; }
          #visit-summary-print-root { display: block !important; position: fixed; top: 0; left: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
          .page-break { page-break-before: always; }
        }
      `}</style>

      {/* Controls bar */}
      <div className="no-print flex items-center justify-between px-5 py-3 bg-gray-100 border-b sticky top-0 z-10">
        <button onClick={onClose} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1.5">
          ← Back to Encounter
        </button>
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg"
        >
          🖨 Print / Save PDF
        </button>
      </div>

      {/* Printable content */}
      <div className="max-w-4xl mx-auto p-8 text-gray-900">
        {/* Header */}
        <div className="flex items-start justify-between pb-5 border-b-2 border-gray-200 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded bg-blue-100 text-blue-700 uppercase tracking-widest">Visit Summary</span>
              <span className="text-xs text-gray-500">{aptDate} · {aptTime}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">{patient.name}</h1>
            <p className="text-gray-500 text-sm mt-1">
              Age {patient.age} · DOB: {patient.dateOfBirth}
              {patient.insuranceProvider && ` · ${patient.insuranceProvider} ${patient.insurancePlan ?? ""}`}
            </p>
            <p className="font-semibold text-gray-700 mt-1">Chief Complaint: {patient.primaryComplaint}</p>
          </div>
          <div className="text-right">
            <p className="font-extrabold text-gray-900">PredictaChart<sup className="text-xs">™</sup></p>
            <p className="text-xs text-gray-400 mt-1">Arogya Medical</p>
            <div className="mt-2 text-xs text-gray-500">
              <p>{carePlan.billing.emCode} · {carePlan.billing.emLevel}</p>
              <p className="font-semibold text-green-700">${carePlan.billing.totalBillable} billable</p>
            </div>
          </div>
        </div>

        {/* Assessment */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Assessment</h2>
          <p className="font-bold text-gray-900">{carePlan.assessment.primary}</p>
          {carePlan.assessment.secondaries.length > 0 && (
            <p className="text-sm text-gray-600 mt-0.5">Additional: {carePlan.assessment.secondaries.join(" · ")}</p>
          )}
          {carePlan.assessment.ruleOut.length > 0 && (
            <p className="text-sm text-gray-500 mt-0.5">Ruled out: {carePlan.assessment.ruleOut.join(", ")}</p>
          )}
        </section>

        {/* SOAP Note */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">SOAP Note</h2>
          {(["subjective", "objective", "assessment", "plan"] as const).map(field => (
            <div key={field} className="mb-2">
              <p className="text-xs font-bold uppercase text-gray-500">{field}</p>
              <p className="text-sm text-gray-800 leading-relaxed">{(soapNote[field] ?? carePlan.soap[field]) || "—"}</p>
            </div>
          ))}
        </section>

        {/* Treatment Plan + Prescriptions */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Treatment Plan</h2>
            <ul className="space-y-1">
              {(carePlan.treatmentPlan.items ?? []).map((t, i) => (
                <li key={i} className="text-sm text-gray-800 flex items-start gap-1.5">
                  <span className="text-gray-400 mt-0.5">{i + 1}.</span>{t}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Prescriptions</h2>
            {carePlan.prescriptions.length > 0
              ? carePlan.prescriptions.map((rx, i) => (
                <div key={i} className="text-sm text-gray-800 mb-1">
                  <span className="font-semibold">{rx.name} {rx.dosing}</span>
                  <span className="text-gray-500"> · {rx.route} · {rx.duration}</span>
                  {rx.controlled && <span className="text-red-600 ml-1 font-bold text-xs">CONTROLLED</span>}
                </div>
              ))
              : <p className="text-sm text-gray-500">No prescriptions this visit</p>
            }
          </section>
        </div>

        {/* Diagnostics + Follow-up */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Diagnostic Orders</h2>
            <ul className="space-y-1">
              {(carePlan.diagnostics.items ?? []).map((d, i) => (
                <li key={i} className="text-sm text-gray-800 flex items-start gap-1.5">
                  <span className="text-teal-600 mt-0.5">🧪</span>{d}
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Follow-up Plan</h2>
            <ul className="space-y-1">
              {(carePlan.followUp.items ?? []).map((f, i) => (
                <li key={i} className="text-sm text-gray-800 flex items-start gap-1.5">
                  <span className="text-blue-500 mt-0.5">📅</span>{f}
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Patient Education */}
        <section className="mb-5">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Patient Education</h2>
          <ul className="space-y-1">
            {(carePlan.patientEducation.items ?? []).map((e, i) => (
              <li key={i} className="text-sm text-gray-800 flex items-start gap-1.5">
                <span className="text-purple-500 mt-0.5">•</span>{e}
              </li>
            ))}
          </ul>
        </section>

        {/* Billing */}
        <section className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2">Billing Summary</h2>
          <div className="flex items-center gap-6">
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{carePlan.billing.emCode}</p>
              <p className="text-xs text-gray-500">{carePlan.billing.emLevel}</p>
            </div>
            <div className="text-sm text-gray-700 space-y-0.5">
              <p>Problems: {carePlan.billing.mdm.problems}</p>
              <p>Data: {carePlan.billing.mdm.data}</p>
              <p>Risk: {carePlan.billing.mdm.risk}</p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-xl font-extrabold text-green-700">${carePlan.billing.totalBillable}</p>
              <p className="text-xs text-gray-500">Total billable</p>
            </div>
          </div>
          {carePlan.billing.documentationRequired.length > 0 && (
            <div className="mt-2 text-xs text-gray-500">
              Documentation: {carePlan.billing.documentationRequired.join(" · ")}
            </div>
          )}
        </section>

        {/* Footer */}
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">This chart was generated by PredictaChart™ AI. Provider review and signature required. Not for direct patient distribution without provider approval.</p>
          <p className="text-xs text-gray-300 flex-shrink-0 ml-4">PredictaChart™ · Arogya Medical</p>
        </div>
      </div>
    </div>
  );
}

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
  const steps = ["Analyzing Chief Complaint", "Applying 2025 EBM Guidelines", "Generating DDX + ICD-10", "Writing SOAP Note", "Calculating E&M Billing", "Checking HEDIS Measures", "Flagging Liability Risks", "Finalizing Chart"];
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep(s => (s + 1) % steps.length), 900);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center min-h-96 gap-6 px-6 py-12">
      <style>{`
        @keyframes breathe {
          0%, 100% { opacity: 0.25; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1); }
        }
        .predictachart-logo { animation: breathe 2.4s ease-in-out infinite; }
      `}</style>
      <div className="relative w-28 h-28">
        <div className="absolute inset-0 rounded-full border-4 border-teal-900/40 border-t-teal-400 animate-spin" />
        <div className="absolute inset-3 rounded-full border-4 border-teal-900/20 border-b-teal-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.5s" }} />
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 predictachart-logo">
          <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
            <rect x="0" y="14" width="5" height="8" rx="1.5" fill="#2dd4bf" opacity="0.7"/>
            <rect x="7" y="8" width="5" height="14" rx="1.5" fill="#2dd4bf" opacity="0.85"/>
            <rect x="14" y="3" width="5" height="19" rx="1.5" fill="#2dd4bf"/>
            <rect x="21" y="10" width="5" height="12" rx="1.5" fill="#2dd4bf" opacity="0.85"/>
            <rect x="28" y="6" width="4" height="16" rx="1.5" fill="#2dd4bf" opacity="0.7"/>
            <polyline points="2.5,14 9.5,8 16.5,3 23.5,10 30,6" stroke="#5eead4" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.5"/>
          </svg>
          <span style={{ fontSize: 9, letterSpacing: "0.08em", color: "#2dd4bf", fontWeight: 700, lineHeight: 1 }}>PREDICTA</span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-white font-bold text-xl mb-0.5">PredictaChart<sup className="text-xs text-teal-400">™</sup></p>
        <p className="text-teal-400 text-sm font-medium animate-pulse">{steps[step]}...</p>
        <p className="text-gray-500 text-xs mt-2">AHA · ADA · USPSTF · IDSA · AAFP 2025</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-w-xs w-full">
        {["Evidence-Based", "E&M Billing", "Legal Guard", "HEDIS Checks"].map((s, i) => (
          <div key={s} className={cn("text-xs px-3 py-1.5 rounded-lg border text-center transition-colors", i <= step % 4 ? "border-teal-700/60 bg-teal-900/20 text-teal-400" : "border-gray-800 text-gray-600")}>
            {i <= step % 4 ? "✓ " : ""}{s}
          </div>
        ))}
      </div>
    </div>
  );
}

function RedAlertModal({ flags, redFlags, onCleared, onClose }: {
  flags: LiabilityFlag[];
  redFlags: string[];
  onCleared: () => void;
  onClose: () => void;
}) {
  const items = [
    ...flags.map(f => ({ text: f.flag, sub: f.action })),
    ...redFlags.map(r => ({ text: r, sub: null })),
  ];
  type ItemState = "unchecked" | "absent" | "present";
  const [states, setStates] = useState<ItemState[]>(() => Array(items.length).fill("unchecked"));
  const allAddressed = states.every(s => s !== "unchecked");
  const presentCount = states.filter(s => s === "present").length;

  function mark(i: number, val: ItemState) {
    setStates(prev => prev.map((s, j) => j === i ? (s === val ? "unchecked" : val) : s));
  }

  return (
    <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-gray-950 border border-red-600/60 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-red-950/60 border-b border-red-700/40 px-5 py-4 flex items-center gap-3">
          <span className="text-2xl">🚨</span>
          <div>
            <h3 className="font-extrabold text-red-300 text-base leading-tight">Red Alert — Safety Clearance Required</h3>
            <p className="text-red-400/70 text-xs mt-0.5">Confirm absent or document present &amp; escalate</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-white/20 text-xs">✕</button>
        </div>

        {/* Checklist */}
        <div className="px-5 py-4 space-y-3">
          <div className="flex items-center gap-4 mb-1">
            <span className="text-xs text-gray-500 flex-1">Finding</span>
            <span className="text-xs text-green-500 w-20 text-center">Not Present</span>
            <span className="text-xs text-red-400 w-20 text-center">Present</span>
          </div>
          {items.map((item, i) => {
            const s = states[i];
            return (
              <div
                key={i}
                className={cn(
                  "p-3 rounded-xl border transition-all",
                  s === "absent" ? "border-green-600/50 bg-green-900/10"
                    : s === "present" ? "border-red-500/60 bg-red-950/30"
                    : "border-red-700/30 bg-red-900/5"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-medium leading-snug",
                      s === "absent" ? "text-green-300 line-through opacity-50"
                        : s === "present" ? "text-red-300"
                        : "text-red-200"
                    )}>{item.text}</p>
                    {s === "present" && item.sub && (
                      <p className="text-xs text-amber-300 font-semibold mt-1">⚡ Action: {item.sub}</p>
                    )}
                    {s !== "present" && item.sub && (
                      <p className="text-xs text-gray-600 mt-0.5">→ {item.sub}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    {/* Not Present button */}
                    <button
                      onClick={() => mark(i, "absent")}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all",
                        s === "absent"
                          ? "border-green-500 bg-green-500 text-white"
                          : "border-gray-600 text-gray-600 hover:border-green-500/60"
                      )}
                      title="Confirm not present"
                    >
                      <span className="text-sm font-bold">✓</span>
                    </button>
                    {/* Present button */}
                    <button
                      onClick={() => mark(i, "present")}
                      className={cn(
                        "w-8 h-8 rounded-lg border-2 flex items-center justify-center transition-all",
                        s === "present"
                          ? "border-red-500 bg-red-600 text-white"
                          : "border-gray-600 text-gray-600 hover:border-red-500/60"
                      )}
                      title="Finding is present — escalate"
                    >
                      <span className="text-sm font-bold">!</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          {!allAddressed && (
            <p className="text-center text-xs text-red-400/70 mb-3">
              {states.filter(s => s !== "unchecked").length} of {items.length} addressed — mark each finding ✓ or !
            </p>
          )}
          {presentCount > 0 && allAddressed && (
            <div className="mb-3 p-3 rounded-xl bg-red-950/40 border border-red-700/40">
              <p className="text-xs text-red-300 font-bold">⚠ {presentCount} finding{presentCount > 1 ? "s" : ""} marked PRESENT — escalation actions documented above</p>
              <p className="text-xs text-gray-500 mt-1">Proceeding will log these as documented &amp; escalated in the chart</p>
            </div>
          )}
          <button
            disabled={!allAddressed}
            onClick={onCleared}
            className={cn(
              "w-full py-3 rounded-xl font-bold text-sm transition-all",
              !allAddressed
                ? "bg-gray-800 text-gray-600 cursor-not-allowed"
                : presentCount > 0
                  ? "bg-amber-600 hover:bg-amber-500 text-white"
                  : "bg-green-600 hover:bg-green-500 text-white"
            )}
          >
            {!allAddressed
              ? "Address All Findings to Continue"
              : presentCount > 0
                ? `⚡ Proceed — ${presentCount} Finding${presentCount > 1 ? "s" : ""} Escalated & Documented`
                : "✓ Patient Cleared — No Red Flag Findings"}
          </button>
        </div>
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

type DocumentExtraction = {
  documentType?: string;
  facility?: string;
  dateOnDocument?: string;
  labs?: { name: string; value: string; unit: string; refRange: string; flag: string }[];
  medications?: { name: string; dose: string; frequency: string }[];
  diagnoses?: { code?: string; description: string }[];
  allergies?: { substance: string; reaction: string }[];
  notes?: string;
  actionItems?: string[];
};

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
  return `PrognoSX predictive EHR — board-certified CA Family Practice physician. Generate a pre-visit care plan. Return ONLY valid JSON. JSON rules: no literal newlines inside strings (use \\n), no unescaped quotes, all strings on one line.

PATIENT: ${patient.name} | Age ${patient.age} | CC: ${patient.primaryComplaint}
HPI: ${patient.hpiPreview}
PMH: ${patient.medicalHistory.join(", ")} | Meds: ${patient.medications.join(", ")} | Allergies: ${patient.allergies.join(", ")}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}

Rules: allergy-check all Rx; MDM billing (99212-99215); HEDIS 2025; CA PDMP for controlled Rx; cite evidence sources.

Return ONLY this JSON (fill in real data, keep structure exact):
{"predictiveAccuracy":94,"assessment":{"confidence":93,"primary":"Dx (ICD-10)","secondaries":["2nd"],"ruleOut":["rule out"],"source":"Guideline"},"predictedExam":{"expected":["finding"],"redFlags":["red flag"]},"diagnostics":{"confidence":88,"items":["test — why"],"source":"Guideline"},"treatmentPlan":{"confidence":94,"items":["treatment"],"source":"Evidence"},"patientEducation":{"confidence":97,"items":["point"],"source":"CDC"},"followUp":{"confidence":96,"items":["return in X for Y"],"source":"AAFP"},"ddx":[{"diagnosis":"Name","icd10":"X00.0","confidence":93,"legalRisk":"low","recommended":true,"description":"features"},{"diagnosis":"Name","icd10":"X00.0","confidence":55,"legalRisk":"low","recommended":false,"description":"rule out if"},{"diagnosis":"Name","icd10":"X00.0","confidence":35,"legalRisk":"medium","recommended":false,"description":"consider if"},{"diagnosis":"Name","icd10":"X00.0","confidence":20,"legalRisk":"high","recommended":false,"description":"must exclude"}],"prescriptions":[{"name":"Drug","dosing":"Xmg","route":"PO","duration":"X days","pharmacy":"CVS","controlled":false}],"soap":{"subjective":"CC/HPI/PMH/Meds/Allergies/ROS","objective":"Vitals predicted. Exam findings.","assessment":"1. Dx (ICD-10) — reasoning.","plan":"1. Rx. 2. Labs. 3. Education. 4. Follow-up. 5. Billing code."},"billing":{"emCode":"99214","emLevel":"Moderate MDM","mdm":{"problems":"chronic conditions","data":"labs reviewed","risk":"Rx management","level":"Moderate"},"baseReimbursement":165,"addOnCodes":[{"code":"G2211","description":"Longitudinal care","revenue":16}],"totalBillable":181,"modifiers":[],"documentationRequired":["Document MDM"]},"upsells":[{"procedure":"Procedure","cpt":"00000","revenue":120,"scopePercent":96,"legalRisk":"low","indication":"indication"}],"qualityMeasures":[{"measure":"HEDIS measure","hedis":"Abbr","status":"due","action":"action today","liabilityIfMissed":"risk"}],"liabilityFlags":[{"severity":"warning","flag":"risk","action":"action"}],"returnHooks":[{"trigger":"reason","timeframe":"X weeks","revenue":185,"qualityMeasure":"HEDIS"}],"recurringRevenue":{"qualifies":true,"codes":[{"code":"99490","name":"CCM","category":"CCM","monthlyRevenue":62,"annualRevenue":744,"requirement":"2+ chronic","eligible":true,"enrollmentAction":"Get CCM consent"}],"totalMonthly":62,"totalAnnual":744,"enrollmentNote":"CCM consent required."}}`;
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
  const [showRedAlert, setShowRedAlert] = useState(false);
  const [redAlertCleared, setRedAlertCleared] = useState(false);
  const [quickMode, setQuickMode] = useState(false);
  const [showAutoBook, setShowAutoBook] = useState(false);
  const [showPrintSummary, setShowPrintSummary] = useState(false);
  const [attachState, setAttachState] = useState<"idle" | "loading" | "done">("idle");
  const [attachResult, setAttachResult] = useState<DocumentExtraction | null>(null);
  const attachInputRef = useRef<HTMLInputElement>(null);
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

  const extractDocument = useCallback(async (file: File) => {
    if (file.size > 5 * 1024 * 1024) return;
    setAttachState("loading");
    setAttachResult(null);
    const mt = file.type || "image/jpeg";
    const reader = new FileReader();
    reader.onload = async e => {
      const base64 = (e.target?.result as string).split(",")[1];
      try {
        const res = await fetch("/api/radiology", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: base64, mediaType: mt, mode: "document" }),
        });
        if (!res.ok) throw new Error("Extraction failed");
        const d = await res.json();
        const start = d.reply.indexOf("{");
        const parsed: DocumentExtraction = start >= 0 ? JSON.parse(d.reply.slice(start)) : {};
        setAttachResult(parsed);
        setAttachState("done");
      } catch {
        setAttachState("idle");
      }
    };
    reader.readAsDataURL(file);
  }, []);

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

      {/* Red Alert clearance modal */}
      {showRedAlert && carePlan && (
        <RedAlertModal
          flags={carePlan.liabilityFlags}
          redFlags={carePlan.predictedExam.redFlags}
          onCleared={() => { setRedAlertCleared(true); setShowRedAlert(false); }}
          onClose={() => setShowRedAlert(false)}
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

      {/* Print visit summary overlay */}
      {showPrintSummary && carePlan && (
        <PrintableVisitSummary
          carePlan={carePlan}
          patient={patient}
          appointment={appointment}
          soapNote={soapEdits}
          onClose={() => setShowPrintSummary(false)}
        />
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
            <button
              onClick={voice.toggle}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border text-xs transition-all",
                voice.listening
                  ? "border-green-500/60 bg-green-900/30 text-green-300 animate-pulse"
                  : voice.active
                    ? "border-teal-600/60 bg-teal-900/20 text-teal-400"
                    : "border-gray-700 bg-gray-800/50 text-gray-500 hover:text-gray-300 hover:border-gray-600"
              )}
              title={voice.active ? "Tap to turn off mic" : "Tap to activate voice commands"}
            >
              <span>{voice.listening ? "🎤" : voice.active ? "🎙" : "🎙"}</span>
              <span className="font-medium">
                {voice.lastCommand || (voice.listening ? "Listening…" : voice.active ? "Say a command" : "Hello PrognoSX")}
              </span>
            </button>
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
          {carePlan && !generating && (
            <button
              onClick={() => setShowPrintSummary(true)}
              className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white text-xs font-bold transition-colors"
              title="Print or save visit summary as PDF"
            >
              🖨 Print
            </button>
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
            { icon: "💊", label: `Rx queued → ${carePlan.prescriptions[0]?.pharmacy ?? "Pharmacy"}`, done: true, anchor: "section-rx" },
            { icon: "🧪", label: `${carePlan.diagnostics.items?.length ?? 0} labs ordered`, done: true, anchor: "section-diagnostics" },
            { icon: "📱", label: "Patient education ready", done: true, anchor: "section-education" },
            { icon: "📋", label: "SOAP complete", done: true, anchor: "section-soap" },
            { icon: "🔒", label: signed ? "Sent ✓" : "Awaiting signature", done: signed, anchor: null },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => item.anchor && document.getElementById(item.anchor)?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full border flex-shrink-0 whitespace-nowrap transition-all",
                item.done
                  ? "border-green-700/40 bg-green-900/20 text-green-400 hover:bg-green-900/40 hover:border-green-600/60"
                  : "border-gray-700 text-gray-500",
                item.anchor ? "cursor-pointer" : "cursor-default"
              )}
            >
              {item.icon} {item.label}
            </button>
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

          {/* Smart Document Attach */}
          <div className="pt-2 border-t border-gray-800">
            <input ref={attachInputRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) extractDocument(f); if (attachInputRef.current) attachInputRef.current.value = ""; }} />
            {attachState === "idle" && (
              <button onClick={() => attachInputRef.current?.click()}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-gray-700 hover:border-teal-600/60 hover:bg-teal-900/10 text-gray-500 hover:text-teal-400 text-xs transition-all">
                <span>📎</span><span>Attach Document / Lab Report</span>
              </button>
            )}
            {attachState === "loading" && (
              <div className="flex items-center gap-2 px-3 py-2 text-xs text-teal-400">
                <div className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin flex-shrink-0" />
                Extracting document with AI…
              </div>
            )}
            {attachState === "done" && attachResult && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-teal-400">{attachResult.documentType || "Document"} extracted</p>
                  <button onClick={() => { setAttachState("idle"); setAttachResult(null); }} className="text-xs text-gray-600 hover:text-white">✕</button>
                </div>
                {(attachResult.labs ?? []).length > 0 && (
                  <div className="space-y-0.5">
                    <p className="text-xs text-gray-500 font-semibold">Labs ({attachResult.labs!.length})</p>
                    {attachResult.labs!.slice(0, 6).map((l, i) => (
                      <div key={i} className="flex items-center justify-between px-2 py-1 bg-gray-800/60 rounded text-xs">
                        <span className="text-gray-300 truncate">{l.name}</span>
                        <span className={cn("font-mono ml-2 flex-shrink-0",
                          l.flag === "critical" ? "text-red-400 font-bold" :
                          l.flag === "high" || l.flag === "low" ? "text-amber-400" : "text-green-400"
                        )}>{l.value} {l.unit}</span>
                      </div>
                    ))}
                    {attachResult.labs!.length > 6 && <p className="text-xs text-gray-600 text-center">+{attachResult.labs!.length - 6} more values</p>}
                  </div>
                )}
                {(attachResult.medications ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 font-semibold mb-0.5">Medications</p>
                    {attachResult.medications!.map((m, i) => <p key={i} className="text-xs text-gray-300">• {m.name} {m.dose} {m.frequency}</p>)}
                  </div>
                )}
                {(attachResult.actionItems ?? []).length > 0 && (
                  <div className="space-y-0.5">
                    {attachResult.actionItems!.map((a, i) => <p key={i} className="text-xs text-amber-400">⚡ {a}</p>)}
                  </div>
                )}
                <button onClick={() => attachInputRef.current?.click()}
                  className="w-full text-xs py-1.5 rounded-lg border border-dashed border-gray-700 hover:border-gray-500 text-gray-600 hover:text-gray-400 transition-colors">
                  + Attach Another
                </button>
              </div>
            )}
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
              {/* RED ALERT CLEARANCE BUTTON */}
              {(carePlan.liabilityFlags.length > 0 || carePlan.predictedExam.redFlags.length > 0) && (
                <button
                  onClick={() => setShowRedAlert(true)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all text-left",
                    redAlertCleared
                      ? "border-green-700/40 bg-green-900/10"
                      : "border-red-600/50 bg-red-950/30 hover:border-red-500/70 hover:bg-red-950/50 animate-pulse"
                  )}
                >
                  <span className="text-2xl flex-shrink-0">{redAlertCleared ? "✅" : "🚨"}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm font-bold", redAlertCleared ? "text-green-400" : "text-red-300")}>
                      {redAlertCleared ? "Red Alert Cleared" : "Red Alert — Safety Check Required"}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {redAlertCleared
                        ? `Provider confirmed absence of ${carePlan.liabilityFlags.length + carePlan.predictedExam.redFlags.length} critical findings`
                        : `${carePlan.liabilityFlags.length + carePlan.predictedExam.redFlags.length} critical symptoms must be ruled out before signing`}
                    </p>
                  </div>
                  <span className={cn("text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0", redAlertCleared ? "bg-green-900/40 text-green-400" : "bg-red-900/40 text-red-400")}>
                    {redAlertCleared ? "CLEARED" : "TAP TO VERIFY"}
                  </span>
                </button>
              )}

              {/* LEGAL SHIELD */}
              <LegalShieldSection chiefComplaint={patient.primaryComplaint ?? ""} />

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
                    <button
                      onClick={() => setShowRedAlert(true)}
                      className={cn(
                        "w-full mt-2 flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all",
                        redAlertCleared ? "border-green-700/30 bg-green-900/10" : "border-red-700/30 bg-red-950/20 hover:border-red-600/50"
                      )}
                    >
                      <span>{redAlertCleared ? "✅" : "🚨"}</span>
                      <span className={cn("text-xs font-semibold", redAlertCleared ? "text-green-400" : "text-red-400")}>
                        {redAlertCleared ? "Red flag symptoms cleared" : `${carePlan.predictedExam.redFlags.length} red flag symptom${carePlan.predictedExam.redFlags.length > 1 ? "s" : ""} — tap to verify`}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* ASSESSMENT */}
              <SectionCard title="Assessment" confidence={carePlan.assessment.confidence} source={carePlan.assessment.source} status={statuses["assessment"] ?? "accepted"} onAccept={() => accept("assessment")} onReject={() => reject("assessment")}
                items={[carePlan.assessment.primary, ...carePlan.assessment.secondaries, ...carePlan.assessment.ruleOut.map(r => `Rule out: ${r}`)].filter(Boolean)}
              />

              {/* DDX — right after assessment, with legal risk meter */}
              {carePlan.ddx.length > 0 && (() => {
                const sel = carePlan.ddx[selectedDDX ?? 0];
                const riskScore = sel ? (sel.legalRisk === "low" ? 12 : sel.legalRisk === "medium" ? 48 : 85) : 0;
                const riskColor = riskScore < 25 ? "bg-green-500" : riskScore < 60 ? "bg-amber-500" : "bg-red-500";
                const riskLabel = riskScore < 25 ? "Low Liability" : riskScore < 60 ? "Moderate Liability" : "High Liability";
                const riskText = sel?.legalRisk === "low"
                  ? "Standard of care met. Diagnosis aligns with chief complaint and evidence base."
                  : sel?.legalRisk === "medium"
                  ? "Document your reasoning. Failure to work up this diagnosis could result in a missed diagnosis claim."
                  : "High medicolegal exposure. If this diagnosis is missed, liability risk is significant. Document rule-out reasoning explicitly.";
                return (
                  <div className="rounded-2xl border border-amber-700/50 overflow-hidden">
                    <div className="px-4 py-3 bg-amber-900/20 border-b border-amber-700/30 flex items-center justify-between">
                      <span className="font-bold text-amber-300 text-sm">Differential Diagnosis (DDX)</span>
                      <span className="text-xs text-amber-600">Tap to select alternative if needed</span>
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
                                    {d.legalRisk} risk
                                  </span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{d.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                    {/* Legal risk meter for selected diagnosis */}
                    {sel && (
                      <div className="px-4 py-3 bg-gray-900/50 border-t border-gray-800/60">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs text-gray-500 font-medium">Legal Risk — Selected Diagnosis</span>
                          <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full",
                            riskScore < 25 ? "bg-green-900/40 text-green-400" :
                            riskScore < 60 ? "bg-amber-900/40 text-amber-400" : "bg-red-900/40 text-red-400"
                          )}>{riskLabel} · {riskScore}%</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
                          <div className={cn("h-full rounded-full transition-all duration-500", riskColor)} style={{ width: `${riskScore}%` }} />
                        </div>
                        <p className="text-xs text-gray-500 leading-snug">{riskText}</p>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* DIAGNOSTICS */}
              <div id="section-diagnostics"><SectionCard title="Diagnostics & Labs" confidence={carePlan.diagnostics.confidence} source={carePlan.diagnostics.source} status={statuses["diagnostics"] ?? "accepted"} onAccept={() => accept("diagnostics")} onReject={() => reject("diagnostics")} items={carePlan.diagnostics.items} /></div>

              {/* TREATMENT PLAN */}
              <SectionCard title="Treatment Plan" confidence={carePlan.treatmentPlan.confidence} source={carePlan.treatmentPlan.source} status={statuses["treatmentPlan"] ?? "accepted"} onAccept={() => accept("treatmentPlan")} onReject={() => reject("treatmentPlan")} items={carePlan.treatmentPlan.items} />

              {/* PATIENT EDUCATION */}
              <div id="section-education"><SectionCard title="Patient Education" confidence={carePlan.patientEducation.confidence} source={carePlan.patientEducation.source} status={statuses["patientEducation"] ?? "accepted"} onAccept={() => accept("patientEducation")} onReject={() => reject("patientEducation")} items={carePlan.patientEducation.items} /></div>

              {/* FOLLOW-UP */}
              <SectionCard title="Follow-up & Red Flags" confidence={carePlan.followUp.confidence} source={carePlan.followUp.source} status={statuses["followUp"] ?? "accepted"} onAccept={() => accept("followUp")} onReject={() => reject("followUp")} items={carePlan.followUp.items} />

              {/* PRESCRIPTION ORDERS */}
              {carePlan.prescriptions.length > 0 && (
                <div id="section-rx" className="rounded-2xl border border-gray-700/40 overflow-hidden">
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
              <div id="section-soap" className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
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
