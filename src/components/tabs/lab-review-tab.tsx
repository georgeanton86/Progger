"use client";
import { useState } from "react";
import { samplePatients, sampleLabReviews } from "@/lib/sampleData";
import { PatientAvatar } from "@/components/patient-avatar";
import { cn } from "@/lib/utils";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import type { Patient, LabResult, LabResultStatus, PatientLabReview } from "@/lib/types";

function statusStyle(s: LabResultStatus) {
  switch (s) {
    case "optimal":        return { badge: "bg-green-100 text-green-700 border-green-200",  card: "bg-green-50 border-green-100" };
    case "normal":         return { badge: "bg-gray-100 text-gray-600 border-gray-200",    card: "bg-white border-gray-100" };
    case "borderline-low": return { badge: "bg-amber-100 text-amber-700 border-amber-200", card: "bg-amber-50 border-amber-100" };
    case "borderline-high":return { badge: "bg-amber-100 text-amber-700 border-amber-200", card: "bg-amber-50 border-amber-100" };
    case "low":            return { badge: "bg-orange-100 text-orange-700 border-orange-200", card: "bg-orange-50 border-orange-100" };
    case "high":           return { badge: "bg-orange-100 text-orange-700 border-orange-200", card: "bg-orange-50 border-orange-100" };
    case "critical":       return { badge: "bg-red-100 text-red-700 border-red-200",       card: "bg-red-50 border-red-100" };
  }
}

function statusLabel(s: LabResultStatus) {
  switch (s) {
    case "optimal":         return "Optimal";
    case "normal":          return "Normal";
    case "borderline-low":  return "Borderline Low";
    case "borderline-high": return "Borderline High";
    case "low":             return "Low";
    case "high":            return "High";
    case "critical":        return "Critical";
  }
}

function LabResultCard({ result }: { result: LabResult }) {
  const style = statusStyle(result.status);
  return (
    <div className={cn("p-4 rounded-xl border", style.card)}>
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-bold text-gray-800 leading-snug">{result.name}</p>
        <span className={cn("text-xs px-2 py-0.5 rounded-full font-semibold border flex-shrink-0", style.badge)}>
          {statusLabel(result.status)}
        </span>
      </div>
      <p className="text-2xl font-extrabold text-gray-900 leading-none">
        {result.value} <span className="text-sm font-normal text-gray-400">{result.unit}</span>
      </p>
      <p className="text-xs text-gray-400 mt-1">Ref: {result.refRange}</p>
      {result.note && <p className="text-xs text-gray-600 mt-1.5 italic leading-snug">{result.note}</p>}
    </div>
  );
}

