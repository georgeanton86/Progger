"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type CmeCase = {
  id: string;
  specialty: string;
  docName: string;
  icon: string;
  pearl: string;
  timestamp: string;
  quizDone: boolean;
  creditsEarned: number;
};

type QuizQuestion = { q: string; options: string[]; correct: string; explanation: string };

// ── Storage helpers ───────────────────────────────────────────────────────────

const STORAGE_KEY = "psx_cme_log_v1";
const PROVIDER_KEY = "psx_provider_name";

export function saveCmeCase(entry: Omit<CmeCase, "quizDone" | "creditsEarned">) {
  if (typeof window === "undefined") return;
  const existing: CmeCase[] = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  if (existing.find(c => c.id === entry.id)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([
    ...existing,
    { ...entry, quizDone: false, creditsEarned: 0 },
  ]));
}

function loadCases(): CmeCase[] {
  if (typeof window === "undefined") return [];
  return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}

function updateCase(id: string, update: Partial<CmeCase>) {
  const cases = loadCases();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cases.map(c => c.id === id ? { ...c, ...update } : c)));
}

// ── CME gAIner™ Logo ──────────────────────────────────────────────────────────

function CmeGainerLogo({ size = 36 }: { size?: number }) {
  return (
    <div
      className="rounded-xl flex-shrink-0 flex items-center justify-center overflow-hidden"
      style={{ width: size, height: size, background: "linear-gradient(135deg, #92400e 0%, #b45309 50%, #d97706 100%)" }}
    >
      <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" width={size} height={size}>
        {/* Graduation cap */}
        <polygon points="18,8 30,14 18,20 6,14" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.15)" strokeLinejoin="round"/>
        <path d="M 12 16.5 L 12 23 Q 18 26 24 23 L 24 16.5" stroke="white" strokeWidth="1.6" fill="rgba(255,255,255,0.1)" strokeLinejoin="round"/>
        {/* ECG pulse through cap */}
        <polyline points="6,14 9,14 11,10 13,18 15,12 17,16 19,14 30,14" stroke="rgba(255,255,255,0.55)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"/>
        {/* Tassel */}
        <line x1="30" y1="14" x2="30" y2="21" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
        <circle cx="30" cy="22.5" r="1.5" fill="white" opacity="0.9"/>
      </svg>
    </div>
  );
}

// ── Certificate card ──────────────────────────────────────────────────────────

function CertificateCard({ providerName, totalHours, caseCount }: { providerName: string; totalHours: number; caseCount: number }) {
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  return (
    <div className="rounded-2xl border-2 border-amber-600/60 bg-gradient-to-br from-amber-950/40 to-gray-900 p-6 text-center space-y-3">
      <div className="flex items-center justify-center gap-2 mb-2">
        <CmeGainerLogo size={32} />
        <p className="text-sm font-extrabold text-amber-400 tracking-wide">CME gAIner™</p>
      </div>
      <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest">Certificate of Completion</p>
      <p className="text-lg font-extrabold text-white">{providerName || "Provider"}</p>
      <p className="text-sm text-gray-400">has completed <span className="text-amber-400 font-extrabold">{totalHours.toFixed(2)} CME hours</span></p>
      <p className="text-xs text-gray-500">{caseCount} clinical case{caseCount !== 1 ? "s" : ""} reviewed · PrognoSX AI-assisted learning</p>
      <p className="text-xs text-gray-600">Issued {today} · PrognoSX CME gAIner™</p>
      <button
        onClick={() => window.print()}
        className="mt-2 w-full py-2.5 rounded-xl border border-amber-700/40 text-amber-400 text-xs font-bold hover:bg-amber-900/20 transition-colors flex items-center justify-center gap-2"
      >
        🖨 Print Certificate for Board Submission
      </button>
    </div>
  );
}

// ── Quiz modal ────────────────────────────────────────────────────────────────

