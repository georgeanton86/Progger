"use client";
import { useState } from "react";
import { samplePatients, sampleProvider } from "@/lib/sampleData";
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

// ─── Risk Scenarios Sub-tab ─────────────────────────────────────────────────

const riskScenarios = [
  { id: "r1", category: "Documentation", risk: "Incomplete informed consent", likelihood: "High", impact: "Critical", mitigation: "Use standardized consent forms for all procedures rated moderate or high risk. Document patient verbalized understanding." },
  { id: "r2", category: "Prescribing", risk: "Controlled substance over-prescribing", likelihood: "Medium", impact: "High", mitigation: "Run PDMP check for every controlled substance. Document pain scores, functional assessment, and risk stratification." },
  { id: "r3", category: "Referral", risk: "Delayed specialist referral for red-flag symptoms", likelihood: "Medium", impact: "Critical", mitigation: "Set visit-level triggers for same-day referral. Document referral placed, patient notified, and follow-up confirmed." },
  { id: "r4", category: "Billing", risk: "E&M upcoding without MDM documentation", likelihood: "High", impact: "High", mitigation: "Document all three MDM pillars: problems addressed, data reviewed, and risk of complications. Use structured templates." },
  { id: "r5", category: "Medication", risk: "Drug-drug interaction with high-risk combinations", likelihood: "Low", impact: "Critical", mitigation: "Enable EHR interaction alerts for CYP450 interactions. Review full medication list at every visit." },
];

const likelihoodColors: Record<string, string> = {
  High: "text-red-400 bg-red-900/20 border-red-800/40",
  Medium: "text-amber-400 bg-amber-900/20 border-amber-800/40",
  Low: "text-green-400 bg-green-900/20 border-green-800/40",
};

const impactColors: Record<string, string> = {
  Critical: "text-red-400",
  High: "text-amber-400",
  Medium: "text-yellow-400",
};

