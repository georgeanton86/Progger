"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { calcAge } from "@/lib/utils";

export default function ProtectiveBriefingPage() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [briefing, setBriefing] = useState("");
  const [loading, setLoading] = useState(false);

  const patient = samplePatients.find(p => p.id === selectedId)!;

  async function generateBriefing() {
    setLoading(true);
    setBriefing("");
    const context = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calcAge(patient.dob)}, Sex: ${patient.sex}
Insurance: ${patient.insurance}
Primary Dx: ${patient.primaryDx}
Medications: ${patient.medications.map(m => m.name).join(", ")}
Allergies: ${patient.allergies.join(", ") || "NKDA"}`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Generate a Provider Protective Briefing focused on patient satisfaction and risk mitigation. Include:
1. Patient satisfaction risk factors to watch for
2. Communication strategies for this patient profile
3. Documentation best practices for liability protection
4. Potential complaint triggers and how to address them proactively
5. Key phrases and language recommendations for this visit`,
        context,
      }),
    });
    const data = await res.json();
    setBriefing(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Protective Briefing</h1>
      <p className="text-gray-400 text-sm mb-6">Provider briefing focused on patient satisfaction &amp; risk mitigation</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Select Patient</h2>
          <div className="space-y-2">
            {samplePatients.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setBriefing(""); }}
                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                  selectedId === p.id ? "bg-blue-600/20 border border-blue-500 text-blue-400" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                }`}
              >
                <p className="font-medium">{p.firstName} {p.lastName}</p>
                <p className="text-xs text-gray-500 mt-0.5">{p.insurance}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-medium text-white">Briefing for {patient.firstName} {patient.lastName}</h2>
            <button
              onClick={generateBriefing}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Generating..." : "Generate Briefing"}
            </button>
          </div>

          {briefing ? (
            <div className="bg-gray-800 rounded-lg p-4">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{briefing}</pre>
            </div>
          ) : (
            <div className="space-y-3">
              {["Patient Satisfaction Risk", "Communication Strategy", "Documentation Tips", "Liability Flags"].map(category => (
                <div key={category} className="p-3 bg-gray-800 rounded-lg">
                  <p className="text-xs font-medium text-gray-500">{category}</p>
                  <div className="h-4 bg-gray-700 rounded mt-2 animate-pulse"></div>
                </div>
              ))}
              <p className="text-sm text-gray-500 text-center pt-2">Click &quot;Generate Briefing&quot; to load AI analysis</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
