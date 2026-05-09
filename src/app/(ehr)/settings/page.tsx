"use client";
import { useState } from "react";

export default function SettingsPage() {
  const [form, setForm] = useState({
    name: "Dr. George Anton",
    specialty: "Family Practice",
    npi: "1234567890",
    email: "george.anton@clinic.com",
    licenseState: "TX",
    licenseNumber: "TX-MED-99821",
    deaNumber: "BA1234567",
  });
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-white mb-1">Profile &amp; Credentials</h1>
      <p className="text-gray-400 text-sm mb-6">Manage your provider profile and licensing information</p>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-4 pb-5 border-b border-gray-800">
          <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-xl font-bold">
            {form.name.split(" ").map(n => n[0]).slice(1).join("")}
          </div>
          <div>
            <p className="font-semibold text-white">{form.name}</p>
            <p className="text-sm text-gray-400">{form.specialty}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Full Name", key: "name" },
            { label: "Specialty", key: "specialty" },
            { label: "NPI Number", key: "npi" },
            { label: "Email", key: "email" },
            { label: "License State", key: "licenseState" },
            { label: "License Number", key: "licenseNumber" },
            { label: "DEA Number", key: "deaNumber" },
          ].map(field => (
            <div key={field.key}>
              <label className="block text-xs font-medium text-gray-400 mb-1">{field.label}</label>
              <input
                type="text"
                value={form[field.key as keyof typeof form]}
                onChange={e => setForm(f => ({ ...f, [field.key]: e.target.value }))}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          ))}
        </div>

        <button
          onClick={handleSave}
          className={`w-full py-2.5 text-white text-sm font-medium rounded-lg transition-colors ${
            saved ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {saved ? "✓ Saved!" : "Save Profile"}
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-5">
        <h2 className="font-medium text-white mb-3">AI Configuration</h2>
        <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
          <div>
            <p className="text-sm text-white">Claude AI (PrognoSX Engine)</p>
            <p className="text-xs text-gray-400 mt-0.5">claude-sonnet-4-6</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-xs text-green-400">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
