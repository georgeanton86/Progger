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
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-800 bg-gray-900/50 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-sm">Care Planning</h2>
          <p className="text-xs text-gray-400 mt-0.5">AI-assisted individualized plans</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {samplePatients.map(p => (
            <button key={p.id} onClick={() => { setSelectedId(p.id); reset(); }} className={cn("w-full text-left p-3 rounded-lg border transition-colors", selectedId === p.id ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600")}>
              <p className="text-sm font-medium text-white">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.medicalHistory[0] || "No history"}</p>
              {p.medicalHistory.length > 1 && <p className="text-xs text-gray-600">+{p.medicalHistory.length - 1} more</p>}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-4">
            <h2 className="font-semibold text-white mb-0.5">{patient.name}</h2>
            <p className="text-sm text-gray-400 mb-1">{patient.medicalHistory.join(", ")}</p>
            <p className="text-xs text-gray-600 mb-3">{patient.medications.join(", ")}</p>
            <label className="text-xs text-gray-400 block mb-1">Provider Goals / Special Considerations</label>
            <textarea value={goals} onChange={e => setGoals(e.target.value)} rows={2} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3" placeholder="e.g. focus on weight reduction, patient prefers non-pharmacologic approaches..." />
            <button onClick={generate} disabled={loading} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
              {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {loading ? "Generating..." : "Generate Care Plan"}
            </button>
          </div>
          {(output || loading) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{output}{loading && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
