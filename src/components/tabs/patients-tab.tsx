"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { cn } from "@/lib/utils";
import type { Patient } from "@/lib/types";

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 90 ? "text-green-400 bg-green-900/20 border-green-700/40" : score >= 80 ? "text-blue-400 bg-blue-900/20 border-blue-700/40" : "text-yellow-400 bg-yellow-900/20 border-yellow-700/40";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", cls)}>{score}</span>;
}

function RiskBar({ value, max = 100, color }: { value: number; max?: number; color: string }) {
  return (
    <div className="h-1 bg-gray-800 rounded-full overflow-hidden w-full">
      <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${(value / max) * 100}%` }} />
    </div>
  );
}

function PatientDetailPanel({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const [aiInsight, setAiInsight] = useState("");
  const [loading, setLoading] = useState(false);

  async function generateInsight() {
    setLoading(true); setAiInsight("");
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Generate a comprehensive patient profile analysis including:
1. Risk stratification (cardiovascular, diabetes, cancer screening gaps)
2. Medication optimization opportunities and potential interactions
3. Care gaps based on age, diagnosis, and insurance
4. Preventive care services overdue
5. Patient engagement recommendations
6. Estimated lifetime patient value and retention strategies
7. Next 3 visit recommendations with CPT codes`,
        context: `Patient: ${patient.name}, Age: ${patient.age}, DOB: ${patient.dateOfBirth}
Insurance: ${patient.insuranceProvider} ${patient.insurancePlan}
Chief Complaint: ${patient.primaryComplaint}
Medical History: ${patient.medicalHistory.join(", ")}
Medications: ${patient.medications.join(", ")}
Allergies: ${patient.allergies.join(", ")}
Value Score: ${patient.valueScore} | Payment Reliability: ${patient.paymentReliability}% | No-Show: ${patient.noShowRate}% | Revenue/Visit: $${patient.revenuePerVisit}`,
      }),
    });
    const data = await res.json();
    setAiInsight(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-950 border border-gray-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-800 flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">{patient.name}</h2>
            <p className="text-sm text-gray-400 mt-0.5">Age {patient.age} · DOB {new Date(patient.dateOfBirth).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            <ScoreBadge score={patient.valueScore} />
            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors text-xl leading-none">×</button>
          </div>
        </div>
        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Insurance</p>
              <p className="text-sm font-medium text-white">{patient.insuranceProvider}</p>
              <p className="text-xs text-gray-500">{patient.insurancePlan}</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Revenue / Visit</p>
              <p className="text-lg font-bold text-emerald-400">${patient.revenuePerVisit}</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">Payment Reliability</span><span className="text-green-400">{patient.paymentReliability}%</span></div>
              <RiskBar value={patient.paymentReliability} color="bg-green-500" />
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1"><span className="text-gray-400">No-Show Rate</span><span className="text-red-400">{patient.noShowRate}%</span></div>
              <RiskBar value={patient.noShowRate} max={30} color="bg-red-500" />
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Chief Complaint</p>
            <p className="text-sm text-white">{patient.primaryComplaint}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Medical History</p>
              <div className="space-y-1">{patient.medicalHistory.map(h => <p key={h} className="text-xs text-blue-400">{h}</p>)}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Medications</p>
              <div className="space-y-1">{patient.medications.map(m => <p key={m} className="text-xs text-purple-400">{m}</p>)}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">Allergies</p>
              <div className="space-y-1">{patient.allergies.map(a => <p key={a} className="text-xs text-red-400">{a}</p>)}</div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-white">AI Patient Insight</p>
              <button onClick={generateInsight} disabled={loading} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                {loading ? "Analyzing..." : "Generate Insight"}
              </button>
            </div>
            {aiInsight ? (
              <pre className="whitespace-pre-wrap text-xs text-gray-300 font-sans leading-relaxed">{aiInsight}</pre>
            ) : (
              <p className="text-xs text-gray-600">Generate an AI-powered analysis of this patient including risk stratification, care gaps, and revenue opportunities.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PatientsTab() {
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "valueScore" | "revenuePerVisit" | "paymentReliability">("valueScore");
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const filtered = samplePatients
    .filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || (p.insuranceProvider || "").toLowerCase().includes(search.toLowerCase()) || (p.primaryComplaint || "").toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      return b[sortBy] - a[sortBy];
    });

  const avgRevenue = samplePatients.reduce((s, p) => s + p.revenuePerVisit, 0) / samplePatients.length;
  const avgScore = samplePatients.reduce((s, p) => s + p.valueScore, 0) / samplePatients.length;

  return (
    <div className="p-6 max-w-6xl">
      {selectedPatient && <PatientDetailPanel patient={selectedPatient} onClose={() => setSelectedPatient(null)} />}

      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Patient Management</h1>
        <p className="text-sm text-gray-400 mt-0.5">{samplePatients.length} active patients · Avg value score {avgScore.toFixed(0)} · Avg revenue ${avgRevenue.toFixed(0)}/visit</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Patients</p>
          <p className="text-2xl font-bold text-white mt-1">{samplePatients.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Avg Value Score</p>
          <p className="text-2xl font-bold text-blue-400 mt-1">{avgScore.toFixed(1)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Avg Revenue/Visit</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${avgRevenue.toFixed(0)}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Avg Payment Reliability</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{(samplePatients.reduce((s, p) => s + p.paymentReliability, 0) / samplePatients.length).toFixed(0)}%</p>
        </div>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients, insurance, complaints..."
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)} className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="valueScore">Sort: Value Score</option>
            <option value="revenuePerVisit">Sort: Revenue/Visit</option>
            <option value="paymentReliability">Sort: Payment Reliability</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left border-b border-gray-800">
                <th className="pb-3 text-xs font-medium text-gray-500 pr-4">Patient</th>
                <th className="pb-3 text-xs font-medium text-gray-500 pr-4">Insurance</th>
                <th className="pb-3 text-xs font-medium text-gray-500 pr-4">Chief Complaint</th>
                <th className="pb-3 text-xs font-medium text-gray-500 pr-4 text-right">Value Score</th>
                <th className="pb-3 text-xs font-medium text-gray-500 pr-4 text-right">Rev/Visit</th>
                <th className="pb-3 text-xs font-medium text-gray-500 text-right">Pay Reliability</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} onClick={() => setSelectedPatient(p)} className="border-b border-gray-800/50 hover:bg-gray-800/40 cursor-pointer transition-colors">
                  <td className="py-3 pr-4">
                    <p className="text-sm font-medium text-white">{p.name}</p>
                    <p className="text-xs text-gray-500">Age {p.age}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-sm text-gray-300">{p.insuranceProvider}</p>
                    <p className="text-xs text-gray-500">{p.insurancePlan}</p>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-xs text-gray-400 max-w-[160px] truncate">{p.primaryComplaint}</p>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <ScoreBadge score={p.valueScore} />
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <p className="text-sm font-semibold text-emerald-400">${p.revenuePerVisit}</p>
                  </td>
                  <td className="py-3 text-right">
                    <p className="text-sm text-green-400">{p.paymentReliability}%</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="text-center text-gray-500 text-sm py-8">No patients match your search.</p>}
        </div>
      </div>
    </div>
  );
}
