"use client";
import { useState } from "react";
import { samplePatients, sampleAppointments } from "@/lib/sampleData";
import { cn } from "@/lib/utils";
import type { ProviderBriefing } from "@/lib/types";

export function ProtectiveBriefingTab() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [briefing, setBriefing] = useState<ProviderBriefing | null>(null);
  const [raw, setRaw] = useState("");
  const [loading, setLoading] = useState(false);

  const patient = samplePatients.find(p => p.id === selectedId)!;
  const apt = sampleAppointments.find(a => a.patientId === selectedId)!;

  async function generate() {
    setLoading(true);
    setBriefing(null);
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Generate a Provider Protective Briefing as JSON with these exact keys: satisfactionTips (array), conversationStarters (array), keyTalkingPoints (array), patientConcerns (array), redFlags (array), quickWins (array), culturalConsiderations (array). Each array should have 3-5 items. Return ONLY valid JSON, no other text.`,
        context: `Patient: ${patient.name}, Age: ${patient.age}, Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Chief Complaint: ${patient.primaryComplaint}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Value Score: ${patient.valueScore} | Payment Reliability: ${patient.paymentReliability}% | No-Show Rate: ${patient.noShowRate}%`,
      }),
    });
    const data = await res.json();
    setRaw(data.reply || "");
    try {
      const json = JSON.parse((data.reply || "").replace(/```json\n?|\n?```/g, "").trim());
      setBriefing(json);
    } catch {
      setBriefing(null);
    }
    setLoading(false);
  }

  const sections: { key: keyof ProviderBriefing; label: string; color: string }[] = [
    { key: "satisfactionTips", label: "Satisfaction Tips", color: "text-blue-400" },
    { key: "conversationStarters", label: "Conversation Starters", color: "text-green-400" },
    { key: "keyTalkingPoints", label: "Key Talking Points", color: "text-purple-400" },
    { key: "patientConcerns", label: "Patient Concerns", color: "text-yellow-400" },
    { key: "redFlags", label: "Red Flags", color: "text-red-400" },
    { key: "quickWins", label: "Quick Wins", color: "text-emerald-400" },
    { key: "culturalConsiderations", label: "Cultural Considerations", color: "text-pink-400" },
  ];

  return (
    <div className="flex h-full">
      <div className="w-72 border-r border-gray-800 flex flex-col bg-gray-900/50">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white text-sm">Protective Briefing</h2>
          <p className="text-xs text-gray-400 mt-0.5">Patient satisfaction &amp; risk mitigation</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {samplePatients.map(p => (
            <button key={p.id} onClick={() => { setSelectedId(p.id); setBriefing(null); }} className={cn("w-full text-left p-3 rounded-lg border transition-colors", selectedId === p.id ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600")}>
              <p className="text-sm font-medium text-white">{p.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.insuranceProvider} · Score {p.valueScore}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        <div className="max-w-3xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-white">{patient.name}</h2>
                <p className="text-gray-400 text-sm">{patient.primaryComplaint} · {patient.insuranceProvider}</p>
              </div>
              <button onClick={generate} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {loading ? "Generating..." : "Generate Briefing"}
              </button>
            </div>
          </div>

          {briefing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map(({ key, label, color }) => (
                <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                  <h3 className={cn("text-sm font-semibold mb-2", color)}>{label}</h3>
                  <ul className="space-y-1.5">
                    {(briefing[key] as string[]).map((item, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className={cn("mt-0.5 flex-shrink-0", color)}>•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : raw ? (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{raw}</pre>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {sections.map(({ label }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse">
                  <div className="h-3 bg-gray-700 rounded w-1/2 mb-3"></div>
                  <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-2 bg-gray-800 rounded"></div>)}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
