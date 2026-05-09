"use client";
import { useState } from "react";

const presetScenarios = [
  "Nurse practitioner ordering an MRI without physician oversight in a supervised state",
  "PA prescribing Schedule II controlled substance",
  "RN diagnosing a new condition independently",
  "APRN performing a minor surgical procedure",
];

export default function ScopeValidationPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  async function validate(scenario?: string) {
    const text = scenario || input;
    if (!text.trim()) return;
    setLoading(true);
    setResult("");
    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Evaluate this clinical scenario for scope of practice compliance. Provide: 1) Is this within scope (Yes/No/Depends), 2) Relevant regulatory considerations, 3) State-by-state variability notes, 4) Risk level (Low/Medium/High), 5) Recommendations. Scenario: ${text}`,
      }),
    });
    const data = await res.json();
    setResult(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Scope of Practice Validation</h1>
      <p className="text-gray-400 text-sm mb-6">AI-powered scope of practice checks for clinical scenarios</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-medium text-white mb-3">Describe the Clinical Scenario</h2>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          rows={4}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-3"
          placeholder="e.g. Nurse practitioner in Texas ordering CT without collaborating physician approval..."
        />
        <button
          onClick={() => validate()}
          disabled={loading || !input.trim()}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          {loading ? "Validating..." : "Validate Scope"}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="font-medium text-white mb-3">Quick Scenarios</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {presetScenarios.map(s => (
            <button
              key={s}
              onClick={() => { setInput(s); validate(s); }}
              className="text-left p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {result && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="font-medium text-white mb-3">Analysis</h2>
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{result}</pre>
        </div>
      )}
    </div>
  );
}
