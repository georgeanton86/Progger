"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import { cn } from "@/lib/utils";
import type { ProviderBriefing } from "@/lib/types";

type AlertPriority = "HIGH" | "MEDIUM" | "LOW";
type AlertCategory = "Insurance" | "Regulatory" | "Documentation" | "Education";

type LegalAlert = {
  id: string;
  priority: AlertPriority;
  category: AlertCategory;
  title: string;
  description: string;
  recommendedAction: string;
  timestamp: string;
  handled: boolean;
};

const initialAlerts: LegalAlert[] = [
  {
    id: "la1",
    priority: "HIGH",
    category: "Insurance",
    title: "Malpractice Insurance Renewal Due",
    description: "Your current malpractice insurance policy expires in 314 days. It is recommended to review coverage limits and begin renewal process early to avoid lapses. Current coverage may not reflect recent scope changes.",
    recommendedAction: "Contact your insurance broker to review current coverage limits and begin renewal process. Consider tail coverage options.",
    timestamp: "Today, 8:00 AM",
    handled: false,
  },
  {
    id: "la2",
    priority: "MEDIUM",
    category: "Regulatory",
    title: "CMS Prior Authorization Changes",
    description: "New CMS prior authorization requirements for cardiovascular procedures are effective September 2025. Percutaneous coronary interventions and structural heart procedures will require pre-authorization for Medicare Advantage patients.",
    recommendedAction: "Review updated CMS guidelines and update your office workflow for prior authorization submissions. Train staff on new requirements.",
    timestamp: "Today, 6:30 AM",
    handled: false,
  },
  {
    id: "la3",
    priority: "MEDIUM",
    category: "Documentation",
    title: "Enhanced Documentation Protocol",
    description: "Recent audit trends show increased high-risk procedure documentation reviews. Your practice has shown a 12% increase in high-risk procedure volume this quarter, triggering enhanced consent documentation requirements.",
    recommendedAction: "Implement enhanced informed consent documentation for all procedures rated as moderate or high risk. Use standardized forms.",
    timestamp: "Yesterday, 4:15 PM",
    handled: false,
  },
  {
    id: "la4",
    priority: "LOW",
    category: "Education",
    title: "CME Credits Progress",
    description: "You have completed 22 of 50 required CME credits for the current license cycle. 28 credits remaining with 8 months until your license renewal deadline. Current pace may require acceleration.",
    recommendedAction: "Schedule remaining CME activities. Consider online CME platforms for convenience. Focus on mandatory topic areas first.",
    timestamp: "Yesterday, 9:00 AM",
    handled: false,
  },
];

const tabIds = ["briefing", "risk", "legal", "consultation"] as const;
type TabId = typeof tabIds[number];
const tabLabels: Record<TabId, string> = {
  briefing: "Daily Briefing",
  risk: "Risk Scenarios",
  legal: "Legal Intelligence",
  consultation: "Expert Consultation",
};

