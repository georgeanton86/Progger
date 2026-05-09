"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { calcAge } from "@/lib/utils";

export default function CarePlanningPage() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [carePlan, setCarePlan] = useState("");
  const [loading, setLoading] = useState(false);
  const [goals, setGoals] = useState("");

  const patient = samplePatients.find(p => p.id === selectedId)!;

  async function generateCarePlan() {
    setLoading(true);
    setCarePlan("");
    const context = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calcAge(patient.dob)}, Sex: ${patient.sex}
Primary Dx: ${patient.primaryDx}
Medications: ${patient.medications.map(m => `${m.name} ${m.dose}`).join(", ")}
Allergies: ${patient.allergies.join(", ") || "NKDA"}
Provider goals: ${goals || "Standard evidence-based management"}`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: "Generate a comprehensive, patient-centered care plan. Include: clinical goals, interventions, monitoring parameters, patient education points, follow-up schedule, and measurable outcomes.",
        context,
      }),
    });
    const data = await res.json();
    setCarePlan(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Care Planning</h1>
      <p className="text-gray-400 text-sm mb-6">AI-assisted individualized care plans</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Select Patient</h2>
          <div className="space-y-2">
            {samplePatients.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setCarePlan(""); }}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selectedId === p.id ? "bg-blue-600/20 border border-blue-500 text-blue-400" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <p className="font-medium">{p.firstName} {p.lastName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.primaryDx}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">
            Care Plan for {patient.firstName} {patient.lastName}
          </h2>
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-1">Provider Goals / Special Considerations</label>
            <textarea
              value={goals}
              onChange={e => setGoals(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="e.g. focus on weight reduction, patient prefers non-pharmacologic approaches..."
            />
          </div>
          <button
            onClick={generateCarePlan}
            disabled={loading}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors mb-4"
          >
            {loading ? "Generating..." : "Generate Care Plan"}
          </button>
          {carePlan && (
            <div className="bg-gray-800 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{carePlan}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
