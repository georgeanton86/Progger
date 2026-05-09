"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";
import { calcAge, formatDate } from "@/lib/utils";
import type { Patient } from "@/lib/types";

export default function PatientsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Patient | null>(null);

  const filtered = samplePatients.filter(p =>
    `${p.firstName} ${p.lastName} ${p.mrn}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex h-screen">
      {/* List */}
      <div className="w-80 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h2 className="font-semibold text-white mb-3">Patient Management</h2>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search patients..."
            className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className={`w-full text-left p-4 rounded-lg border transition-colors ${
                selected?.id === p.id ? "border-blue-500 bg-blue-600/10" : "border-gray-700 bg-gray-800/50 hover:border-gray-600"
              }`}
            >
              <p className="font-medium text-white text-sm">{p.firstName} {p.lastName}</p>
              <p className="text-xs text-gray-400 mt-0.5">{p.mrn} · {calcAge(p.dob)}y · {p.sex}</p>
              <p className="text-xs text-gray-500 mt-1">{p.primaryDx}</p>
            </button>
          ))}
        </div>
        <div className="p-3 border-t border-gray-800">
          <button className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            + New Patient
          </button>
        </div>
      </div>

      {/* Detail */}
      <div className="flex-1 overflow-y-auto p-6">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a patient to view their record
          </div>
        ) : (
          <div className="max-w-3xl space-y-5">
            {/* Header */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selected.firstName} {selected.lastName}</h2>
                  <p className="text-gray-400 mt-1">
                    {calcAge(selected.dob)}y old · {selected.sex} · DOB {formatDate(selected.dob)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">MRN: {selected.mrn} · Phone: {selected.phone}</p>
                </div>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
                  Edit Patient
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Insurance */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-medium text-white mb-3">Insurance</h3>
                <p className="text-sm text-gray-300">{selected.insurance}</p>
                <p className="text-sm text-gray-400">ID: {selected.insuranceId}</p>
              </div>

              {/* Allergies */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="font-medium text-white mb-3">Allergies</h3>
                {selected.allergies.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selected.allergies.map(a => (
                      <span key={a} className="px-2 py-1 bg-red-900/30 text-red-400 border border-red-800/30 rounded text-sm">{a}</span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-green-400">NKDA</span>
                )}
              </div>
            </div>

            {/* Medications */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-white">Medications</h3>
                <button className="text-sm text-blue-400 hover:text-blue-300">+ Add</button>
              </div>
              <div className="space-y-2">
                {selected.medications.map(med => (
                  <div key={med.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-white font-medium">{med.name} {med.dose}</p>
                      <p className="text-xs text-gray-400">{med.frequency} · Started {formatDate(med.startDate)}</p>
                    </div>
                    <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400 rounded-full">Active</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Problem List */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <h3 className="font-medium text-white mb-3">Problem List</h3>
              <div className="flex items-center gap-2 p-3 bg-gray-800 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0"></div>
                <p className="text-sm text-gray-300">{selected.primaryDx}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