function PrintableCard({ review, patient }: { review: PatientLabReview; patient: Patient }) {
  const { name: patientName, age: patientAge } = patient;
  return (
    <div id="lab-print-root" className="bg-white">
      <style>{`
        @media print {
          body > * { display: none !important; }
          #lab-print-root { display: block !important; }
          #lab-print-root { position: fixed; top: 0; left: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="relative p-7 pb-6" style={{ background: "linear-gradient(135deg, #0f2d5c 0%, #1d4ed8 100%)" }}>
        <div className="flex items-start gap-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-blue-100 uppercase tracking-widest">Lab Review</span>
              <span className="text-xs text-blue-300">{new Date(review.date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <h1 className="text-3xl font-extrabold text-white leading-tight">{patientName}</h1>
            <p className="text-blue-200 text-sm mt-1">{patientAge}-Year-Old · {review.visitContext}</p>
            {review.protocol && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {review.protocol.split("·").map(p => (
                  <span key={p} className="text-xs px-2.5 py-1 rounded-full bg-white/15 text-blue-100">{p.trim()}</span>
                ))}
              </div>
            )}
          </div>
          {/* Patient avatar */}
          <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
            <div className="rounded-2xl overflow-hidden border-4 border-white/30 shadow-xl">
              <PatientAvatar patient={patient} size={80} />
            </div>
            <p className="text-white/60 text-xs font-medium">PredictaChart™</p>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 rounded-xl bg-white/10 border border-white/15">
          <p className="text-sm text-blue-100 leading-relaxed">{review.summary}</p>
        </div>
      </div>

      {/* Lab Categories */}
      <div className="p-6 space-y-7 bg-gray-50">
        {review.categories.map(cat => (
          <div key={cat.name}>
            <h2 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              <span className="text-base">{cat.icon}</span>{cat.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cat.results.map(r => (
                <LabResultCard key={r.name} result={r} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recommendations + Follow-up */}
      <div className="px-6 pb-6 grid grid-cols-1 sm:grid-cols-2 gap-5 bg-gray-50">
        <div className="bg-white border border-teal-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-3">Treatment Plan</h3>
          <div className="space-y-2.5">
            {review.recommendations.map((r, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-teal-600 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-sm text-gray-700 leading-snug">{r}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
          <h3 className="text-xs font-bold text-blue-500 uppercase tracking-widest mb-3">Follow-Up Plan</h3>
          <p className="text-sm text-gray-700 leading-relaxed">{review.followUp}</p>

          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400">Ordering Provider</p>
            <p className="text-sm font-bold text-gray-700 mt-0.5">{review.providerName}</p>
            <p className="text-xs text-gray-400 mt-0.5">Arogya Medical · arogya.com</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-6 bg-gray-50">
        <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
          <p className="text-xs text-gray-400">This lab review is for educational purposes. Consult your provider before making any changes to your treatment plan.</p>
          <p className="text-xs text-gray-300 flex-shrink-0 ml-4">PredictaChart™ · Arogya Medical</p>
        </div>
      </div>
    </div>
  );
}

function NewLabReviewForm({ onBack }: { onBack: () => void }) {
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState("");
  const [visitContext, setVisitContext] = useState("");
  const [labValues, setLabValues] = useState("");
  const { output, loading, run, reset } = useStreamingAI();

  function generate() {
    if (!patientName.trim() || !labValues.trim()) return;
    run(
      `You are a physician creating a patient-friendly lab results summary. Generate a clear, empathetic, and actionable lab review document using plain text with section headers. Use these sections:

## Summary
(2-3 sentence plain-language overview of the overall lab picture)

## Your Lab Results Explained
(For each lab value provided, explain what it measures, whether the value is normal/abnormal, and what it means for the patient in simple language. Use bullet points.)

## What This Means For You
(Practical implications — lifestyle, diet, activity, symptoms to watch for)

## Recommended Next Steps
(3-5 numbered actionable items: follow-up labs, referrals, medication changes, lifestyle interventions)

## Follow-Up
(When to recheck labs and what to expect at next visit)

Be warm, clear, and avoid medical jargon. Explain any terms you must use.`,
      `Patient: ${patientName}${patientAge ? `, Age: ${patientAge}` : ""}
Visit Context: ${visitContext || "Routine lab review"}
Lab Values:
${labValues}`
    );
  }

  const hasResult = output.length > 0;

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-white transition-colors">
          ← Lab Reviews
        </button>
        <span className="text-gray-700">/</span>
        <h1 className="text-lg font-bold text-white">New Lab Review</h1>
      </div>

      {!hasResult ? (
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Patient Info</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Patient Name *</label>
                <input
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  placeholder="e.g. Jane Smith"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Age</label>
                <input
                  value={patientAge}
                  onChange={e => setPatientAge(e.target.value)}
                  placeholder="e.g. 52"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Visit Context</label>
              <input
                value={visitContext}
                onChange={e => setVisitContext(e.target.value)}
                placeholder="e.g. Annual wellness visit, Diabetes follow-up, Pre-op evaluation"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <label className="text-xs text-gray-500 block mb-1">
              Lab Values * <span className="text-gray-700 font-normal">(paste or type results — any format)</span>
            </label>
            <textarea
              value={labValues}
              onChange={e => setLabValues(e.target.value)}
              rows={10}
              placeholder={`Paste lab results in any format, e.g.:

HbA1c: 7.2% (ref 4.0–5.6)
Glucose fasting: 138 mg/dL (ref 70–99)
Total Cholesterol: 214 mg/dL
LDL: 142 mg/dL
HDL: 48 mg/dL
Triglycerides: 188 mg/dL
eGFR: 72 mL/min/1.73m2
Creatinine: 1.1 mg/dL
CBC: WBC 6.2, Hgb 13.4, Plt 245
TSH: 2.1 mIU/L`}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 resize-none font-mono leading-relaxed"
            />
          </div>

          <button
            onClick={generate}
            disabled={!patientName.trim() || !labValues.trim() || loading}
            className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-semibold text-sm transition-colors"
          >
            {loading ? "Generating…" : "Generate Patient-Friendly Summary"}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-white">{patientName}{patientAge ? `, ${patientAge} yo` : ""}</p>
              <p className="text-xs text-gray-500 mt-0.5">{visitContext || "Lab Review"} · {new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { reset(); }}
                className="px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
              >
                🖨 Print / Save PDF
              </button>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="prose prose-sm max-w-none">
              {output.split("\n").map((line, i) => {
                if (line.startsWith("## ")) {
                  return <h2 key={i} className="text-base font-bold text-gray-800 mt-5 mb-2 first:mt-0">{line.slice(3)}</h2>;
                }
                if (line.startsWith("- ") || line.startsWith("• ")) {
                  return <p key={i} className="text-sm text-gray-700 ml-3 mb-1 flex gap-2"><span className="text-teal-500 flex-shrink-0">•</span>{line.slice(2)}</p>;
                }
                if (/^\d+\./.test(line)) {
                  return <p key={i} className="text-sm text-gray-700 ml-3 mb-1">{line}</p>;
                }
                if (line.trim() === "") return <div key={i} className="h-2" />;
                return <p key={i} className="text-sm text-gray-700 mb-1 leading-relaxed">{line}</p>;
              })}
              {loading && <span className="inline-block w-2 h-4 bg-teal-500 animate-pulse ml-1 rounded-sm" />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function LabReviewTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);

  const review = sampleLabReviews.find(r => r.patientId === selected);
  const patient = review ? samplePatients.find(p => p.id === review.patientId) : null;

  if (showNew) {
    return <NewLabReviewForm onBack={() => setShowNew(false)} />;
  }

  if (review && patient) {
    return (
      <div className="flex flex-col min-h-full">
        {/* Controls bar */}
        <div className="no-print flex items-center justify-between px-5 py-3 bg-gray-950 border-b border-gray-800 flex-shrink-0">
          <button
            onClick={() => setSelected(null)}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            ← Lab Reviews
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">{patient.name} · {review.date}</span>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
            >
              🖨 Print / Save PDF
            </button>
          </div>
        </div>
        {/* Card */}
        <div className="flex-1 overflow-auto">
          <PrintableCard review={review} patient={patient} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Lab Review Generator</h1>
        <p className="text-sm text-gray-400 mt-0.5">Generate patient-friendly lab result summaries — printable &amp; shareable</p>
      </div>

      <div className="space-y-3">
        {sampleLabReviews.map(rev => {
          const pat = samplePatients.find(p => p.id === rev.patientId);
          if (!pat) return null;
          const anomalies = rev.categories.flatMap(c => c.results).filter(r => r.status !== "optimal" && r.status !== "normal").length;
          return (
            <button
              key={rev.patientId}
              onClick={() => setSelected(rev.patientId)}
              className="w-full text-left p-4 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-blue-500/50 hover:bg-blue-600/5 transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-900/30 border border-blue-700/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-xl">🧪</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white">{pat.name}</p>
                  <p className="text-sm text-gray-400 truncate">{rev.visitContext}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(rev.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    {anomalies > 0 && <span className="ml-2 text-amber-500">· {anomalies} value{anomalies > 1 ? "s" : ""} flagged</span>}
                  </p>
                </div>
                <span className="text-blue-400 group-hover:text-blue-300 transition-colors text-lg flex-shrink-0">→</span>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={() => setShowNew(true)}
        className="mt-6 w-full p-4 rounded-xl border border-dashed border-gray-700 bg-gray-900/30 hover:border-teal-500/50 hover:bg-teal-600/5 transition-all text-center group"
      >
        <p className="text-sm text-gray-400 group-hover:text-teal-300 transition-colors">+ New Lab Review</p>
        <p className="text-xs text-gray-700 mt-1">Enter patient labs to generate a custom patient-friendly summary</p>
      </button>
    </div>
  );
}
