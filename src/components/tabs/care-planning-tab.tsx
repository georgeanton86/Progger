"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import { cn } from "@/lib/utils";

export function CarePlanningTab() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [goals, setGoals] = useState("");
  const { output, loading, run, reset } = useStreamingAI();
  const patient = samplePatients.find(p => p.id === selectedId)!;

  function generate() {
    run(
      `Generate a comprehensive, patient-centered care plan formatted as a readable clinical document. Use plain text with clear section headers (no JSON, no code blocks). Structure it with these sections:

## Clinical Goals
(3-5 specific measurable goals with target values)

## Evidence-Based Interventions
(cite AHA/ADA/USPSTF/UpToDate; list specific interventions by category)

## Medication Optimization
(review current meds, dose adjustments, new recommendations with rationale)

## Monitoring & Lab Targets
(specific lab values to track, frequency, target ranges)

## Patient Education
(key teaching points tailored to this patient)

## Follow-Up Schedule
(specific timeframes and triggers for return visits)

## Referrals & Consultations
(who, why, urgency)

Be specific, actionable, and cite evidence for each recommendation.`,
      `Patient: ${patient.name}, Age: ${patient.age}, Insurance: ${patient.insuranceProvider}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Provider goals: ${goals || "Standard evidence-based management"}`
    );
  }

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-5">
        <h2 className="font-bold text-white text-lg">Care Planning</h2>
        <p className="text-xs text-gray-400 mt-0.5">AI-assisted individualized care plans · Evidence-based</p>
      </div>

      {/* Patient selector — horizontal pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {samplePatients.map(p => (
          <button
            key={p.id}
            onClick={() => { setSelectedId(p.id); reset(); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedId === p.id
                ? "border-teal-500 bg-teal-600/15 text-teal-300"
                : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-white"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
        <div className="mb-3">
          <h3 className="font-semibold text-white">{patient.name}</h3>
          <p className="text-sm text-gray-400 mt-0.5">{patient.medicalHistory.join(", ")}</p>
          <p className="text-xs text-gray-600 mt-0.5">{patient.medications.join(", ")}</p>
        </div>
        <label className="text-xs text-gray-400 block mb-1">Provider Goals / Special Considerations</label>
        <textarea
          value={goals}
          onChange={e => setGoals(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-3"
          placeholder="e.g. focus on weight reduction, patient prefers non-pharmacologic approaches..."
        />
        <button
          onClick={generate}
          disabled={loading}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? "Generating..." : "Generate Care Plan"}
        </button>
      </div>

      {(output || loading) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-0">
          {output.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return <h3 key={i} className="text-teal-400 font-semibold text-sm mt-4 mb-1.5 first:mt-0">{line.replace("## ", "")}</h3>;
            }
            if (line.startsWith("# ")) {
              return <h2 key={i} className="text-white font-bold text-base mt-3 mb-2 first:mt-0">{line.replace("# ", "")}</h2>;
            }
            if (line.match(/^[\-\*] /)) {
              return <p key={i} className="text-sm text-gray-300 leading-relaxed pl-3 flex gap-2"><span className="text-teal-500 flex-shrink-0">•</span><span>{line.replace(/^[\-\*] /, "")}</span></p>;
            }
            if (line.trim() === "") return <div key={i} className="h-1" />;
            return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
          })}
          {loading && <span className="inline-block w-0.5 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />}
        </div>
      )}
    </div>
  );
}