function RiskScenariosTab() {
  const [selected, setSelected] = useState<string | null>(null);
  const { output, loading, run } = useStreamingAI();

  function analyzeScenario(scenario: typeof riskScenarios[0]) {
    setSelected(scenario.id);
    run(
      `Provide a detailed risk analysis and mitigation protocol for this clinical risk scenario. Format as plain text with section headers (no JSON). Include: (1) Why this risk is significant for ${sampleProvider.specialty} in California, (2) Specific documentation language to use, (3) Step-by-step workflow to eliminate this risk, (4) Case law or regulatory basis (cite specific rules/cases), (5) Audit red flags to watch for.`,
      `Risk: ${scenario.risk}\nCategory: ${scenario.category}\nLikelihood: ${scenario.likelihood} | Impact: ${scenario.impact}\nInitial mitigation: ${scenario.mitigation}\nProvider: ${sampleProvider.specialty}, ${sampleProvider.state}`
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">AI-modeled risk scenarios based on your specialty and practice patterns. Click any scenario for a full mitigation protocol.</p>
      <div className="space-y-3">
        {riskScenarios.map(s => (
          <div key={s.id} className={cn("bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors hover:border-gray-600", selected === s.id ? "border-teal-600/50" : "border-gray-800")} onClick={() => analyzeScenario(s)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{s.category}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", likelihoodColors[s.likelihood])}>
                    {s.likelihood} likelihood
                  </span>
                  <span className={cn("text-xs font-medium", impactColors[s.impact])}>● {s.impact} impact</span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{s.risk}</h3>
                <p className="text-xs text-gray-400">{s.mitigation}</p>
              </div>
              <span className="text-gray-600 text-xs flex-shrink-0 mt-1">Analyze →</span>
            </div>
            {selected === s.id && (output || loading) && (
              <div className="mt-4 pt-4 border-t border-gray-800">
                {loading ? (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                    <span className="text-xs text-teal-400">Generating protocol...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {output.split("\n").map((line, i) => {
                      if (line.startsWith("## ") || line.match(/^\d+\./)) return <p key={i} className="text-teal-400 text-xs font-semibold mt-2">{line.replace("## ", "")}</p>;
                      if (line.trim() === "") return <div key={i} className="h-0.5" />;
                      return <p key={i} className="text-xs text-gray-300 leading-relaxed">{line}</p>;
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Legal Intelligence Sub-tab ──────────────────────────────────────────────

const legalUpdates = [
  { id: "l1", date: "May 2025", source: "CMS Final Rule", tag: "Billing", title: "E&M Documentation Reform — MDM Complexity Expansion", summary: "CMS finalized expanded MDM complexity criteria for 2025. Social determinants of health now count as a data point. Order review of records from external institutions qualifies as data analysis.", impact: "High" },
  { id: "l2", date: "Apr 2025", source: "CA AB-2204", tag: "Scope", title: "California Advanced Practice Provider Scope Expansion", summary: "NPs in California may now independently manage chronic conditions including controlled substance prescribing for maintenance therapy without physician supervision requirements.", impact: "Medium" },
  { id: "l3", date: "Mar 2025", source: "DEA", tag: "Prescribing", title: "Telehealth Controlled Substance Prescribing Extension", summary: "DEA extended the COVID-era telehealth controlled substance prescribing flexibilities through December 2025. In-person evaluation waiver still applies for Schedule III-V.", impact: "Medium" },
  { id: "l4", date: "Feb 2025", source: "OIG", tag: "Compliance", title: "Increased Scrutiny on Wellness Visit Upcoding", summary: "OIG announced targeted audits for practices billing AWV (G0439) with same-day E&M without -25 modifier. Ensure proper documentation and modifier usage.", impact: "High" },
];

const impactBadge: Record<string, string> = {
  High: "bg-red-900/30 text-red-400 border border-red-800/40",
  Medium: "bg-amber-900/30 text-amber-400 border border-amber-800/40",
};

function LegalIntelligenceTab() {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">Jurisdiction-specific regulatory changes and case law updates relevant to {sampleProvider.specialty} in {sampleProvider.state}.</p>
      <div className="space-y-3">
        {legalUpdates.map(u => (
          <div key={u.id} className={cn("bg-gray-900 border rounded-xl p-4 cursor-pointer transition-colors hover:border-gray-700", expanded === u.id ? "border-purple-700/50" : "border-gray-800")} onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="text-xs text-gray-500">{u.date}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-purple-900/30 text-purple-400">{u.source}</span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400">{u.tag}</span>
                  <span className={cn("text-xs px-2 py-0.5 rounded font-medium", impactBadge[u.impact])}>{u.impact} impact</span>
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{u.title}</h3>
                <p className="text-xs text-gray-400 leading-relaxed">{u.summary}</p>
              </div>
              <span className="text-gray-600 text-xs flex-shrink-0 mt-1">{expanded === u.id ? "▲" : "▼"}</span>
            </div>
            {expanded === u.id && (
              <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                <p className="text-xs font-semibold text-teal-400">Action Required for Your Practice:</p>
                {u.tag === "Billing" && <p className="text-xs text-gray-300">Review all E&M notes from the past 30 days. Ensure MDM documentation includes all three elements. Update your note templates to include social determinants screening results.</p>}
                {u.tag === "Scope" && <p className="text-xs text-gray-300">Update your supervision agreements and practice protocols. Notify malpractice carrier of scope changes. Review DEA registration for controlled substance authority.</p>}
                {u.tag === "Prescribing" && <p className="text-xs text-gray-300">Document telehealth visit type at time of prescribing. Ensure Schedule II prescriptions still require in-person evaluation. Audit PDMP compliance for all telehealth-initiated prescriptions.</p>}
                {u.tag === "Compliance" && <p className="text-xs text-gray-300">Audit all same-day AWV + E&M claims. Ensure -25 modifier is present and justified. Add compliance note to billing workflow for these code combinations.</p>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Expert Consultation Sub-tab ─────────────────────────────────────────────

const experts = [
  { name: "Healthcare Defense Attorney", specialty: "Medical malpractice defense, informed consent litigation", availability: "Available", responseTime: "4 hrs", icon: "⚖️" },
  { name: "Healthcare Compliance Officer", specialty: "HIPAA, OIG compliance, billing audits, RAC response", availability: "Available", responseTime: "2 hrs", icon: "📋" },
  { name: "Medical Board Liaison", specialty: "License defense, complaint response, scope of practice opinions", availability: "Busy", responseTime: "24 hrs", icon: "🏛" },
  { name: "Malpractice Insurance Specialist", specialty: "Coverage review, tail coverage, incident reporting", availability: "Available", responseTime: "1 hr", icon: "🛡" },
];

function ExpertConsultationTab() {
  const [scenario, setScenario] = useState("");
  const [sent, setSent] = useState(false);
  const { output, loading, run } = useStreamingAI();

  function getAIGuidance() {
    if (!scenario.trim()) return;
    run(
      `You are a healthcare attorney and compliance expert. Provide immediate practical legal guidance for this clinical scenario. Format as plain text with clear headers (no JSON). Include: (1) Immediate recommended actions in the next 24 hours, (2) Documentation to create or preserve, (3) Who to notify and in what order, (4) Legal exposure assessment, (5) Regulatory bodies that may be involved, (6) Timeline and statute of limitations to be aware of.`,
      `Clinical/Legal Scenario: ${scenario}\nProvider: ${sampleProvider.specialty}, ${sampleProvider.state}\nPractice type: ${sampleProvider.name}`
    );
  }

  return (
    <div className="space-y-5">
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-1">AI Legal Guidance</h3>
        <p className="text-xs text-gray-400 mb-3">Describe your situation for immediate AI-powered legal analysis before connecting with an expert.</p>
        <textarea
          value={scenario}
          onChange={e => setScenario(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-3"
          placeholder="Describe the clinical situation, incident, or compliance question..."
        />
        <button
          onClick={getAIGuidance}
          disabled={loading || !scenario.trim()}
          className="px-5 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
        >
          {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
          {loading ? "Analyzing..." : "Get AI Guidance"}
        </button>
        {output && !loading && (
          <div className="mt-4 pt-4 border-t border-gray-800 space-y-1">
            {output.split("\n").map((line, i) => {
              if (line.startsWith("## ") || line.match(/^\d+\./)) return <p key={i} className="text-teal-400 text-sm font-semibold mt-3">{line.replace("## ", "")}</p>;
              if (line.trim() === "") return <div key={i} className="h-1" />;
              return <p key={i} className="text-sm text-gray-300 leading-relaxed">{line}</p>;
            })}
          </div>
        )}
      </div>

      <div>
        <h3 className="font-semibold text-white mb-3 text-sm">Connect with an Expert</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {experts.map(e => (
            <div key={e.name} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{e.icon}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{e.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{e.specialty}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-2">
                  <span className={cn("w-1.5 h-1.5 rounded-full", e.availability === "Available" ? "bg-green-400" : "bg-amber-400")} />
                  <span className={cn("text-xs", e.availability === "Available" ? "text-green-400" : "text-amber-400")}>{e.availability}</span>
                  <span className="text-xs text-gray-500">· {e.responseTime} response</span>
                </div>
                <button
                  onClick={() => setSent(true)}
                  className="text-xs px-3 py-1.5 bg-teal-700/50 hover:bg-teal-600/60 text-teal-300 rounded-lg transition-colors"
                >
                  {sent ? "Requested ✓" : "Request"}
                </button>
              </div>
            </div>
          ))}
        </div>
        {sent && (
          <div className="mt-3 p-3 bg-green-900/20 border border-green-800/40 rounded-xl">
            <p className="text-sm text-green-400 font-medium">Consultation requested</p>
            <p className="text-xs text-gray-400 mt-0.5">You&apos;ll receive a secure message within the response time indicated. For urgent matters, call your malpractice carrier&apos;s 24/7 hotline directly.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-3 h-3 border-2 border-teal-400/30 border-t-teal-400 rounded-full animate-spin" />
                  <p className="text-xs text-teal-400 font-medium">Analyzing patient profile...</p>
                </div>
                {["Satisfaction Tips", "Talking Points", "Red Flags"].map(label => (
                  <div key={label}>
                    <div className="h-2.5 bg-gray-700/60 rounded w-24 mb-2 animate-pulse" />
                    <div className="space-y-1.5">
                      <div className="h-2 bg-gray-800/80 rounded w-full animate-pulse" />
                      <div className="h-2 bg-gray-800/80 rounded w-4/5 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {parsed && (
              <div className="space-y-3">
                {briefingSections.slice(0, 3).map(({ key, label, color }) => (
                  <div key={key} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                    <h4 className={cn("text-xs font-semibold mb-1.5", color)}>{label}</h4>
                    <ul className="space-y-1">
                      {((parsed[key] as string[] | undefined) ?? []).slice(0, 2).map((item, i) => (
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

      {activeTab === "risk" && <RiskScenariosTab />}
      {activeTab === "legal" && <LegalIntelligenceTab />}
      {activeTab === "consultation" && <ExpertConsultationTab />}
    </div>
  );
}
