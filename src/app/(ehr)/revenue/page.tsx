"use client";
import { useState } from "react";
import { sampleStats, sampleAppointments } from "@/lib/sampleData";

const revenueByType: Record<string, number> = {
  "Follow-up": 185,
  "Sick Visit": 220,
  "Annual Wellness": 310,
  "Procedure": 450,
  "Consultation": 380,
};

export default function RevenuePage() {
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);

  const todayRevenue = sampleAppointments.reduce(
    (sum, apt) => sum + (revenueByType[apt.type] || 185), 0
  );

  async function getPrediction() {
    setLoading(true);
    setPrediction("");
    const context = `Today's schedule: ${sampleAppointments.length} patients
Appointment types: ${sampleAppointments.map(a => a.type).join(", ")}
Insurance mix: ${[...new Set(sampleAppointments.map(a => a.insurance))].join(", ")}
Completed encounters today: ${sampleStats.completedEncounters}
Estimated revenue today: $${todayRevenue}
Monthly average: $${(sampleStats.estimatedRevenue * 22).toLocaleString()}`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Provide a revenue optimization analysis for this practice. Include:
1. Today's revenue forecast and how to maximize it
2. Coding opportunities that may be missed (up-coding opportunities within compliance)
3. Insurance mix analysis — which payers are most/least profitable
4. Recommendations to increase revenue per encounter
5. 30-day revenue projection based on current trends`,
        context,
      }),
    });
    const data = await res.json();
    setPrediction(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Revenue Prediction</h1>
      <p className="text-gray-400 text-sm mb-6">AI-powered revenue optimization and forecasting</p>

      {/* Revenue Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Today (Est.)", value: `$${todayRevenue.toLocaleString()}`, color: "text-blue-400" },
          { label: "Monthly Avg", value: `$${(sampleStats.estimatedRevenue * 22).toLocaleString()}`, color: "text-green-400" },
          { label: "Per Encounter", value: `$${Math.round(todayRevenue / sampleAppointments.length)}`, color: "text-purple-400" },
          { label: "Pending Billing", value: `$${(sampleStats.pendingSignatures * 185).toLocaleString()}`, color: "text-yellow-400" },
        ].map(card => (
          <div key={card.label} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <p className="text-xs text-gray-400 mb-1">{card.label}</p>
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Today's Revenue Breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-medium text-white mb-4">Today&apos;s Revenue Breakdown</h2>
        <div className="space-y-3">
          {sampleAppointments.map(apt => (
            <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <p className="text-sm text-white">{apt.patientName}</p>
                <p className="text-xs text-gray-500">{apt.type} · {apt.insurance}</p>
              </div>
              <p className="text-sm font-medium text-green-400">${revenueByType[apt.type] || 185}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-medium text-white">AI Revenue Optimization</h2>
          <button
            onClick={getPrediction}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? "Analyzing..." : "Get AI Forecast"}
          </button>
        </div>
        {prediction && (
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{prediction}</pre>
        )}
      </div>
    </div>
  );
}
