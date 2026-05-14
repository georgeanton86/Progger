"use client";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type CarePlanOption = {
  confidence: number;
  label: string;
  icd10?: string;
  action: string;
  disposition: "outpatient" | "ED" | "admit" | "observation";
  followUp: string;
  referral: string | null;
};

type RadiologyFinding = {
  system: string;
  finding: string;
  abnormal: boolean;
  severity: "normal" | "mild" | "moderate" | "severe" | "critical";
  differentials?: CarePlanOption[];
};

type ICD10Entry = { code: string; description: string };

type RadiologyReport = {
  detectedModality: string;
  quality: string;
  technique?: string;
  findings: RadiologyFinding[];
  impression: string;
  criticalFindings: string[];
  urgency: "routine" | "urgent" | "emergent";
  icd10Codes: ICD10Entry[];
  recommendations: string[];
  nextImaging?: string | null;
  radiologistReviewRequired: boolean;
  confidence: number;
  limitations?: string;
  correlateWith?: string[];
};

type DocumentExtraction = {
  documentType: string;
  facility?: string;
  dateOnDocument?: string;
  labs?: { name: string; value: string; unit: string; refRange: string; flag: string }[];
  medications?: { name: string; dose: string; frequency: string; duration?: string }[];
  diagnoses?: { code?: string; description: string }[];
  allergies?: { substance: string; reaction: string }[];
  vitals?: Record<string, string>;
  insuranceInfo?: Record<string, string>;
  notes?: string;
  actionItems?: string[];
};

// ── Image window/level presets ────────────────────────────────────────────────

const PRESETS: Record<string, { brightness: number; contrast: number; inverted: boolean }> = {
  "Standard":    { brightness: 100, contrast: 100, inverted: false },
  "Lung Window": { brightness: 72,  contrast: 240, inverted: false },
  "Bone Window": { brightness: 145, contrast: 165, inverted: false },
  "Soft Tissue": { brightness: 118, contrast: 128, inverted: false },
  "Film (−)":    { brightness: 100, contrast: 110, inverted: true  },
};

const MODALITIES = [
  "X-Ray — Chest (PA/Lateral)",
  "X-Ray — Abdomen",
  "X-Ray — Extremity / MSK",
  "X-Ray — Spine",
  "X-Ray — Pelvis / Hip",
  "CT — Head without contrast",
  "CT — Chest",
  "CT — Abdomen / Pelvis",
  "CT — Angiography",
  "MRI — Brain",
  "MRI — Spine",
  "MRI — MSK",
  "Ultrasound — Abdomen",
  "Ultrasound — Pelvis",
  "Ultrasound — Soft Tissue",
  "Ultrasound — Scrotal / Vascular",
  "Echocardiogram",
  "Nuclear Medicine / PET",
  "Other / Auto-detect",
];

// ── Utilities ─────────────────────────────────────────────────────────────────

function parseJSON<T>(text: string): T | null {
  const start = text.indexOf("{");
  if (start === -1) return null;
  const raw = text.slice(start);
  try { return JSON.parse(raw) as T; } catch { /* try truncation repair */ }
  const last = raw.lastIndexOf("}");
  if (last > 0) {
    try { return JSON.parse(raw.slice(0, last + 1)) as T; } catch { /* ok */ }
  }
  return null;
}

function dispositionColor(d: CarePlanOption["disposition"]) {
  if (d === "admit")       return "bg-red-900/40 border-red-700/50 text-red-300";
  if (d === "ED")          return "bg-orange-900/40 border-orange-700/50 text-orange-300";
  if (d === "observation") return "bg-amber-900/40 border-amber-700/50 text-amber-300";
  return "bg-green-900/30 border-green-700/40 text-green-300";
}

function copyCarePlan(opt: CarePlanOption, finding: RadiologyFinding) {
  const text = [
    `FINDING: ${finding.system} — ${finding.finding}`,
    `DIFFERENTIAL: ${opt.label}${opt.icd10 ? ` (${opt.icd10})` : ""} — ${opt.confidence}% confidence`,
    ``,
    `TREATMENT: ${opt.action}`,
    `DISPOSITION: ${opt.disposition.toUpperCase()}`,
    `FOLLOW-UP: ${opt.followUp}`,
    opt.referral ? `REFERRAL: ${opt.referral}` : "",
    ``,
    `— rAIdiology™ · PrognoSX · NOT interpreted by a board-certified radiologist. Clinical decision support only.`,
  ].filter(Boolean).join("\n");
  navigator.clipboard?.writeText(text).catch(() => {});
}

