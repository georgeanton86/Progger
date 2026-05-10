"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { useStreamingAI } from "@/hooks/use-streaming-ai";
import { cn } from "@/lib/utils";

export function InsuranceTab() {
  const [selectedId, setSelectedId] = useState(samplePatients[0].id);
  const [cptCodes, setCptCodes] = useState("");
  const { output, loading, run, reset } = useStreamingAI();
  const patient = samplePatients.find(p => p.id === selectedId)!;

  function analyze() {
    run(
      `Perform a comprehensive insurance optimization analysis:
1. Coverage & prior authorization requirements for planned services
2. ICD-10 code recommendations with maximum specificity to maximize reimbursement
3. CPT code bundling opportunities and unbundling restrictions (CCI edits)
4. Pre-authorization requirements and supporting documentation needed
5. Common denial reasons for this payer/diagnosis combination and prevention strategies
6. Medical necessity documentation requirements
7. Estimated reimbursement breakdown by code with expected vs. contractual rates
8. Appeal strategies if denied`,
      `Patient: ${patient.name}, Age: ${patient.age}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Medical History: ${patient.medicalHistory.join(", ")}
Planned CPT Codes: ${cptCodes || "office visit E&M (level TBD)"}
Revenue/Visit: $${patient.revenuePerVisit} | Payment Reliability: ${patient.paymentReliability}%`
    );
  }

  return (
    <div className="p-5 max-w-3xl">
      <div className="mb-5">
        <h2 className="font-bold text-white text-lg">Insurance Optimization</h2>
        <p className="text-xs text-gray-400 mt-0.5">Maximize reimbursement · Prevent denials</p>
      </div>

      {/* Patient selector — horizontal pills */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {samplePatients.map(p => (
          <button
            key={p.id}
            onClick={() => { setSelectedId(p.id); reset(); }}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
              selectedId === p.id
                ? "border-teal-500 bg-teal-600/15 text-teal-300"
                : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600 hover:text-white"
            )}
          >
            {p.name}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          {/* Patient info cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Insurance</p>
              <p className="text-sm text-white font-medium mt-1">{patient.insuranceProvider}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Plan</p>
              <p className="text-sm text-white font-medium mt-1">{patient.insurancePlan}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Est. Revenue</p>
              <p className="text-sm text-emerald-400 font-medium mt-1">${patient.revenuePerVisit}</p>
            </div>
            <div className="p-3 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-500">Pay Reliability</p>
              <p className="text-sm text-teal-400 font-medium mt-1">{patient.paymentReliability}%</p>
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-1">Planned CPT Codes (optional)</label>
            <input
              type="text"
              value={cptCodes}
              onChange={e => setCptCodes(e.target.value)}
              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. 99214, 93000, 85025"
            />
          </div>
          <button
            onClick={analyze}
            disabled={loading}
            className="w-full py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            {loading ? "Analyzing..." : "Run Insurance Analysis"}
          </button>
        </div>

        {(output || loading) && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">
              {output}
              {loading && <span className="inline-block w-0.5 h-4 bg-teal-400 animate-pulse ml-0.5 align-middle" />}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
