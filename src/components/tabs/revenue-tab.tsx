"use client";
import { useState } from "react";
import { samplePatients, sampleRevenueOpportunities } from "@/lib/sampleData";
import { cn } from "@/lib/utils";

const categories = ["all", "preventive", "chronic", "diagnostic", "procedural", "transitional"];

const categoryColors: Record<string, string> = {
  preventive: "text-green-400 bg-green-900/20 border-green-800/40",
  chronic: "text-blue-400 bg-blue-900/20 border-blue-800/40",
  diagnostic: "text-purple-400 bg-purple-900/20 border-purple-800/40",
  procedural: "text-orange-400 bg-orange-900/20 border-orange-800/40",
  transitional: "text-yellow-400 bg-yellow-900/20 border-yellow-800/40",
};

const extendedOpportunities = [
  ...sampleRevenueOpportunities,
  { id: "r4", opportunityType: "Transitional Care Mgmt", description: "TCM for Sarah Chen post-ED visit", estimatedRevenue: "165.00", category: "transitional", status: "pending" },
  { id: "r5", opportunityType: "Diabetes Prevention", description: "DPP referral for Michael Rodriguez (prediabetes risk)", estimatedRevenue: "810.00", category: "preventive", status: "pending" },
  { id: "r6", opportunityType: "Remote Patient Monitoring", description: "RPM setup for David Wilson (COPD)", estimatedRevenue: "55.00", category: "chronic", status: "pending" },
];

export function RevenueTab() {
  const [activeCategory, setActiveCategory] = useState("all");
  const [forecast, setForecast] = useState("");
  const [loading, setLoading] = useState(false);
  const [actionedIds, setActionedIds] = useState<Set<string>>(new Set());

  const filtered = extendedOpportunities.filter(o => activeCategory === "all" || o.category === activeCategory);
  const totalPotential = extendedOpportunities.reduce((s, o) => s + parseFloat(o.estimatedRevenue), 0);
  const actionedTotal = extendedOpportunities.filter(o => actionedIds.has(o.id)).reduce((s, o) => s + parseFloat(o.estimatedRevenue), 0);

  async function generateForecast() {
    setLoading(true); setForecast("");
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Generate a detailed 30-day revenue optimization report including:
1. Current revenue capture rate analysis
2. Top 3 highest-impact opportunities with specific action steps
3. Payer mix optimization recommendations
4. CPT code upcoding opportunities (appropriate & compliant)
5. Preventive care gap closure revenue impact
6. Chronic care management enrollment opportunities
7. 30-60-90 day revenue projection with and without optimization
8. Benchmarking against national FP averages`,
        context: `Practice: Family Practice, Provider: Dr. Sarah Johnson
Patients: ${samplePatients.length} active patients today
Payer Mix: Blue Cross PPO, Aetna HMO, Kaiser HMO, Medicare Part B
Identified Opportunities: ${extendedOpportunities.map(o => `${o.opportunityType} ($${o.estimatedRevenue})`).join(", ")}
Total Potential: $${totalPotential.toFixed(2)}`,
      }),
    });
    const data = await res.json();
    setForecast(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Revenue Intelligence</h1>
        <p className="text-sm text-gray-400 mt-0.5">AI-powered revenue optimization & forecasting</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Total Opportunity</p>
          <p className="text-2xl font-bold text-emerald-400">${totalPotential.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">{extendedOpportunities.length} items identified</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Actioned</p>
          <p className="text-2xl font-bold text-blue-400">${actionedTotal.toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">{actionedIds.size} items marked</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Capture Rate</p>
          <p className="text-2xl font-bold text-yellow-400">{totalPotential > 0 ? Math.round((actionedTotal / totalPotential) * 100) : 0}%</p>
          <p className="text-xs text-gray-500 mt-1">of potential captured</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Est. Monthly Impact</p>
          <p className="text-2xl font-bold text-purple-400">${(totalPotential * 22).toFixed(0)}</p>
          <p className="text-xs text-gray-500 mt-1">annualized at 22 pts/day</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Opportunities */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-white">Revenue Opportunities</h2>
            <div className="flex gap-1 flex-wrap justify-end">
              {categories.map(cat => (
                <button key={cat} onClick={() => setActiveCategory(cat)} className={cn("px-2 py-0.5 rounded text-xs capitalize transition-colors", activeCategory === cat ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3">
            {filtered.map(opp => (
              <div key={opp.id} className={cn("p-4 rounded-lg border transition-colors", actionedIds.has(opp.id) ? "border-green-700/40 bg-green-900/10" : "border-gray-700 bg-gray-800/50")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-sm font-medium text-white">{opp.opportunityType}</p>
                      <span className={cn("text-xs px-1.5 py-0.5 rounded border capitalize", categoryColors[opp.category] || "text-gray-400 bg-gray-800 border-gray-700")}>{opp.category}</span>
                    </div>
                    <p className="text-xs text-gray-400">{opp.description}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-emerald-400">${opp.estimatedRevenue}</p>
                    <button
                      onClick={() => setActionedIds(prev => { const next = new Set(prev); if (next.has(opp.id)) next.delete(opp.id); else next.add(opp.id); return next; })}
                      className={cn("text-xs mt-1 px-2 py-0.5 rounded transition-colors", actionedIds.has(opp.id) ? "bg-green-700 text-green-200" : "bg-gray-700 text-gray-300 hover:bg-gray-600")}
                    >
                      {actionedIds.has(opp.id) ? "✓ Done" : "Action"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payer Breakdown */}
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-4">Payer Mix</h2>
            {[
              { payer: "Blue Cross PPO", patients: 1, avgRev: 165, color: "bg-blue-500" },
              { payer: "Aetna HMO", patients: 1, avgRev: 285, color: "bg-purple-500" },
              { payer: "Kaiser HMO", patients: 1, avgRev: 195, color: "bg-green-500" },
              { payer: "Medicare B", patients: 1, avgRev: 220, color: "bg-yellow-500" },
            ].map(p => (
              <div key={p.payer} className="mb-3">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">{p.payer}</span>
                  <span className="text-emerald-400">${p.avgRev}/visit</span>
                </div>
                <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div className={cn("h-full rounded-full", p.color)} style={{ width: `${(p.avgRev / 285) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">Patient Revenue Leaders</h2>
            {[...samplePatients].sort((a, b) => b.revenuePerVisit - a.revenuePerVisit).map(p => (
              <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div>
                  <p className="text-xs font-medium text-white">{p.name}</p>
                  <p className="text-xs text-gray-500">{p.insuranceProvider}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-emerald-400">${p.revenuePerVisit}</p>
                  <p className="text-xs text-gray-600">Score: {p.valueScore}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Forecast */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">AI Revenue Forecast</h2>
            <p className="text-xs text-gray-400 mt-0.5">30-day optimization analysis & projections</p>
          </div>
          <button onClick={generateForecast} disabled={loading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? "Analyzing..." : "Generate Forecast"}
          </button>
        </div>
        {forecast ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{forecast}</pre>
        ) : (
          <p className="text-gray-500 text-sm">Generate an AI-powered 30-day revenue forecast with actionable optimization steps.</p>
        )}
      </div>
    </div>
  );
}
