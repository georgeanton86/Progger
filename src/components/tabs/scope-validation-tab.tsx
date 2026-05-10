"use client";
import { useState } from "react";
import { sampleScopeAlerts } from "@/lib/sampleData";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import { cn } from "@/lib/utils";

type RiskLevel = "moderate risk" | "high risk" | "critical risk";
type ApprovalStatus = "approved" | "requires training" | "not approved";

type ProcedureCard = {
  cpt: string;
  name: string;
  description: string;
  risk: RiskLevel;
  status: ApprovalStatus;
  malpracticeRisk: number;
  compliance: number;
  warning?: boolean;
};

const procedureDatabase: ProcedureCard[] = [
  {
    cpt: "93458",
    name: "Left Heart Catheterization",
    description: "Diagnostic catheterization of left ventricle and coronary arteries",
    risk: "moderate risk",
    status: "approved",
    malpracticeRisk: 15,
    compliance: 92,
  },
  {
    cpt: "92928",
    name: "Percutaneous Coronary Intervention (PCI)",
    description: "Balloon angioplasty and stent placement in coronary arteries",
    risk: "high risk",
    status: "approved",
    malpracticeRisk: 35,
    compliance: 88,
    warning: true,
  },
  {
    cpt: "92944",
    name: "Percutaneous Revascularization of CTO",
    description: "Chronic total occlusion PCI — complex intervention requiring advanced training",
    risk: "critical risk",
    status: "requires training",
    malpracticeRisk: 65,
    compliance: 75,
    warning: true,
  },
  {
    cpt: "99213",
    name: "Office Visit - Low Complexity",
    description: "Established patient outpatient visit, low medical decision making",
    risk: "moderate risk",
    status: "approved",
    malpracticeRisk: 5,
    compliance: 99,
  },
  {
    cpt: "93000",
    name: "12-Lead Electrocardiogram",
    description: "Standard 12-lead ECG with interpretation and report",
    risk: "moderate risk",
    status: "approved",
    malpracticeRisk: 3,
    compliance: 99,
  },
  {
    cpt: "43239",
    name: "Upper GI Endoscopy with Biopsy",
    description: "Esophagogastroduodenoscopy with directed biopsy",
    risk: "moderate risk",
    status: "approved",
    malpracticeRisk: 12,
    compliance: 94,
  },
  {
    cpt: "27447",
    name: "Total Knee Arthroplasty",
    description: "Primary total knee replacement with implant",
    risk: "high risk",
    status: "approved",
    malpracticeRisk: 28,
    compliance: 90,
    warning: true,
  },
  {
    cpt: "61510",
    name: "Craniotomy for Neoplasm",
    description: "Craniotomy for excision of brain tumor, supratentorial",
    risk: "critical risk",
    status: "requires training",
    malpracticeRisk: 58,
    compliance: 80,
    warning: true,
  },
  {
    cpt: "58150",
    name: "Total Abdominal Hysterectomy",
    description: "Total abdominal hysterectomy with or without removal of tube(s)",
    risk: "high risk",
    status: "approved",
    malpracticeRisk: 22,
    compliance: 91,
    warning: true,
  },
  {
    cpt: "70553",
    name: "MRI Brain with Contrast",
    description: "MRI of brain with contrast material, with and without contrast",
    risk: "moderate risk",
    status: "approved",
    malpracticeRisk: 8,
    compliance: 96,
  },
];

