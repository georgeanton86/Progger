"use client";
import { useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type ConsultStatus = "idle" | "streaming" | "done" | "error";

type ActiveConsult = {
  specialty: string;
  specialistName: string;
  docName: string;
  icon: string;
  text: string;
  status: ConsultStatus;
  question: string;
  timestamp: string;
};

// ── Specialist roster ─────────────────────────────────────────────────────────

const SPECIALISTS = [
  {
    id: "cardiology",
    docName: "Cardi",
    name: "Cardiology",
    icon: "🫀",
    tagline: "Chest pain · EKG · Heart failure · Arrhythmia",
    color: "border-red-700/40 bg-red-950/10 hover:border-red-600/60",
    activeColor: "border-red-500/70 bg-red-950/20",
    badgeColor: "bg-red-900/50 text-red-300 border-red-700/40",
  },
  {
    id: "infectious_disease",
    docName: "Iggy",
    name: "Infectious Disease",
    icon: "🦠",
    tagline: "Sepsis · Antibiotic selection · Complex infections",
    color: "border-green-700/40 bg-green-950/10 hover:border-green-600/60",
    activeColor: "border-green-500/70 bg-green-950/20",
    badgeColor: "bg-green-900/50 text-green-300 border-green-700/40",
  },
  {
    id: "orthopedics",
    docName: "Bones",
    name: "Orthopedics",
    icon: "🦴",
    tagline: "Fractures · MSK injuries · Surgical thresholds",
    color: "border-amber-700/40 bg-amber-950/10 hover:border-amber-600/60",
    activeColor: "border-amber-500/70 bg-amber-950/20",
    badgeColor: "bg-amber-900/50 text-amber-300 border-amber-700/40",
  },
  {
    id: "neurology",
    docName: "Nero",
    name: "Neurology",
    icon: "🧠",
    tagline: "Stroke · Seizure · Headache · HINTS · Syncope",
    color: "border-purple-700/40 bg-purple-950/10 hover:border-purple-600/60",
    activeColor: "border-purple-500/70 bg-purple-950/20",
    badgeColor: "bg-purple-900/50 text-purple-300 border-purple-700/40",
  },
  {
    id: "pulmonology",
    docName: "Pauly",
    name: "Pulmonology",
    icon: "🫁",
    tagline: "Pneumonia · COPD · PE · Asthma · Nodules",
    color: "border-sky-700/40 bg-sky-950/10 hover:border-sky-600/60",
    activeColor: "border-sky-500/70 bg-sky-950/20",
    badgeColor: "bg-sky-900/50 text-sky-300 border-sky-700/40",
  },
  {
    id: "emergency_medicine",
    docName: "Ace",
    name: "Emergency Medicine",
    icon: "🚑",
    tagline: "High-acuity · Undifferentiated · Must-not-miss Dx",
    color: "border-orange-700/40 bg-orange-950/10 hover:border-orange-600/60",
    activeColor: "border-orange-500/70 bg-orange-950/20",
    badgeColor: "bg-orange-900/50 text-orange-300 border-orange-700/40",
  },
  {
    id: "gastroenterology",
    docName: "Gus",
    name: "Gastroenterology",
    icon: "🫃",
    tagline: "GI bleed · Abdominal pain · Liver · IBD",
    color: "border-lime-700/40 bg-lime-950/10 hover:border-lime-600/60",
    activeColor: "border-lime-500/70 bg-lime-950/20",
    badgeColor: "bg-lime-900/50 text-lime-300 border-lime-700/40",
  },
  {
    id: "nephrology",
    docName: "Rena",
    name: "Nephrology",
    icon: "🫘",
    tagline: "AKI · CKD · Electrolytes · Dialysis indications",
    color: "border-teal-700/40 bg-teal-950/10 hover:border-teal-600/60",
    activeColor: "border-teal-500/70 bg-teal-950/20",
    badgeColor: "bg-teal-900/50 text-teal-300 border-teal-700/40",
  },
  {
    id: "psychiatry",
    docName: "Siggy",
    name: "Psychiatry",
    icon: "🧬",
    tagline: "Safety assessment · Mood · Psychosis · SUDs",
    color: "border-pink-700/40 bg-pink-950/10 hover:border-pink-600/60",
    activeColor: "border-pink-500/70 bg-pink-950/20",
    badgeColor: "bg-pink-900/50 text-pink-300 border-pink-700/40",
  },
  {
    id: "clinical_pharmacy",
    docName: "ReX",
    name: "Clinical Pharmacy",
    icon: "💊",
    tagline: "Drug interactions · Dosing · Deprescribing · PDMP",
    color: "border-cyan-700/40 bg-cyan-950/10 hover:border-cyan-600/60",
    activeColor: "border-cyan-500/70 bg-cyan-950/20",
    badgeColor: "bg-cyan-900/50 text-cyan-300 border-cyan-700/40",
  },
  {
    id: "pediatrics",
    docName: "Pip",
    name: "Pediatrics",
    icon: "👶",
    tagline: "Weight-based dosing · Pediatric vitals · PALS",
    color: "border-yellow-700/40 bg-yellow-950/10 hover:border-yellow-600/60",
    activeColor: "border-yellow-500/70 bg-yellow-950/20",
    badgeColor: "bg-yellow-900/50 text-yellow-300 border-yellow-700/40",
  },
  {
    id: "internal_medicine",
    docName: "Sage",
    name: "Internal Medicine",
    icon: "🩺",
    tagline: "Diagnostic synthesis · Multimorbidity · Preventive",
    color: "border-indigo-700/40 bg-indigo-950/10 hover:border-indigo-600/60",
    activeColor: "border-indigo-500/70 bg-indigo-950/20",
    badgeColor: "bg-indigo-900/50 text-indigo-300 border-indigo-700/40",
  },
];

// ── Consultation text renderer ────────────────────────────────────────────────

function ConsultText({ text, status }: { text: string; status: ConsultStatus }) {
  const lines = text.split("\n");

  return (
    <div className="space-y-1 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (line.startsWith("## ")) {
          return (
            <p key={i} className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mt-4 mb-1 first:mt-0">
              {line.replace("## ", "")}
            </p>
          );
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return (
            <p key={i} className="font-bold text-white text-xs">
              {line.replace(/\*\*/g, "")}
            </p>
          );
        }
        if (line.match(/^\*\*[^*]+:\*\*/)) {
          const [label, ...rest] = line.split("**").filter(Boolean);
          return (
            <p key={i} className="text-sm text-gray-200">
              <span className="font-bold text-gray-300">{label.replace(":", "")}:</span>
              {rest.join("").replace(/^:/, "")}
            </p>
          );
        }
        if (line.startsWith("- ") || line.startsWith("• ")) {
          return (
            <p key={i} className="text-sm text-gray-300 flex items-start gap-2 pl-1">
              <span className="text-blue-500 flex-shrink-0 mt-0.5">→</span>
              {line.replace(/^[-•]\s/, "")}
            </p>
          );
        }
        if (line.match(/^\d+\.\s/)) {
          return (
            <p key={i} className="text-sm text-gray-200 flex items-start gap-2 pl-1">
              <span className="text-blue-400 font-bold flex-shrink-0 w-5 text-right">{line.match(/^\d+/)?.[0]}.</span>
              <span>{line.replace(/^\d+\.\s/, "")}</span>
            </p>
          );
        }
        if (line.startsWith("---")) {
          return <hr key={i} className="border-gray-800 my-3" />;
        }
        if (line.startsWith("*") && line.endsWith("*") && !line.startsWith("**")) {
          return (
            <p key={i} className="text-xs text-gray-600 italic mt-2">
              {line.replace(/^\*|\*$/g, "")}
            </p>
          );
        }
        if (!line.trim()) {
          return <div key={i} className="h-1" />;
        }
        return <p key={i} className="text-sm text-gray-300">{line}</p>;
      })}
      {status === "streaming" && (
        <span className="inline-block w-1.5 h-4 bg-blue-400 animate-pulse rounded-sm ml-0.5" />
      )}
    </div>
  );
}