function QuizModal({ caseEntry, onClose, onComplete }: {
  caseEntry: CmeCase;
  onClose: () => void;
  onComplete: (id: string) => void;
}) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState<Record<number, { chosen: string; correct: boolean }>>({});
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch("/api/cme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pearl: caseEntry.pearl }),
    })
      .then(r => r.json())
      .then(d => { if (d.questions) { setQuestions(d.questions); } else { setError(d.error || "Failed to load quiz"); } })
      .catch(() => setError("Network error"))
      .finally(() => setLoading(false));
  }, [caseEntry.pearl]);

  const current = questions[step];
  const correctCount = Object.values(answered).filter(a => a.correct).length;
  const passed = correctCount >= 2;

  const submit = () => {
    if (!selected || !current) return;
    const correct = selected.startsWith(current.correct + ":");
    setAnswered(prev => ({ ...prev, [step]: { chosen: selected, correct } }));
    setSelected(null);
    if (step < questions.length - 1) {
      setStep(s => s + 1);
    } else {
      setDone(true);
      if (passed || correctCount + (correct ? 1 : 0) >= 2) {
        updateCase(caseEntry.id, { quizDone: true, creditsEarned: 0.25 });
        onComplete(caseEntry.id);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-amber-700/40 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CmeGainerLogo size={28} />
            <div>
              <p className="text-sm font-extrabold text-white">CME gAIner™ Quiz</p>
              <p className="text-xs text-gray-500">{caseEntry.icon} {caseEntry.docName} · {caseEntry.specialty.replace("_", " ")}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
        </div>

        <div className="p-5">
          {loading && (
            <div className="flex items-center gap-3 py-8 justify-center">
              <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
              <p className="text-gray-400 text-sm">Generating CME questions…</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm text-center py-4">⚠ {error}</p>}

          {!loading && !error && !done && current && (
            <div className="space-y-4">
              {/* Teaching pearl reminder */}
              <div className="p-3 bg-amber-950/20 border border-amber-700/30 rounded-xl">
                <p className="text-xs font-extrabold text-amber-400 mb-1">📚 Teaching Pearl</p>
                <p className="text-xs text-amber-200 leading-relaxed">{caseEntry.pearl}</p>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-2">
                {questions.map((_, i) => (
                  <div key={i} className={cn("flex-1 h-1.5 rounded-full transition-colors", i < step ? "bg-amber-500" : i === step ? "bg-amber-400" : "bg-gray-700")} />
                ))}
                <span className="text-xs text-gray-500 flex-shrink-0">Q{step + 1}/3</span>
              </div>

              {/* Question */}
              <p className="text-sm font-bold text-white leading-snug">{current.q}</p>

              {/* Options */}
              <div className="space-y-2">
                {current.options.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setSelected(opt)}
                    className={cn(
                      "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all",
                      selected === opt
                        ? "border-amber-500 bg-amber-900/20 text-white font-semibold"
                        : "border-gray-700 text-gray-300 hover:border-gray-500 hover:text-white"
                    )}
                  >
                    {opt}
                  </button>
                ))}
              </div>

              <button
                onClick={submit}
                disabled={!selected}
                className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-sm font-extrabold transition-colors"
              >
                {step < questions.length - 1 ? "Next Question →" : "Submit & Earn CME"}
              </button>
            </div>
          )}

          {done && (
            <div className="text-center space-y-4 py-4">
              {passed ? (
                <>
                  <div className="text-5xl">🎓</div>
                  <p className="text-xl font-extrabold text-amber-400">+0.25 CME Hours Earned!</p>
                  <p className="text-sm text-gray-300">{correctCount}/3 correct · Passing score 2/3</p>
                  <p className="text-xs text-gray-500">Credit recorded in your CME gAIner™ log</p>
                </>
              ) : (
                <>
                  <div className="text-5xl">📖</div>
                  <p className="text-lg font-extrabold text-gray-300">{correctCount}/3 correct</p>
                  <p className="text-sm text-gray-500">Need 2/3 to pass. Review the teaching pearl and try again.</p>
                </>
              )}

              {/* Answer review */}
              <div className="space-y-2 text-left mt-4">
                {questions.map((q, i) => {
                  const ans = answered[i];
                  return (
                    <div key={i} className={cn("p-3 rounded-xl border text-xs", ans?.correct ? "border-green-700/40 bg-green-950/10" : "border-red-700/40 bg-red-950/10")}>
                      <p className="font-bold text-gray-200 mb-1">{i + 1}. {q.q}</p>
                      <p className={cn("font-semibold", ans?.correct ? "text-green-400" : "text-red-400")}>
                        {ans?.correct ? "✓" : "✗"} You: {ans?.chosen}
                      </p>
                      {!ans?.correct && <p className="text-gray-400 mt-0.5">Correct: {q.correct}: {q.options.find(o => o.startsWith(q.correct + ":"))}</p>}
                      <p className="text-gray-500 mt-1">{q.explanation}</p>
                    </div>
                  );
                })}
              </div>

              <button onClick={onClose} className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:text-white text-sm transition-colors">
                Close
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Case row ──────────────────────────────────────────────────────────────────

function CaseRow({ c, onStartQuiz }: { c: CmeCase; onStartQuiz: () => void }) {
  const date = new Date(c.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900/40 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="text-xl flex-shrink-0">{c.icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-white">{c.docName} <span className="text-gray-500 font-normal text-xs">{c.specialty.replace("_", " ")}</span></p>
            <p className="text-xs text-gray-500">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {c.quizDone ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-900/30 border border-amber-700/40 text-amber-400 font-bold">
              ✓ +0.25 CME
            </span>
          ) : (
            <button
              onClick={onStartQuiz}
              className="text-xs px-3 py-1.5 rounded-xl bg-amber-900/30 border border-amber-700/40 text-amber-300 hover:bg-amber-900/50 font-bold transition-colors whitespace-nowrap"
            >
              🎓 Take Quiz → +0.25 CME
            </button>
          )}
        </div>
      </div>

      {/* Teaching pearl */}
      <div className="p-3 bg-amber-950/15 border border-amber-800/30 rounded-xl">
        <p className="text-xs font-extrabold text-amber-600 mb-1">📚 Teaching Pearl</p>
        <p className="text-xs text-gray-300 leading-relaxed">{c.pearl}</p>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function CmeGainerTab() {
  const [cases, setCases] = useState<CmeCase[]>([]);
  const [quizCase, setQuizCase] = useState<CmeCase | null>(null);
  const [providerName, setProviderName] = useState("");

  useEffect(() => {
    setCases(loadCases());
    setProviderName(localStorage.getItem(PROVIDER_KEY) || "");
  }, []);

  const refresh = () => setCases(loadCases());

  const totalHours = cases.reduce((sum, c) => sum + c.creditsEarned, 0);
  const doneCount = cases.filter(c => c.quizDone).length;
  const specialties = [...new Set(cases.map(c => c.specialty))].length;

  return (
    <div className="flex flex-col h-full bg-gray-950 overflow-hidden">

      {/* Quiz modal */}
      {quizCase && (
        <QuizModal
          caseEntry={quizCase}
          onClose={() => { setQuizCase(null); refresh(); }}
          onComplete={() => { setQuizCase(null); refresh(); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800 flex-shrink-0 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <CmeGainerLogo size={36} />
          <div>
            <h1 className="text-base font-extrabold text-white flex items-center gap-2">
              CME g<span className="text-amber-400">AI</span>ner™
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-400 border border-amber-700/30">BETA</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Earn CME while you practice · Bill your expertise, not your time</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "CME Hours", value: totalHours.toFixed(2), color: "text-amber-400" },
            { label: "Cases Done", value: doneCount, color: "text-green-400" },
            { label: "Specialties", value: specialties, color: "text-blue-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
              <p className={cn("text-2xl font-extrabold", s.color)}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Progress toward renewal (50 CME every 2 years is typical) */}
        {cases.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">CME Progress</p>
              <p className="text-xs text-gray-500">{totalHours.toFixed(2)} / 50 hrs (biennial)</p>
            </div>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-700"
                style={{ width: `${Math.min(100, (totalHours / 50) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">Typical physician requirement: 50 CME hours every 2 years</p>
          </div>
        )}

        {/* Provider name for certificate */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 space-y-3">
          <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Certificate Name</p>
          <input
            type="text"
            value={providerName}
            onChange={e => { setProviderName(e.target.value); localStorage.setItem(PROVIDER_KEY, e.target.value); }}
            placeholder="Dr. George Antonopoulos"
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-amber-500"
          />
        </div>

        {/* Certificate */}
        {totalHours >= 0.25 && (
          <CertificateCard providerName={providerName || "Provider"} totalHours={totalHours} caseCount={doneCount} />
        )}

        {/* Case log */}
        <div>
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-3">
            Case Log ({cases.length} case{cases.length !== 1 ? "s" : ""})
          </p>

          {cases.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <div className="text-5xl">🎓</div>
              <div>
                <p className="text-white font-extrabold text-lg">No cases yet</p>
                <p className="text-gray-500 text-sm mt-1 max-w-sm mx-auto leading-relaxed">
                  Run a consult in Grand Rounds AI™, then click <strong className="text-amber-400">"Earn CME Credit →"</strong> on any teaching pearl to add it here.
                </p>
              </div>
              <div className="p-4 bg-amber-950/20 border border-amber-700/30 rounded-xl max-w-sm mx-auto text-left">
                <p className="text-xs font-extrabold text-amber-400 mb-1">How it works:</p>
                <div className="space-y-1 text-xs text-amber-200 leading-relaxed">
                  <p>1. Consult a specialist in Grand Rounds AI™</p>
                  <p>2. Click "Earn CME Credit →" on the teaching pearl</p>
                  <p>3. Take a 3-question quiz here</p>
                  <p>4. Pass 2/3 = earn 0.25 CME hours</p>
                  <p>5. Export your certificate for board renewal</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {[...cases].reverse().map(c => (
                <CaseRow
                  key={c.id}
                  c={c}
                  onStartQuiz={() => setQuizCase(c)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="p-4 rounded-xl bg-amber-950/15 border border-amber-800/30">
          <p className="text-xs text-amber-700 leading-relaxed">
            ⚠ <strong className="text-amber-600">CME gAIner™</strong> generates AI-assisted educational content and self-assessment quizzes.
            Credits logged here are for personal tracking purposes. For formal CME accreditation accepted by state medical boards,
            credits must be obtained through ACCME-accredited providers. Always verify your state board's specific CME requirements.
          </p>
        </div>
      </div>
    </div>
  );
}
