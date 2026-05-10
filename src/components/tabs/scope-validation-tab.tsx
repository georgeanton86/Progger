"use client";
import { useState } from "react";
import { sampleScopeAlerts } from "@/lib/sampleData";
import { useStreamingAI } from "@/hooks/use-streaming-ai";

const presets = [
  "Nurse practitioner ordering MRI without physician oversight in a supervised state",
  "PA prescribing Schedule II controlled substance in California",
  "RN diagnosing a new condition independently",
  "APRN performing a minor surgical procedure without supervision",
];

export function ScopeValidationTab() {
  const [input, setInput] = useState("");
  const { output, loading, run, reset } = useStreamingAI();

  function validate(scenario?: string) {
    const text = scenario || input;
    if (!text.trim()) return;
    run(`Evaluate this clinical scenario for scope of practice compliance. Provide:
1. Verdict: Within Scope / Caution / Outside Scope
2. Risk Level: Low / Medium / High
3. Regulatory Analysis (state-specific, especially California)
4. Legal Compliance notes and relevant statutes
5. Specific Recommendations
6. Documentation requirements to protect the provider

Scenario: ${text}`);
  }

  return (
    <div className="p-6 max-w-4xl">
      <h1 className="text-xl font-bold text-white mb-1">Scope of Practice Validation</h1>
      <p className="text-gray-400 text-sm mb-5">AI-powered real-time scope of practice checks</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Describe the Clinical Scenario</h2>
          <textarea value={input} onChange={e => setInput(e.target.value)} rows={4} className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3" placeholder="Describe the clinical scenario to validate..." />
          <button onClick={() => validate()} disabled={loading || !input.trim()} className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2">
            {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Validating..." : "Validate Scope"}
          </button>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Active Alerts</h2>
          <div className="space-y-2">
            {sampleScopeAlerts.map(alert => (
              <div key={alert.id} className="p-3 bg-gray-800 rounded-lg">
                <div className="flex justify-between items-start mb-1">
                  <p className="text-xs font-medium text-white">{alert.procedure}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${alert.riskLevel === "high" ? "bg-red-900/40 text-red-400" : alert.riskLevel === "medium" ? "bg-yellow-900/40 text-yellow-400" : "bg-green-900/40 text-green-400"}`}>{alert.riskLevel}</span>
                </div>
                <p className="text-xs text-gray-400">{alert.recommendation}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="font-medium text-white mb-3">Quick Scenarios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presets.map(s => (
            <button key={s} onClick={() => { setInput(s); validate(s); reset(); }} className="text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs text-gray-300 transition-colors">{s}</button>
          ))}
        </div>
      </div>

      {(output || loading) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Analysis Result</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{output}{loading && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />}</pre>
        </div>
      )}
    </div>
  );
}