const priorityColors: Record<AlertPriority, { bg: string; text: string; border: string }> = {
  HIGH: { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-700/40" },
  MEDIUM: { bg: "bg-amber-900/30", text: "text-amber-400", border: "border-amber-700/40" },
  LOW: { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-700/40" },
};

const categoryColors: Record<AlertCategory, string> = {
  Insurance: "bg-teal-900/40 text-teal-400",
  Regulatory: "bg-purple-900/40 text-purple-400",
  Documentation: "bg-orange-900/40 text-orange-400",
  Education: "bg-teal-900/40 text-teal-400",
};

export function ProtectiveBriefingTab() {
  const [activeTab, setActiveTab] = useState<TabId>("briefing");
  const [alerts, setAlerts] = useState<LegalAlert[]>(initialAlerts);
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [briefing, setBriefing] = useState<ProviderBriefing | null>(null);
  const { output, loading, run, reset } = useStreamingAI();
  const patient = samplePatients.find(p => p.id === selectedId)!;

  function markHandled(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, handled: true } : a));
  }

  async function generate() {
    setBriefing(null);
    await run(
      `Generate a Provider Protective Briefing as JSON with these exact keys: satisfactionTips (array), conversationStarters (array), keyTalkingPoints (array), patientConcerns (array), redFlags (array), quickWins (array), culturalConsiderations (array). Each array should have 3-5 specific, actionable items relevant to this patient. Return ONLY valid JSON, no other text.`,
      `Patient: ${patient.name}, Age: ${patient.age}, Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Chief Complaint: ${patient.primaryComplaint}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Value Score: ${patient.valueScore} | Payment Reliability: ${patient.paymentReliability}% | No-Show Rate: ${patient.noShowRate}%`
    );
  }

  const parsed = (() => {
    if (loading || !output) return null;
    try { return JSON.parse(output.replace(/```json\n?|\n?```/g, "").trim()) as ProviderBriefing; }
    catch { return null; }
  })();

  const briefingSections: { key: keyof ProviderBriefing; label: string; color: string }[] = [
    { key: "satisfactionTips", label: "Satisfaction Tips", color: "text-teal-400" },
    { key: "conversationStarters", label: "Conversation Starters", color: "text-green-400" },
    { key: "keyTalkingPoints", label: "Key Talking Points", color: "text-purple-400" },
    { key: "patientConcerns", label: "Patient Concerns", color: "text-yellow-400" },
    { key: "redFlags", label: "Red Flags", color: "text-red-400" },
    { key: "quickWins", label: "Quick Wins", color: "text-emerald-400" },
    { key: "culturalConsiderations", label: "Cultural Considerations", color: "text-pink-400" },
  ];

  const unhandledCount = alerts.filter(a => !a.handled && a.priority === "HIGH").length;

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡</span>
          <h1 className="text-2xl font-bold text-white">Legal Guard Protective Briefing</h1>
        </div>
        <p className="text-gray-400 text-sm ml-11">Real-time legal intelligence and risk management system</p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-2">Protection Score</p>
          <p className="text-2xl font-bold text-teal-400 mb-2">87%</p>
          <div className="w-full bg-gray-700 rounded-full h-1.5">
            <div className="bg-teal-500 h-1.5 rounded-full" style={{ width: "87%" }} />
          </div>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Active Monitors</p>
          <p className="text-2xl font-bold text-teal-400">12</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">High Priority</p>
          <p className="text-2xl font-bold text-amber-400">1</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">Monitoring</p>
          <p className="text-2xl font-bold text-purple-400">24/7</p>
        </div>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabIds.map(tid => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === tid ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
          >
            {tabLabels[tid]}
            {tid === "briefing" && unhandledCount > 0 && (
              <span className="ml-1 text-xs bg-red-500 text-white px-1.5 py-0.5 rounded-full font-bold">{unhandledCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* Daily Briefing Tab */}
      {activeTab === "briefing" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <h2 className="font-semibold text-white">Today&apos;s Legal Guard Briefing</h2>
            {alerts.map(alert => {
              const pc = priorityColors[alert.priority];
              return (
                <div key={alert.id} className={cn("bg-gray-900 border rounded-xl p-4", alert.handled ? "opacity-50" : "border-gray-800")}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={cn("text-xs font-bold px-2 py-0.5 rounded border", pc.bg, pc.text, pc.border)}>
                          {alert.priority}
                        </span>
                        <span className={cn("text-xs px-2 py-0.5 rounded font-medium", categoryColors[alert.category])}>
                          {alert.category}
                        </span>
                      </div>
                      <h3 className="font-semibold text-white mb-1">{alert.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{alert.description}</p>
                      <div className="flex items-start gap-1.5 text-sm">
                        <span className="text-teal-400 font-medium flex-shrink-0">Recommended Action:</span>
                        <span className="text-teal-300">{alert.recommendedAction}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <p className="text-xs text-gray-500">{alert.timestamp}</p>
                      {!alert.handled && (
                        <button
                          onClick={() => markHandled(alert.id)}
                          className="text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg border border-gray-700 transition-colors"
                        >
                          Mark Handled
                        </button>
                      )}
                      {alert.handled && (
                        <span className="text-xs text-green-400 font-medium">✓ Handled</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Patient-specific briefing sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h3 className="font-semibold text-white text-sm mb-3">Patient-Specific Briefing</h3>
              <div className="space-y-2 mb-3">
                {samplePatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id); setBriefing(null); reset(); }}
                    className={cn("w-full text-left p-2.5 rounded-lg border transition-colors text-sm", selectedId === p.id ? "border-teal-500 bg-teal-600/10 text-white" : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-white")}
                  >
                    {p.name}
                    <span className="text-xs text-gray-500 ml-1">· Score {p.valueScore}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Generating..." : "Generate AI Briefing"}
              </button>
            </div>

            {loading && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-2">Generating briefing...</p>
                <pre className="text-xs text-gray-600 font-mono max-h-32 overflow-hidden">{output}</pre>
              </div>
            )}

            {parsed && (
              <div className="space-y-3">
                {briefingSections.slice(0, 3).map(({ key, label, color }) => (
                  <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <h4 className={cn("text-xs font-semibold mb-1.5", color)}>{label}</h4>
                    <ul className="space-y-1">
                      {(parsed[key] as string[]).slice(0, 2).map((item, i) => (
                        <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                          <span className={cn("flex-shrink-0 mt-0.5", color)}>•</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "risk" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Risk Scenarios analysis coming soon. This section provides AI-powered risk scenario modeling based on your practice patterns.</p>
        </div>
      )}

      {activeTab === "legal" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Legal Intelligence feed is updated in real-time with jurisdiction-specific regulatory changes and case law updates relevant to your specialty.</p>
        </div>
      )}

      {activeTab === "consultation" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Expert Consultation connects you with healthcare attorneys and compliance specialists for urgent legal guidance.</p>
        </div>
      )}
    </div>
  );
}
