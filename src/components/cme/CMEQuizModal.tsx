"use client";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  CMEQuestion, CMESource, addCMESession, calcSessionCredits,
  loadCMEStore, LICENSE_CONFIG,
} from "@/lib/cme";

interface Props {
  pearl: string;
  topic: string;
  source: CMESource;
  onClose: () => void;
  onEarned: (credits: number) => void;
}

export function CMEQuizModal({ pearl, topic, source, onClose, onEarned }: Props) {
  const [questions, setQuestions] = useState<CMEQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [step, setStep]           = useState(0);
  const [answers, setAnswers]     = useState<string[]>([]);
  const [revealed, setRevealed]   = useState(false);
  const [done, setDone]           = useState(false);
  const [earned, setEarned]       = useState(0);

  useEffect(() => {
    fetch("/api/cme", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pearl }),
    })
      .then(r => r.json())
      .then(d => setQuestions((d.questions ?? []).slice(0, 2)))
      .catch(() => setError("Could not load CME questions — try again"))
      .finally(() => setLoading(false));
  }, [pearl]);

  const q       = questions[step];
  const answer  = answers[step];
  const correct = revealed && answer === q?.correct;
  const store   = loadCMEStore();
  const cfg     = LICENSE_CONFIG[store.licenseType];

  const handlePick = (opt: string) => {
    if (revealed) return;
    const next = [...answers];
    next[step] = opt;
    setAnswers(next);
    setRevealed(true);
  };

  const handleNext = () => {
    if (step < questions.length - 1) {
      setStep(s => s + 1);
      setRevealed(false);
    } else {
      const credits = calcSessionCredits(questions, answers);
      addCMESession({
        id: String(Date.now()),
        date: new Date().toISOString(),
        source,
        topic,
        questions,
        answers,
        creditsEarned: credits,
      });
      setEarned(credits);
      setDone(true);
      onEarned(credits);
    }
  };

  const optionLetter = (opt: string) => opt.slice(0, 1);
  const isCorrectOpt = (opt: string) => optionLetter(opt) === q?.correct;
  const isPickedOpt  = (opt: string) => optionLetter(opt) === answer;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.72)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg bg-gray-900 border border-gray-700 rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800 bg-gray-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-900/30 border border-blue-800/50 flex items-center justify-center text-sm">🎓</div>
            <div>
              <p className="text-xs font-extrabold text-white leading-none">Quick CME Check</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-none">{cfg.unit} · {source}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-white text-lg leading-none transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="p-5">
          {loading && (
            <div className="flex flex-col items-center gap-3 py-8">
              <div className="w-8 h-8 rounded-full border-2 border-blue-700 border-t-transparent animate-spin" />
              <p className="text-sm text-gray-400">Generating clinical question…</p>
            </div>
          )}

          {error && (
            <div className="py-6 text-center space-y-3">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={onClose} className="text-xs text-gray-500 hover:text-white transition-colors">Close</button>
            </div>
          )}

          {!loading && !error && !done && q && (
            <div className="space-y-4">
              {/* Progress dots */}
              <div className="flex items-center gap-1.5">
                {questions.map((_, i) => (
                  <div key={i} className={cn(
                    "h-1 flex-1 rounded-full transition-all duration-300",
                    i < step ? "bg-blue-700" : i === step ? "bg-blue-600" : "bg-gray-700"
                  )} />
                ))}
                <span className="text-xs text-gray-600 ml-1 flex-shrink-0">{step + 1}/{questions.length}</span>
              </div>

              {/* Topic chip */}
              <p className="text-xs font-semibold text-blue-300/80 bg-blue-950/30 border border-blue-900/40 rounded-full px-2.5 py-1 w-fit">{topic}</p>

              {/* Question */}
              <p className="text-sm font-semibold text-white leading-relaxed">{q.q}</p>

              {/* Options */}
              <div className="space-y-2">
                {q.options.map((opt) => {
                  const letter = optionLetter(opt);
                  const picked = isPickedOpt(opt);
                  const isRight = isCorrectOpt(opt);
                  let style = "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-500 hover:bg-gray-800/70";
                  if (revealed) {
                    if (isRight)       style = "border-green-500 bg-green-900/30 text-green-200";
                    else if (picked)   style = "border-red-500 bg-red-900/30 text-red-200";
                    else               style = "border-gray-800 bg-gray-800/20 text-gray-600";
                  }
                  return (
                    <button
                      key={letter}
                      onClick={() => handlePick(letter)}
                      disabled={revealed}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 flex items-start gap-3",
                        style, !revealed && "cursor-pointer"
                      )}
                    >
                      <span className={cn(
                        "flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs font-bold mt-0.5",
                        revealed && isRight ? "border-green-400 bg-green-700/40 text-green-300" :
                        revealed && picked  ? "border-red-400 bg-red-700/40 text-red-300" :
                        "border-gray-600 text-gray-500"
                      )}>{letter}</span>
                      <span className="flex-1 leading-snug">{opt.slice(3)}</span>
                      {revealed && isRight && <span className="text-green-400 flex-shrink-0">✓</span>}
                      {revealed && picked && !isRight && <span className="text-red-400 flex-shrink-0">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {revealed && (
                <div className={cn(
                  "p-3.5 rounded-xl border text-sm leading-relaxed animate-in fade-in duration-200",
                  correct
                    ? "bg-green-950/40 border-green-700/40 text-green-200"
                    : "bg-gray-800/60 border-gray-700/40 text-gray-300"
                )}>
                  <span className="font-bold mr-1">{correct ? "✓ Correct." : `✗ The answer is ${q.correct}.`}</span>
                  {q.explanation}
                </div>
              )}

              {revealed && (
                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-bold text-sm transition-colors"
                >
                  {step < questions.length - 1 ? "Next Question →" : "Finish & Claim Credits"}
                </button>
              )}
            </div>
          )}

          {done && (
            <div className="py-4 flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-full bg-blue-950/40 border-2 border-blue-700/60 flex items-center justify-center text-3xl animate-in zoom-in duration-300">
                🎓
              </div>
              <div>
                <p className="text-2xl font-black text-white">+{earned} {cfg.unit}</p>
                <p className="text-sm text-gray-400 mt-1">Added to your CME wallet</p>
                <p className="text-xs text-gray-600 mt-0.5">{source} · {topic}</p>
              </div>
              {/* Score summary */}
              <div className="flex gap-3 text-xs">
                {questions.map((q, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-1 px-2.5 py-1.5 rounded-full border font-semibold",
                    answers[i] === q.correct
                      ? "border-green-600/50 bg-green-900/20 text-green-400"
                      : "border-red-600/40 bg-red-900/20 text-red-400"
                  )}>
                    {answers[i] === q.correct ? "✓" : "✗"} Q{i + 1}
                  </div>
                ))}
              </div>
              <button
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-white font-semibold text-sm border border-gray-700 transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
