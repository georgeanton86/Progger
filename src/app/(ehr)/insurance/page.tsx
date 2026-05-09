"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { calcAge } from "@/lib/utils";

export default function InsurancePage() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(false);
  const [cptCodes, setCptCodes] = useState("");

  const patient = samplePatients.find(p => p.id === selectedId)!;

  async function analyze() {
    setLoading(true);
    setAnalysis("");
    const context = `Patient: ${patient.firstName} ${patient.lastName}, Age: ${calcAge(patient.dob)}
Insurance: ${patient.insurance} (ID: ${patient.insuranceId})
Primary Dx: ${patient.primaryDx}
CPT Codes planned: ${cptCodes || "Not specified"}
Medications: ${patient.medications.map(m => m.name).join(", ")}`;

    const res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Perform insurance optimization analysis. Include:
1. Likely coverage and authorization requirements for this visit
2. ICD-10 code recommendations that maximize reimbursement
3. CPT code bundling opportunities and restrictions
4. Pre-authorization requirements to watch for
5. Common denial reasons for this insurance/dx combination and how to avoid them
6. Documentation requirements to support billing`,
        context,
      }),
    });
    const data = await res.json();
    setAnalysis(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">Insurance Optimization</h1>
      <p className="text-gray-400 text-sm mb-6">Maximize reimbursement and minimize denials with AI billing analysis</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-medium text-white mb-3">Select Patient</h2>
          <div className="space-y-2">
            {samplePatients.map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedId(p.id); setAnalysis(""); }}
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

        <div className="lg:col-span-2 space-y-5">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Insurance</p>
                <p className="text-sm text-white font-medium mt-1">{patient.insurance}</p>
              </div>
              <div className="p-3 bg-gray-800 rounded-lg">
                <p className="text-xs text-gray-500">Member ID</p>
                <p className="text-sm text-white font-medium mt-1">{patient.insuranceId}</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Planned CPT Codes (optional)</label>
              <input
                type="text"
                value={cptCodes}
                onChange={e => setCptCodes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 99214, 93000, 85025"
              />
            </div>
            <button
              onClick={analyze}
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {loading ? "Analyzing..." : "Run Insurance Analysis"}
            </button>
          </div>

          {analysis && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-medium text-white mb-3">Analysis Results</h3>
              <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{analysis}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