// ── Specialist card ───────────────────────────────────────────────────────────

function SpecialistCard({
  spec,
  isActive,
  isStreaming,
  onConsult,
}: {
  spec: typeof SPECIALISTS[0];
  isActive: boolean;
  isStreaming: boolean;
  onConsult: () => void;
}) {
  return (
    <div className={cn(
      "rounded-xl border p-3 transition-all cursor-pointer",
      isActive ? spec.activeColor : spec.color
    )} onClick={!isActive && !isStreaming ? onConsult : undefined}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl flex-shrink-0">{spec.icon}</span>
          <div className="min-w-0">
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm font-extrabold text-white">{spec.docName}</p>
              <p className="text-xs text-gray-500 truncate">{spec.name}</p>
            </div>
            <p className="text-xs text-gray-600 leading-snug mt-0.5 line-clamp-1">{spec.tagline}</p>
          </div>
        </div>
        {isActive ? (
          <span className={cn("flex-shrink-0 text-xs px-2 py-0.5 rounded-full border font-bold", spec.badgeColor)}>
            Active
          </span>
        ) : (
          <button
            onClick={e => { e.stopPropagation(); if (!isStreaming) onConsult(); }}
            disabled={isStreaming}
            className="flex-shrink-0 text-xs px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
          >
            Consult
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function GrandRoundsTab() {
  const [caseContext, setCaseContext] = useState("");
  const [consults, setConsults] = useState<ActiveConsult[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [globalQuestion, setGlobalQuestion] = useState("");
  const [anyStreaming, setAnyStreaming] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRefs = useRef<Record<string, AbortController>>({});

  const isActive = (id: string) => consults.some(c => c.specialty === id);
  const activeConsult = consults.find(c => c.specialty === activeTab);
  const spec = SPECIALISTS.find(s => s.id === activeTab);

  const runConsult = useCallback(async (specialtyId: string, question?: string) => {
    if (!caseContext.trim()) return;
    const specMeta = SPECIALISTS.find(s => s.id === specialtyId);
    if (!specMeta) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    setConsults(prev => {
      const existing = prev.find(c => c.specialty === specialtyId);
      if (existing) {
        return prev.map(c => c.specialty === specialtyId
          ? { ...c, text: "", status: "streaming", question: question || "", timestamp: now }
          : c
        );
      }
      return [...prev, {
        specialty: specialtyId,
        specialistName: specMeta.name,
        docName: specMeta.docName,
        icon: specMeta.icon,
        text: "",
        status: "streaming",
        question: question || "",
        timestamp: now,
      }];
    });

    setActiveTab(specialtyId);
    setAnyStreaming(true);

    const controller = new AbortController();
    abortRefs.current[specialtyId] = controller;

    try {
      const res = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ specialty: specialtyId, caseContext, question: question || "" }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Request failed" }));
        setConsults(prev => prev.map(c => c.specialty === specialtyId
          ? { ...c, status: "error", text: err.error || "Consultation failed" }
          : c
        ));
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.delta?.text ?? json.delta?.type === "text_delta" ? json.delta.text : null;
            if (delta) {
              setConsults(prev => prev.map(c => c.specialty === specialtyId
                ? { ...c, text: c.text + delta }
                : c
              ));
            }
          } catch { /* skip malformed */ }
        }
      }

      setConsults(prev => prev.map(c => c.specialty === specialtyId
        ? { ...c, status: "done" }
        : c
      ));
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        setConsults(prev => prev.map(c => c.specialty === specialtyId
          ? { ...c, status: "error", text: "Consultation failed — please retry" }
          : c
        ));
      }
    } finally {
      setAnyStreaming(false);
      delete abortRefs.current[specialtyId];
    }
  }, [caseContext]);

  const removeConsult = (id: string) => {
    abortRefs.current[id]?.abort();
    setConsults(prev => prev.filter(c => c.specialty !== id));
    if (activeTab === id) {
      const remaining = consults.filter(c => c.specialty !== id);
      setActiveTab(remaining[remaining.length - 1]?.specialty ?? null);
    }
  };

  const copyConsult = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const consultAll = async () => {
    for (const spec of SPECIALISTS) {
      if (!isActive(spec.id)) {
        await runConsult(spec.id, globalQuestion);
        await new Promise(r => setTimeout(r, 300));
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0 flex-wrap gap-2">
        <div>
          <h1 className="text-base font-extrabold text-white flex items-center gap-2">
            🏥 Grand Rounds <span className="text-blue-400">AI</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-900/40 text-blue-400 border border-blue-700/30">BETA</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Your AI specialty consult team · 12 board-equivalent specialists · Case-aware clinical reasoning</p>
        </div>
        <div className="flex items-center gap-2">
          {consults.length > 0 && (
            <span className="text-xs text-gray-500 font-semibold">
              {consults.length} active consult{consults.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Case context + specialist roster ── */}
        <div className="w-72 xl:w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">

          {/* Case context */}
          <div className="p-3 border-b border-gray-800 flex-shrink-0 space-y-2">
            <label className="text-xs font-extrabold text-gray-400 uppercase tracking-widest block">Case Summary</label>
            <textarea
              value={caseContext}
              onChange={e => setCaseContext(e.target.value)}
              placeholder={`Patient: 58yo M. CC: chest pain ×2h, radiates to jaw, diaphoretic.\nVitals: BP 158/94, HR 102, RR 18, SpO2 96% RA.\nPMH: HTN, DM2, smoker 30 pack-years.\nMeds: Metformin, lisinopril.\nECG: ST elevation V1-V4.\nTroponin pending.`}
              rows={7}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
            />
            <input
              type="text"
              value={globalQuestion}
              onChange={e => setGlobalQuestion(e.target.value)}
              placeholder="Specific question (optional)…"
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
            />
            {!caseContext.trim() && (
              <p className="text-xs text-amber-600">Enter a case summary above to consult specialists</p>
            )}
          </div>

          {/* Specialist roster */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Specialists</p>
              <button
                onClick={consultAll}
                disabled={!caseContext.trim() || anyStreaming}
                className="text-xs px-2.5 py-1 rounded-lg border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed font-semibold"
                title="Consult all specialties"
              >
                Consult All
              </button>
            </div>
            {SPECIALISTS.map(s => (
              <SpecialistCard
                key={s.id}
                spec={s}
                isActive={isActive(s.id)}
                isStreaming={anyStreaming && isActive(s.id) && consults.find(c => c.specialty === s.id)?.status === "streaming"}
                onConsult={() => runConsult(s.id, globalQuestion || undefined)}
              />
            ))}
          </div>
        </div>

        {/* ── Right: Consultations workspace ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {consults.length === 0 ? (
            /* Empty state */
            <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8 text-center">
              <div className="text-6xl select-none">🏥</div>
              <div>
                <p className="text-white font-extrabold text-xl mb-2">
                  Grand Rounds <span className="text-blue-400">AI</span>
                </p>
                <p className="text-gray-500 text-sm max-w-sm mx-auto leading-relaxed">
                  Enter your case summary on the left, then tap any specialist to get their consultation in real-time.
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-lg w-full">
                {SPECIALISTS.slice(0, 6).map(s => (
                  <div key={s.id} className={cn("rounded-xl border p-3 text-center transition-colors", s.color)}>
                    <div className="text-2xl mb-1.5">{s.icon}</div>
                    <p className="text-xs font-bold text-gray-300">{s.name}</p>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-700 max-w-sm">
                ⚠ Grand Rounds AI is a clinical decision support tool. AI-generated consultations are not a substitute for board-certified specialist opinions. Always verify with a licensed physician before clinical action.
              </p>
            </div>

          ) : (
            <>
              {/* Consultation tabs */}
              <div className="flex items-center gap-1 px-4 pt-3 pb-0 flex-wrap border-b border-gray-800 flex-shrink-0 min-h-12">
                {consults.map(c => {
                  const s = SPECIALISTS.find(x => x.id === c.specialty);
                  return (
                    <button
                      key={c.specialty}
                      onClick={() => setActiveTab(c.specialty)}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-t-xl border-b-2 text-xs font-bold transition-all flex-shrink-0 -mb-px",
                        activeTab === c.specialty
                          ? "border-b-blue-500 text-white bg-gray-900/40"
                          : "border-b-transparent text-gray-500 hover:text-gray-300"
                      )}
                    >
                      <span>{c.icon}</span>
                      <span className="hidden sm:inline">{c.docName}</span>
                      {c.status === "streaming" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      )}
                      {c.status === "done" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      )}
                      {c.status === "error" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); removeConsult(c.specialty); }}
                        className="text-gray-600 hover:text-gray-300 ml-0.5 leading-none"
                      >✕</button>
                    </button>
                  );
                })}
              </div>

              {/* Active consultation content */}
              {activeConsult && (
                <div className="flex-1 overflow-y-auto">
                  {/* Consultation header */}
                  <div className={cn(
                    "flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0",
                    spec ? spec.activeColor.replace("border", "border") : ""
                  )}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{activeConsult.icon}</span>
                      <div>
                        <p className="text-sm font-extrabold text-white">
                          {activeConsult.docName}
                          <span className="text-gray-500 font-normal ml-1.5 text-xs">{activeConsult.specialistName}</span>
                        </p>
                        <p className="text-xs text-gray-500">
                          {activeConsult.status === "streaming" ? `${activeConsult.docName} is reviewing the case…` :
                           activeConsult.status === "done" ? `Completed · ${activeConsult.timestamp}` :
                           activeConsult.status === "error" ? "Error" : ""}
                          {activeConsult.question && ` · Q: "${activeConsult.question}"`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {activeConsult.status === "done" && (
                        <>
                          <button
                            onClick={() => copyConsult(activeConsult.text, activeConsult.specialty)}
                            className={cn(
                              "text-xs px-3 py-1.5 rounded-lg border font-semibold transition-colors",
                              copied === activeConsult.specialty
                                ? "border-green-600/50 bg-green-900/20 text-green-400"
                                : "border-gray-600 text-gray-400 hover:text-white hover:border-gray-400"
                            )}
                          >
                            {copied === activeConsult.specialty ? "✓ Copied" : "📋 Copy"}
                          </button>
                          <button
                            onClick={() => runConsult(activeConsult.specialty, activeConsult.question || undefined)}
                            disabled={anyStreaming}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white hover:border-gray-400 transition-colors disabled:opacity-40 font-semibold"
                          >
                            ↺ Re-consult
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Consultation text */}
                  <div className="p-5">
                    {activeConsult.status === "streaming" && activeConsult.text === "" ? (
                      <div className="flex items-center gap-3 py-8">
                        <div className="w-5 h-5 rounded-full border-2 border-blue-400 border-t-transparent animate-spin flex-shrink-0" />
                        <p className="text-gray-500 text-sm">
                          {activeConsult.docName} is reviewing the case…
                        </p>
                      </div>
                    ) : activeConsult.status === "error" ? (
                      <div className="p-4 rounded-xl bg-red-950/30 border border-red-700/40">
                        <p className="text-red-400 text-sm">⚠ {activeConsult.text || "Consultation failed. Please retry."}</p>
                        <button
                          onClick={() => runConsult(activeConsult.specialty)}
                          className="mt-3 text-xs px-3 py-1.5 rounded-lg border border-red-700/40 text-red-400 hover:border-red-500 transition-colors"
                        >
                          ↺ Retry
                        </button>
                      </div>
                    ) : (
                      <ConsultText text={activeConsult.text} status={activeConsult.status} />
                    )}

                    {/* Ask follow-up */}
                    {activeConsult.status === "done" && (
                      <FollowUpInput
                        docName={activeConsult.docName}
                        onAsk={q => runConsult(activeConsult.specialty, q)}
                        disabled={anyStreaming}
                      />
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Follow-up question input ──────────────────────────────────────────────────

function FollowUpInput({ docName, onAsk, disabled }: { docName: string; onAsk: (q: string) => void; disabled: boolean }) {
  const [q, setQ] = useState("");

  const submit = () => {
    if (!q.trim()) return;
    onAsk(q.trim());
    setQ("");
  };

  return (
    <div className="mt-6 pt-4 border-t border-gray-800 flex gap-2">
      <input
        type="text"
        value={q}
        onChange={e => setQ(e.target.value)}
        onKeyDown={e => e.key === "Enter" && !e.shiftKey && submit()}
        placeholder={`Ask ${docName} a follow-up question…`}
        disabled={disabled}
        className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 disabled:opacity-40"
      />
      <button
        onClick={submit}
        disabled={!q.trim() || disabled}
        className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors flex-shrink-0"
      >
        Ask
      </button>
    </div>
  );
}