const riskColors: Record<RiskLevel, { bg: string; text: string; border: string }> = {
  "moderate risk": { bg: "bg-yellow-900/30", text: "text-yellow-400", border: "border-yellow-700/40" },
  "high risk": { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-700/40" },
  "critical risk": { bg: "bg-red-900/40", text: "text-red-300", border: "border-red-600/60" },
};

const statusColors: Record<ApprovalStatus, { bg: string; text: string; border: string }> = {
  "approved": { bg: "bg-green-900/30", text: "text-green-400", border: "border-green-700/40" },
  "requires training": { bg: "bg-orange-900/30", text: "text-orange-400", border: "border-orange-700/40" },
  "not approved": { bg: "bg-red-900/30", text: "text-red-400", border: "border-red-700/40" },
};

const tabIds = ["search", "validation", "briefing", "compliance"] as const;
type TabId = typeof tabIds[number];
const tabLabels: Record<TabId, string> = {
  search: "Procedure Search",
  validation: "Legal Validation",
  briefing: "Protective Briefing",
  compliance: "Compliance Monitor",
};

export function ScopeValidationTab() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [input, setInput] = useState("");
  const { output, loading, run, reset } = useStreamingAI();

  const filtered = procedureDatabase.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.cpt.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  function validate() {
    if (!input.trim()) return;
    run(`Evaluate this clinical scenario for scope of practice compliance. Provide:
1. Verdict: Within Scope / Caution / Outside Scope
2. Risk Level: Low / Medium / High
3. Regulatory Analysis (state-specific, especially California)
4. Legal Compliance notes and relevant statutes
5. Specific Recommendations
6. Documentation requirements to protect the provider

Scenario: ${input}`);
  }

  return (
    <div className="p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡</span>
          <h1 className="text-2xl font-bold text-white">Advanced Scope Validation System</h1>
        </div>
        <p className="text-gray-400 text-sm ml-11">AI-powered legal guard and procedure authorization</p>
      </div>

      {/* Tab Pills */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabIds.map(tid => (
          <button
            key={tid}
            onClick={() => setActiveTab(tid)}
            className={cn(
              "px-4 py-2 rounded-full text-sm font-medium transition-colors",
              activeTab === tid ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
            )}
          >
            {tabLabels[tid]}
          </button>
        ))}
      </div>

      {/* Procedure Search Tab */}
      {activeTab === "search" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-semibold text-white mb-1">Procedure Authorization Database</h2>
              <p className="text-xs text-gray-400 mb-4">Search and validate procedures against your current scope of practice</p>

              <div className="relative mb-5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by procedure code, name, or description..."
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-sm text-gray-300 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 placeholder-gray-500"
                />
              </div>

              <div className="space-y-3">
                {filtered.map(proc => {
                  const rc = riskColors[proc.risk];
                  const sc = statusColors[proc.status];
                  return (
                    <div key={proc.cpt} className="bg-gray-800 rounded-xl p-4 border border-gray-700/50">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-mono text-gray-400 bg-gray-700 px-2 py-0.5 rounded">CPT {proc.cpt}</span>
                            <span className="font-semibold text-white text-sm">
                              {proc.warning && <span className="text-amber-400 mr-1">⚠</span>}
                              {proc.name}
                            </span>
                          </div>
                          <p className="text-xs text-gray-400">{proc.description}</p>
                        </div>
                        <div className="flex flex-col gap-1.5 flex-shrink-0">
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium", rc.bg, rc.text, rc.border)}>
                            {proc.risk}
                          </span>
                          <span className={cn("text-xs px-2 py-0.5 rounded-full border font-medium text-center", sc.bg, sc.text, sc.border)}>
                            {proc.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-xs text-gray-500">
                        <span>Malpractice Risk: <span className={cn("font-semibold", proc.malpracticeRisk >= 50 ? "text-red-400" : proc.malpracticeRisk >= 25 ? "text-amber-400" : "text-green-400")}>{proc.malpracticeRisk}%</span></span>
                        <span>Compliance: <span className={cn("font-semibold", proc.compliance >= 90 ? "text-green-400" : proc.compliance >= 80 ? "text-amber-400" : "text-red-400")}>{proc.compliance}%</span></span>
                      </div>
                    </div>
                  );
                })}
                {filtered.length === 0 && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    No procedures found matching &quot;{searchQuery}&quot;
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Scope Alerts Sidebar */}
          <div className="space-y-4">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-medium text-white mb-3">Active Scope Alerts</h2>
              <div className="space-y-2">
                {sampleScopeAlerts.map(alert => (
                  <div key={alert.id} className="p-3 bg-gray-800 rounded-xl">
                    <div className="flex justify-between items-start mb-1">
                      <p className="text-xs font-medium text-white">{alert.procedure}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", alert.riskLevel === "high" ? "bg-red-900/40 text-red-400" : alert.riskLevel === "medium" ? "bg-yellow-900/40 text-yellow-400" : "bg-green-900/40 text-green-400")}>
                        {alert.riskLevel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{alert.recommendation}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-medium text-white mb-2">Scope Summary</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Procedures</span>
                  <span className="text-white font-medium">{procedureDatabase.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Approved</span>
                  <span className="text-green-400 font-medium">{procedureDatabase.filter(p => p.status === "approved").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Requires Training</span>
                  <span className="text-orange-400 font-medium">{procedureDatabase.filter(p => p.status === "requires training").length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">High/Critical Risk</span>
                  <span className="text-red-400 font-medium">{procedureDatabase.filter(p => p.risk === "high risk" || p.risk === "critical risk").length}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Legal Validation Tab */}
      {activeTab === "validation" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h2 className="font-medium text-white mb-3">AI Scope Validation</h2>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none mb-3"
                placeholder="Describe the clinical scenario to validate..."
              />
              <button
                onClick={validate}
                disabled={loading || !input.trim()}
                className="px-5 py-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors flex items-center gap-2"
              >
                {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {loading ? "Validating..." : "Validate Scope"}
              </button>
            </div>

            {(output || loading) && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h2 className="font-medium text-white mb-3">Analysis Result</h2>
                <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
                  {output}
                  {loading && <span className="inline-block w-0.5 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />}
                </pre>
              </div>
            )}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-medium text-white mb-3">Active Alerts</h2>
            <div className="space-y-2">
              {sampleScopeAlerts.map(alert => (
                <div key={alert.id} className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-xs font-medium text-white">{alert.procedure}</p>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded", alert.riskLevel === "high" ? "bg-red-900/40 text-red-400" : alert.riskLevel === "medium" ? "bg-yellow-900/40 text-yellow-400" : "bg-green-900/40 text-green-400")}>
                      {alert.riskLevel}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{alert.recommendation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === "briefing" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Protective Briefing for scope-related legal risks. Switch to the main Protective Briefing tab for full legal guard functionality.</p>
        </div>
      )}

      {activeTab === "compliance" && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center">
          <p className="text-gray-400">Compliance Monitor tracks regulatory changes and compliance deadlines relevant to your scope of practice and specialty.</p>
        </div>
      )}
    </div>
  );
}