// ── Sub-components ────────────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: "routine" | "urgent" | "emergent" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-widest",
      urgency === "emergent" ? "bg-red-600 text-white animate-pulse" :
      urgency === "urgent"   ? "bg-amber-500 text-black" :
      "bg-green-700/60 border border-green-600/60 text-green-200"
    )}>
      {urgency === "emergent" ? "🚨 EMERGENT" : urgency === "urgent" ? "⚡ URGENT" : "✓ Routine"}
    </span>
  );
}

function ConfidenceMeter({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-amber-500" : "bg-gray-500";
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className="flex items-center gap-2">
      <div className={cn("flex-1 bg-gray-800 rounded-full overflow-hidden", h)}>
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${value}%` }} />
      </div>
      <span className={cn("font-mono font-bold flex-shrink-0", size === "sm" ? "text-xs w-8" : "text-xs w-10 text-right",
        value >= 80 ? "text-green-400" : value >= 60 ? "text-amber-400" : "text-gray-500"
      )}>{value}%</span>
    </div>
  );
}

function SeverityDot({ severity }: { severity: RadiologyFinding["severity"] }) {
  const color =
    severity === "critical" ? "bg-red-500 animate-pulse" :
    severity === "severe"   ? "bg-red-400" :
    severity === "moderate" ? "bg-amber-400" :
    severity === "mild"     ? "bg-amber-500/60" :
    "bg-green-500";
  return <div className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", color)} />;
}

function DisclaimerBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="mx-4 mt-3 p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/40 flex gap-3 flex-shrink-0">
      <span className="text-amber-500 text-lg flex-shrink-0 mt-0.5">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-extrabold text-amber-400 mb-1">rAIdiology™ — Clinical Decision Support Only</p>
        <p className="text-xs text-amber-500/80 leading-relaxed">
          rAIdiology™ is <strong className="text-amber-400">NOT a board-certified radiologist</strong> and does not constitute a formal radiology report.
          All AI-generated findings are preliminary screening aids only. Images must be reviewed and interpreted by a licensed radiologist or
          qualified physician before any clinical action. Do not rely solely on this tool for diagnosis, treatment, or discharge decisions.
          Findings may be incomplete, inaccurate, or miss life-threatening pathology.
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className="text-amber-700 hover:text-amber-400 text-lg flex-shrink-0 leading-none" title="Dismiss">✕</button>
    </div>
  );
}

// Expandable care plan card per finding
function FindingCard({ finding }: { finding: RadiologyFinding }) {
  const [expanded, setExpanded] = useState(false);
  const [openOption, setOpenOption] = useState<number | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const hasDifferentials = (finding.differentials?.length ?? 0) > 0;

  const handleCopy = (i: number, opt: CarePlanOption) => {
    copyCarePlan(opt, finding);
    setCopied(i);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className={cn(
      "rounded-xl border overflow-hidden",
      finding.severity === "critical" ? "border-red-700/60 bg-red-950/30" :
      finding.severity === "severe"   ? "border-red-700/30 bg-red-950/10" :
      finding.severity === "moderate" ? "border-amber-700/30 bg-amber-950/10" :
      finding.severity === "mild"     ? "border-amber-700/20 bg-amber-950/5" :
      "border-gray-800/80 bg-gray-900/20"
    )}>
      {/* Finding header */}
      <button
        className="w-full flex items-start gap-3 p-2.5 text-left"
        onClick={() => hasDifferentials && setExpanded(e => !e)}
        disabled={!hasDifferentials}
      >
        <SeverityDot severity={finding.severity} />
        <div className="flex-1 min-w-0">
          <span className="text-xs font-extrabold text-gray-400 uppercase mr-1.5">{finding.system}:</span>
          <span className="text-sm text-gray-200">{finding.finding}</span>
        </div>
        {hasDifferentials && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-blue-400 font-semibold">{finding.differentials!.length} Dx</span>
            <span className={cn("text-gray-500 text-xs transition-transform duration-200", expanded && "rotate-180")}>▾</span>
          </div>
        )}
      </button>

      {/* Differential care plan options */}
      {expanded && hasDifferentials && (
        <div className="border-t border-gray-800/60 divide-y divide-gray-800/40">
          {finding.differentials!.map((opt, i) => (
            <div key={i} className="bg-gray-950/60">
              {/* Option header — tappable */}
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-800/30 transition-colors"
                onClick={() => setOpenOption(openOption === i ? null : i)}
              >
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-sm font-bold text-white leading-tight">{opt.label}</p>
                  <ConfidenceMeter value={opt.confidence} size="sm" />
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {opt.icd10 && <span className="font-mono text-xs text-teal-500">{opt.icd10}</span>}
                  <span className={cn("text-gray-500 text-xs transition-transform duration-200", openOption === i && "rotate-180")}>▾</span>
                </div>
              </button>

              {/* Expanded care plan */}
              {openOption === i && (
                <div className="px-3 pb-3 space-y-2.5">
                  {/* Disposition badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("text-xs font-extrabold uppercase px-2.5 py-1 rounded-full border", dispositionColor(opt.disposition))}>
                      {opt.disposition === "ED" ? "🚑 Send to ED" :
                       opt.disposition === "admit" ? "🏥 Admit" :
                       opt.disposition === "observation" ? "👁 Observation" :
                       "🏠 Outpatient"}
                    </span>
                    {opt.referral && (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-300 font-semibold">
                        Refer: {opt.referral}
                      </span>
                    )}
                  </div>

                  {/* Treatment */}
                  <div className="p-2.5 rounded-lg bg-blue-950/25 border border-blue-700/30">
                    <p className="text-xs font-extrabold text-blue-400 uppercase tracking-wide mb-1">Treatment</p>
                    <p className="text-sm text-gray-200 leading-relaxed">{opt.action}</p>
                  </div>

                  {/* Follow-up */}
                  <div className="p-2.5 rounded-lg bg-gray-800/50 border border-gray-700/40">
                    <p className="text-xs font-extrabold text-gray-400 uppercase tracking-wide mb-1">Follow-up</p>
                    <p className="text-sm text-gray-300 leading-relaxed">{opt.followUp}</p>
                  </div>

                  {/* Copy plan button */}
                  <button
                    onClick={() => handleCopy(i, opt)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors"
                  >
                    {copied === i ? "✓ Copied!" : "📋 Copy Plan"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function RadiologyTab() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef  = useRef<HTMLInputElement>(null);

  // Image state
  const [imageUrl, setImageUrl]           = useState<string | null>(null);
  const [imageBase64, setImageBase64]     = useState<string | null>(null);
  const [mediaType, setMediaType]         = useState("image/jpeg");
  const [dragging, setDragging]           = useState(false);
  const [imageFileName, setImageFileName] = useState("");

  // Enhancement controls
  const [brightness, setBrightness]     = useState(100);
  const [contrast, setContrast]         = useState(100);
  const [inverted, setInverted]         = useState(false);
  const [zoom, setZoom]                 = useState(100);
  const [activePreset, setActivePreset] = useState("Standard");

  // Clinical context
  const [modality, setModality]                   = useState(MODALITIES[0]);
  const [patientAge, setPatientAge]               = useState("");
  const [patientSex, setPatientSex]               = useState("Unknown");
  const [clinicalQuestion, setClinicalQuestion]   = useState("");
  const [clinicalContext, setClinicalContext]     = useState("");

  // AI state
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport]       = useState<RadiologyReport | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // Document attachment state
  const [docLoading, setDocLoading] = useState(false);
  const [docResult, setDocResult]   = useState<DocumentExtraction | null>(null);
  const [docError, setDocError]     = useState<string | null>(null);

  // ── File loading ────────────────────────────────────────────────────────────

  const loadFile = useCallback((file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setError("Image too large — max 5MB. Try compressing or screenshotting the image.");
      return;
    }
    setReport(null);
    setError(null);
    setImageFileName(file.name);
    setMediaType(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      setImageUrl(dataUrl);
      setImageBase64(dataUrl.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file?.type.startsWith("image/")) loadFile(file);
  }, [loadFile]);

  const applyPreset = (name: string) => {
    const p = PRESETS[name];
    if (!p) return;
    setActivePreset(name);
    setBrightness(p.brightness);
    setContrast(p.contrast);
    setInverted(p.inverted);
  };

  // ── Radiology analysis ──────────────────────────────────────────────────────

  const analyze = async () => {
    if (!imageBase64) return;
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch("/api/radiology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageBase64, mediaType, mode: "radiology", modality, patientAge, patientSex, clinicalQuestion, clinicalContext }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({ error: "API error" }));
        throw new Error(d.error || "Analysis failed");
      }
      const d = await res.json();
      const parsed = parseJSON<RadiologyReport>(d.reply);
      if (!parsed) throw new Error("Could not parse AI response — please retry");
      setReport(parsed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Document extraction ─────────────────────────────────────────────────────

  const extractDocument = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setDocError("File too large — max 5MB"); return; }
    setDocLoading(true);
    setDocError(null);
    setDocResult(null);
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
        const parsed = parseJSON<DocumentExtraction>(d.reply);
        if (!parsed) throw new Error("Could not parse extraction");
        setDocResult(parsed);
      } catch (err) {
        setDocError(err instanceof Error ? err.message : "Extraction failed");
      } finally {
        setDocLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // ── Copy full report ────────────────────────────────────────────────────────

  const copyReport = () => {
    if (!report) return;
    const lines = [
      "rAIdiology™ PRELIMINARY READ — PrognoSX",
      "⚠ NOT interpreted by a board-certified radiologist. Clinical decision support only.",
      "",
      `Modality: ${report.detectedModality}`,
      `Quality: ${report.quality}`,
      report.technique ? `Technique: ${report.technique}` : "",
      `Urgency: ${report.urgency.toUpperCase()} | AI Confidence: ${report.confidence}%`,
      "",
      "IMPRESSION:",
      report.impression,
      "",
      ...(report.criticalFindings.length > 0 ? ["CRITICAL FINDINGS:", ...report.criticalFindings, ""] : []),
      "SYSTEMATIC FINDINGS:",
      ...report.findings.map(f => {
        const line = `${f.system}: ${f.finding}`;
        if (!f.differentials?.length) return line;
        const dxLines = f.differentials.map(d => `  → ${d.confidence}% ${d.label}${d.icd10 ? ` (${d.icd10})` : ""} | ${d.action}`);
        return [line, ...dxLines].join("\n");
      }),
      "",
      "RECOMMENDATIONS:",
      ...report.recommendations,
      "",
      report.limitations || "Requires radiologist verification before clinical decisions.",
    ].filter(l => l !== undefined).join("\n");
    navigator.clipboard?.writeText(lines).catch(() => {});
  };

  const flagColor = (flag: string) =>
    flag === "critical" ? "text-red-400 font-extrabold" :
    flag === "high" || flag === "low" ? "text-amber-400 font-bold" : "text-green-400";

  const clearStudy = () => {
    setImageUrl(null);
    setImageBase64(null);
    setReport(null);
    setError(null);
    setBrightness(100);
    setContrast(100);
    setInverted(false);
    setZoom(100);
    setActivePreset("Standard");
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            🩻 r<span className="text-blue-400">AI</span>diology™
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/30">BETA</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">AI-assisted preliminary reads · Confidence-graded differentials · Always verify with radiologist</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => docInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 bg-gray-800/50 text-gray-400 hover:text-white hover:border-gray-500 text-xs font-medium transition-colors"
            title="Upload lab report, discharge summary, or insurance card to extract data"
          >
            📎 Extract Document
          </button>
          <input ref={docInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) extractDocument(f); e.target.value = ""; }} />
          {imageUrl && (
            <button onClick={clearStudy}
              className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 transition-colors">
              New Study
            </button>
          )}
        </div>
      </div>

      {/* ── Document extraction results panel ── */}
      {(docLoading || docResult || docError) && (
        <div className="border-b border-gray-800 bg-gray-900/60 px-5 py-3 flex-shrink-0">
          {docLoading && (
            <div className="flex items-center gap-2 text-sm text-teal-400">
              <div className="w-3 h-3 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
              Extracting document with AI…
            </div>
          )}
          {docError && <p className="text-red-400 text-sm">⚠ {docError}</p>}
          {docResult && !docLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-teal-400">
                  {docResult.documentType || "Document"} extracted
                  {docResult.facility ? ` — ${docResult.facility}` : ""}
                  {docResult.dateOnDocument ? ` · ${docResult.dateOnDocument}` : ""}
                </p>
                <button onClick={() => setDocResult(null)} className="text-xs text-gray-600 hover:text-white">✕ Dismiss</button>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {(docResult.labs ?? []).length > 0 && (
                  <div className="flex-1 min-w-64">
                    <p className="text-gray-500 font-semibold mb-1">Lab Results ({docResult.labs!.length})</p>
                    <div className="grid grid-cols-2 gap-1">
                      {docResult.labs!.slice(0, 8).map((l, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-800 rounded px-2 py-1 gap-2">
                          <span className="text-gray-300 truncate">{l.name}</span>
                          <span className={cn("flex-shrink-0 font-mono", flagColor(l.flag))}>{l.value} {l.unit}</span>
                        </div>
                      ))}
                      {docResult.labs!.length > 8 && (
                        <p className="text-gray-600 col-span-2 text-center py-1">+{docResult.labs!.length - 8} more</p>
                      )}
                    </div>
                  </div>
                )}
                {(docResult.medications ?? []).length > 0 && (
                  <div className="flex-1 min-w-48">
                    <p className="text-gray-500 font-semibold mb-1">Medications ({docResult.medications!.length})</p>
                    <div className="space-y-0.5">
                      {docResult.medications!.map((m, i) => (
                        <p key={i} className="text-gray-300 bg-gray-800 rounded px-2 py-1">{m.name} {m.dose} {m.frequency}</p>
                      ))}
                    </div>
                  </div>
                )}
                {(docResult.diagnoses ?? []).length > 0 && (
                  <div className="flex-1 min-w-40">
                    <p className="text-gray-500 font-semibold mb-1">Diagnoses</p>
                    <div className="space-y-0.5">
                      {docResult.diagnoses!.map((dx, i) => (
                        <p key={i} className="text-gray-300 bg-gray-800 rounded px-2 py-1">
                          {dx.code && <span className="font-mono text-teal-400 mr-1.5">{dx.code}</span>}
                          {dx.description}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                {Object.keys(docResult.insuranceInfo ?? {}).length > 0 && (
                  <div className="flex-1 min-w-40">
                    <p className="text-gray-500 font-semibold mb-1">Insurance</p>
                    <div className="space-y-0.5">
                      {Object.entries(docResult.insuranceInfo!).map(([k, v]) => (
                        <p key={k} className="text-gray-300 bg-gray-800 rounded px-2 py-1">
                          <span className="text-gray-500">{k}: </span>{v}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {(docResult.actionItems ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {docResult.actionItems!.map((a, i) => (
                    <span key={i} className="text-xs px-2.5 py-1 bg-amber-900/20 border border-amber-700/30 text-amber-300 rounded-full">{a}</span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">
        {!imageUrl ? (
          // ── Upload zone ──────────────────────────────────────────────────────
          <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-6 gap-5">
            <div
              onDragOver={e => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full max-w-2xl border-2 border-dashed rounded-2xl p-10 flex flex-col items-center gap-5 cursor-pointer transition-all",
                dragging ? "border-blue-400 bg-blue-900/10 scale-[1.01]" :
                "border-gray-700 bg-gray-900/20 hover:border-blue-600/50 hover:bg-gray-900/40"
              )}
            >
              <div className="text-7xl select-none">🩻</div>
              <div className="text-center">
                <p className="text-white font-extrabold text-2xl">Drop imaging here</p>
                <p className="text-gray-400 text-base mt-1">or click to upload</p>
                <p className="text-gray-600 text-sm mt-2">JPEG · PNG · WebP · max 5MB · X-rays, CT, MRI, ultrasound, physical films</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) loadFile(f); }} />
            </div>

            {error && (
              <div className="w-full max-w-2xl p-3 rounded-xl bg-red-900/20 border border-red-700/40">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {/* Capability grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full max-w-2xl">
              {[
                { icon: "🫁", title: "Chest X-Ray", desc: "ABCDE systematic · pneumonia · pneumothorax · effusion · cardiomegaly" },
                { icon: "🦴", title: "MSK & Fractures", desc: "Ottawa rules · alignment · cortical integrity · soft tissue · growth plates" },
                { icon: "🧠", title: "CT Head/Spine", desc: "Hemorrhage · mass · ischemia · midline shift · cord compression" },
                { icon: "🔊", title: "Ultrasound / Echo", desc: "DVT · AAA · hepatobiliary · EF · wall motion · valves" },
              ].map(c => (
                <div key={c.title} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                  <div className="text-3xl mb-2">{c.icon}</div>
                  <p className="text-xs font-extrabold text-white mb-1">{c.title}</p>
                  <p className="text-xs text-gray-600 leading-snug">{c.desc}</p>
                </div>
              ))}
            </div>

            {/* Disclaimer box */}
            <div className="w-full max-w-2xl p-4 rounded-xl bg-amber-950/20 border border-amber-700/30 space-y-1.5">
              <p className="text-xs font-extrabold text-amber-400">⚠ rAIdiology™ Legal Disclaimer</p>
              <p className="text-xs text-amber-500/80 leading-relaxed">
                rAIdiology™ is an AI clinical decision support tool and is <strong className="text-amber-400">NOT a substitute for formal radiology interpretation</strong> by a board-certified radiologist.
                Results are preliminary screening aids only. All findings must be independently verified by a licensed physician or radiologist before any clinical action, treatment, or discharge decision.
                This tool may miss critical findings. Use with clinical judgment and professional guidance only.
              </p>
            </div>
          </div>
        ) : (
          // ── Studio view: image + report ───────────────────────────────────────
          <div className="flex flex-1 overflow-hidden flex-col lg:flex-row">

            {/* ── Left: Image panel ── */}
            <div className="w-full lg:w-[45%] border-b lg:border-b-0 lg:border-r border-gray-800 flex flex-col bg-black overflow-hidden">
              {/* Image display */}
              <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden min-h-56 cursor-crosshair select-none">
                <img
                  src={imageUrl}
                  alt="Medical imaging"
                  draggable={false}
                  style={{
                    filter: `brightness(${brightness}%) contrast(${contrast}%)${inverted ? " invert(100%)" : ""}`,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center",
                    maxWidth: "100%",
                    maxHeight: "100%",
                    objectFit: "contain",
                    transition: "filter 0.15s, transform 0.15s",
                  }}
                />
                {report?.urgency && report.urgency !== "routine" && (
                  <div className="absolute top-3 right-3 pointer-events-none">
                    <UrgencyBadge urgency={report.urgency} />
                  </div>
                )}
                <div className="absolute bottom-2 left-2 pointer-events-none">
                  <span className="text-xs text-gray-600 bg-black/60 px-2 py-0.5 rounded">{imageFileName}</span>
                </div>
              </div>

              {/* Enhancement controls */}
              <div className="bg-gray-950 border-t border-gray-800 p-3 flex-shrink-0 space-y-2.5">
                <div className="flex gap-1 flex-wrap">
                  {Object.keys(PRESETS).map(p => (
                    <button key={p} onClick={() => applyPreset(p)} className={cn(
                      "text-xs px-2.5 py-1 rounded-lg border transition-colors",
                      activePreset === p ? "bg-blue-700/80 border-blue-600 text-white" : "border-gray-700 text-gray-500 hover:border-gray-500 hover:text-white"
                    )}>{p}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Brightness <span className="text-gray-400">{brightness}%</span></p>
                    <input type="range" min="10" max="350" value={brightness} onChange={e => { setBrightness(Number(e.target.value)); setActivePreset(""); }} className="w-full h-1.5 accent-blue-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Contrast <span className="text-gray-400">{contrast}%</span></p>
                    <input type="range" min="10" max="450" value={contrast} onChange={e => { setContrast(Number(e.target.value)); setActivePreset(""); }} className="w-full h-1.5 accent-blue-500" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-xs text-gray-600 mb-1">Zoom <span className="text-gray-400">{zoom}%</span></p>
                    <input type="range" min="25" max="500" value={zoom} onChange={e => setZoom(Number(e.target.value))} className="w-full h-1.5 accent-teal-500" />
                  </div>
                  <button onClick={() => { applyPreset("Standard"); setZoom(100); }}
                    className="text-xs text-gray-600 hover:text-white px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-gray-500 flex-shrink-0 transition-colors">
                    Reset
                  </button>
                </div>
              </div>
            </div>

            {/* ── Right: Context + Report ── */}
            <div className="w-full lg:flex-1 flex flex-col overflow-hidden">

              {!report && !analyzing ? (
                // Clinical context form
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <h3 className="text-sm font-bold text-white">Clinical Context</h3>

                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">Imaging Modality</label>
                    <select value={modality} onChange={e => setModality(e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30">
                      {MODALITIES.map(m => <option key={m}>{m}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 font-semibold block mb-1">Patient Age</label>
                      <input type="text" value={patientAge} onChange={e => setPatientAge(e.target.value)} placeholder="e.g. 52"
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-semibold block mb-1">Sex</label>
                      <select value={patientSex} onChange={e => setPatientSex(e.target.value)}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500">
                        {["Unknown", "Male", "Female", "Other"].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">
                      Clinical Question <span className="text-gray-600 font-normal">— what are you looking for?</span>
                    </label>
                    <input type="text" value={clinicalQuestion} onChange={e => setClinicalQuestion(e.target.value)}
                      placeholder="e.g. R/O pneumonia · Evaluate fracture · Rule out PE · Mass workup"
                      className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500" />
                  </div>

                  <div>
                    <label className="text-xs text-gray-400 font-semibold block mb-1">
                      Clinical Context <span className="text-gray-600 font-normal">— optional but improves accuracy</span>
                    </label>
                    <textarea value={clinicalContext} onChange={e => setClinicalContext(e.target.value)}
                      placeholder="e.g. Fever ×3 days, productive cough, SpO2 94%. PMH HTN, DM2. Prior CXR 2023 normal."
                      rows={3} className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none" />
                  </div>

                  {error && (
                    <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/40 flex items-start gap-2">
                      <span className="text-red-400 flex-shrink-0">⚠</span>
                      <p className="text-red-300 text-sm">{error}</p>
                    </div>
                  )}

                  <button onClick={analyze} disabled={!imageBase64}
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold text-sm transition-colors flex items-center justify-center gap-2.5 shadow-lg shadow-blue-900/30">
                    🩻 Analyze with r<span className="text-blue-200">AI</span>diology™
                  </button>

                  <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-700/20">
                    <p className="text-xs text-amber-500/70 leading-relaxed">
                      ⚠ <strong className="text-amber-400">rAIdiology™ Disclaimer:</strong> AI reads are a clinical decision support tool only. NOT a formal radiology report. All findings require verification by a board-certified radiologist or licensed physician before clinical action.
                    </p>
                  </div>
                </div>

              ) : analyzing ? (
                // Loading state
                <div className="flex-1 flex flex-col items-center justify-center gap-5 p-8">
                  <div className="relative w-20 h-20">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-900/40 border-t-blue-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-blue-900/20 border-b-blue-500/60 animate-spin" style={{ animationDirection: "reverse", animationDuration: "1.8s" }} />
                    <div className="absolute inset-0 flex items-center justify-center text-3xl">🩻</div>
                  </div>
                  <div className="text-center">
                    <p className="text-white font-extrabold text-lg">r<span className="text-blue-400">AI</span>diology™ analyzing…</p>
                    <p className="text-gray-500 text-sm mt-1.5">Systematic review · Differential generation · Care plan building</p>
                    <p className="text-gray-600 text-xs mt-1">ABCDE · Evidence-based criteria · Critical finding detection</p>
                  </div>
                </div>

              ) : report ? (
                // ── Report display ──────────────────────────────────────────────
                <div className="flex-1 overflow-y-auto">
                  <DisclaimerBanner />

                  <div className="p-4 space-y-4">

                    {/* Report header */}
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <h3 className="font-extrabold text-white text-base leading-tight">{report.detectedModality}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">{report.quality}</p>
                        {report.technique && <p className="text-xs text-gray-600 mt-0.5">{report.technique}</p>}
                      </div>
                      <UrgencyBadge urgency={report.urgency} />
                    </div>

                    {/* AI Confidence */}
                    <div className="p-3 bg-gray-900/60 rounded-xl border border-gray-800">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-bold text-gray-400">Overall AI Confidence</span>
                        <span className="text-xs text-gray-500">{report.radiologistReviewRequired ? "⚠ Radiologist review required" : "Preliminary read"}</span>
                      </div>
                      <ConfidenceMeter value={report.confidence} />
                    </div>

                    {/* 🚨 Critical findings */}
                    {report.criticalFindings.length > 0 && (
                      <div className="p-4 rounded-xl bg-red-950/50 border-2 border-red-600/70">
                        <p className="text-sm font-extrabold text-red-300 mb-2">🚨 CRITICAL FINDINGS — Immediate action required</p>
                        {report.criticalFindings.map((f, i) => (
                          <p key={i} className="text-sm text-red-200 font-semibold flex items-start gap-2">
                            <span className="text-red-500 mt-0.5 flex-shrink-0">▶</span>{f}
                          </p>
                        ))}
                      </div>
                    )}

                    {/* Impression */}
                    <div className="p-4 rounded-xl bg-blue-950/25 border border-blue-700/40">
                      <p className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mb-2">Impression</p>
                      <p className="text-sm text-gray-100 leading-relaxed whitespace-pre-line">{report.impression}</p>
                    </div>

                    {/* Systematic findings with tappable care plans */}
                    <div>
                      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">
                        Systematic Findings
                        {report.findings.some(f => f.differentials?.length) && (
                          <span className="ml-2 normal-case font-normal text-gray-600">— tap abnormal findings to see care plans</span>
                        )}
                      </p>
                      <div className="space-y-1.5">
                        {report.findings.map((f, i) => (
                          <FindingCard key={i} finding={f} />
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    {report.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">Recommendations</p>
                        <div className="space-y-1.5">
                          {report.recommendations.map((r, i) => (
                            <p key={i} className="text-sm text-gray-300 flex items-start gap-2">
                              <span className="text-teal-500 mt-0.5 flex-shrink-0">→</span>{r}
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Next imaging */}
                    {report.nextImaging && (
                      <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-700/30">
                        <p className="text-xs font-bold text-purple-400 mb-1">Next Imaging Step</p>
                        <p className="text-sm text-gray-300">{report.nextImaging}</p>
                      </div>
                    )}

                    {/* Correlate with */}
                    {(report.correlateWith?.length ?? 0) > 0 && (
                      <div className="p-3 bg-gray-900 rounded-xl border border-gray-800">
                        <p className="text-xs font-bold text-gray-500 mb-1.5">Correlate With:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {report.correlateWith!.map((c, i) => (
                            <span key={i} className="text-xs px-2.5 py-1 bg-gray-800 border border-gray-700 rounded-full text-gray-300">{c}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* ICD-10 codes */}
                    {report.icd10Codes.length > 0 && (
                      <div>
                        <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-2">ICD-10 Codes</p>
                        <div className="flex flex-wrap gap-2">
                          {report.icd10Codes.map((c, i) => (
                            <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 bg-gray-800 border border-gray-700 rounded-lg">
                              <span className="font-mono text-xs font-bold text-teal-400">{c.code}</span>
                              <span className="text-xs text-gray-400">{c.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Limitations / disclaimer */}
                    <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-700/20">
                      <p className="text-xs text-amber-500/70 leading-relaxed">
                        ⚠ <strong className="text-amber-400">rAIdiology™</strong> — {report.limitations || "AI-assisted preliminary read. NOT a formal radiology report. Requires independent radiologist or physician verification before any clinical action."}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 pb-6">
                      <button onClick={copyReport}
                        className="flex-1 py-3 rounded-xl border border-gray-600 text-gray-300 text-sm font-semibold hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5">
                        📋 Copy Report
                      </button>
                      <button onClick={() => window.print()}
                        className="flex-1 py-3 rounded-xl border border-blue-700/50 bg-blue-900/20 text-blue-400 text-sm font-semibold hover:bg-blue-900/30 transition-colors flex items-center justify-center gap-1.5">
                        🖨 Print
                      </button>
                      <button onClick={() => { setReport(null); setError(null); }}
                        className="py-3 px-4 rounded-xl border border-gray-700 text-gray-500 text-sm hover:text-white hover:border-gray-500 transition-colors">
                        Retry
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
