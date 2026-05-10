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
      "Generate a comprehensive, patient-centered care plan with: specific clinical goals with measurable outcomes, evidence-based interventions citing AHA/ADA/USPSTF guidelines, monitoring parameters and lab targets, patient education points, medication optimization review, follow-up schedule, and referral recommendations. Be specific and actionable.",
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
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
            {output}
            {loading && <span className="inline-block w-0.5 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />}
          </pre>
        </div>
      )}
    </div>
  );
}
