"use client";
import { useState } from "react";
import { sampleProvider } from "@/lib/sampleData";
import { cn } from "@/lib/utils";

type Tab = "profile" | "credentials" | "practice" | "ai" | "billing";

export function SettingsTab() {
  const [activeTab, setActiveTab] = useState<Tab>("profile");
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState({
    name: sampleProvider.name,
    specialty: sampleProvider.specialty,
    credentials: sampleProvider.credentials,
    state: sampleProvider.state,
    npi: "1234567890",
    dea: "BJ1234563",
    email: "dr.johnson@caremind.health",
    phone: "(415) 555-0100",
    address: "450 Sutter St, Suite 1200",
    city: "San Francisco",
    zip: "94108",
  });

  const [aiSettings, setAiSettings] = useState({
    model: "claude-sonnet-4-6",
    maxTokens: "1024",
    systemPrompt: "You are PrognoSX, an AI clinical assistant specialized in evidence-based medicine, revenue optimization, and scope of practice compliance.",
    enableStreaming: false,
    enableDiagnosticSuggestions: true,
    enableRevenueAlerts: true,
    enableScopeAlerts: true,
  });

  const [practiceSettings, setPracticeSettings] = useState({
    practiceName: "Johnson Family Practice",
    taxId: "XX-XXXXXXX",
    groupNpi: "9876543210",
    ehrSystem: sampleProvider.ehrSystem || "Epic",
    billingSystem: "Kareo",
    feeSchedule: "Medicare 2024",
    defaultVisitType: "office-visit",
    appointmentDuration: "20",
  });

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const settingTabs: { id: Tab; label: string }[] = [
    { id: "profile", label: "Provider Profile" },
    { id: "credentials", label: "Licenses & DEA" },
    { id: "practice", label: "Practice Settings" },
    { id: "ai", label: "AI Configuration" },
    { id: "billing", label: "Billing & Coding" },
  ];

  return (
    <div className="p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Profile & Settings</h1>
        <p className="text-sm text-gray-400 mt-0.5">Manage your provider profile, credentials, and system preferences</p>
      </div>

      <div className="flex gap-5">
        {/* Sidebar tabs */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {settingTabs.map(t => (
              <button key={t.id} onClick={() => setActiveTab(t.id)} className={cn("w-full text-left px-3 py-2 rounded-lg text-sm transition-colors", activeTab === t.id ? "bg-blue-600/20 text-blue-400 font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800")}>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {activeTab === "profile" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white mb-4">Provider Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Full Name</label>
                  <input value={profile.name} onChange={e => setProfile(p => ({ ...p, name: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Specialty</label>
                  <input value={profile.specialty} onChange={e => setProfile(p => ({ ...p, specialty: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Email</label>
                  <input value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Phone</label>
                  <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">State</label>
                  <input value={profile.state} onChange={e => setProfile(p => ({ ...p, state: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Credentials</label>
                  <input value={profile.credentials} onChange={e => setProfile(p => ({ ...p, credentials: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-gray-400 block mb-1">Address</label>
                  <input value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
            </div>
          )}

          {activeTab === "credentials" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white mb-4">Licenses & Certifications</h2>
              {[
                { label: "NPI Number (Individual)", key: "npi" as const, hint: "10-digit NPI" },
                { label: "DEA Number", key: "dea" as const, hint: "e.g. BJ1234563" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                  <input value={profile[f.key]} onChange={e => setProfile(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.hint} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono" />
                </div>
              ))}
              <div className="mt-4 pt-4 border-t border-gray-800">
                <h3 className="text-sm font-medium text-white mb-3">Board Certifications</h3>
                <div className="space-y-2">
                  {["American Board of Family Medicine (ABFM)", "Basic Life Support (BLS)"].map(cert => (
                    <div key={cert} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <p className="text-xs text-gray-300">{cert}</p>
                      <span className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded border border-green-700/40">Active</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === "practice" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white mb-4">Practice Configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { label: "Practice Name", key: "practiceName" as const },
                  { label: "Tax ID", key: "taxId" as const },
                  { label: "Group NPI", key: "groupNpi" as const },
                  { label: "EHR System", key: "ehrSystem" as const },
                  { label: "Billing System", key: "billingSystem" as const },
                  { label: "Fee Schedule", key: "feeSchedule" as const },
                  { label: "Appointment Duration (min)", key: "appointmentDuration" as const },
                  { label: "Default Visit Type", key: "defaultVisitType" as const },
                ].map(f => (
                  <div key={f.key}>
                    <label className="text-xs text-gray-400 block mb-1">{f.label}</label>
                    <input value={practiceSettings[f.key]} onChange={e => setPracticeSettings(p => ({ ...p, [f.key]: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "ai" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white mb-4">AI Engine Configuration</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Model</label>
                  <select value={aiSettings.model} onChange={e => setAiSettings(s => ({ ...s, model: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Recommended)</option>
                    <option value="claude-opus-4-7">Claude Opus 4.7 (Most Capable)</option>
                    <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fastest)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Max Tokens</label>
                  <input value={aiSettings.maxTokens} onChange={e => setAiSettings(s => ({ ...s, maxTokens: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-1">System Prompt</label>
                <textarea value={aiSettings.systemPrompt} onChange={e => setAiSettings(s => ({ ...s, systemPrompt: e.target.value }))} rows={4} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="space-y-3 pt-2">
                {[
                  { key: "enableDiagnosticSuggestions" as const, label: "AI Diagnostic Suggestions", desc: "Show differential diagnoses during pre-visit charting" },
                  { key: "enableRevenueAlerts" as const, label: "Revenue Opportunity Alerts", desc: "Alert when revenue opportunities are identified" },
                  { key: "enableScopeAlerts" as const, label: "Scope of Practice Alerts", desc: "Real-time alerts for scope compliance" },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-white">{toggle.label}</p>
                      <p className="text-xs text-gray-500">{toggle.desc}</p>
                    </div>
                    <button onClick={() => setAiSettings(s => ({ ...s, [toggle.key]: !s[toggle.key] }))} className={cn("w-10 h-6 rounded-full transition-colors relative", aiSettings[toggle.key] ? "bg-blue-600" : "bg-gray-700")}>
                      <span className={cn("absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform", aiSettings[toggle.key] ? "translate-x-4" : "translate-x-0")} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "billing" && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
              <h2 className="font-semibold text-white mb-4">Billing & Coding Preferences</h2>
              <div className="space-y-3">
                {[
                  { label: "Default E&M Code", value: "99213 - Office visit, low complexity", status: "active" },
                  { label: "AWV Code", value: "G0439 - Annual wellness visit, subsequent", status: "active" },
                  { label: "CCM Code", value: "99490 - Chronic care management, 20+ min", status: "active" },
                  { label: "RPM Code", value: "99453 - Remote physiologic monitoring", status: "inactive" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm text-gray-300 font-mono mt-0.5">{item.value}</p>
                    </div>
                    <span className={cn("text-xs px-2 py-0.5 rounded border", item.status === "active" ? "text-green-400 bg-green-900/20 border-green-700/40" : "text-gray-500 bg-gray-800 border-gray-700")}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="pt-2 border-t border-gray-800">
                <p className="text-xs text-gray-500 mb-2">Modifier Defaults</p>
                <div className="flex gap-2 flex-wrap">
                  {["25 - Significant separate E/M", "59 - Distinct procedural service", "GT - Via interactive audio/video"].map(mod => (
                    <span key={mod} className="text-xs px-2 py-1 bg-blue-900/20 text-blue-400 border border-blue-800/40 rounded">{mod}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} className={cn("px-5 py-2 rounded-lg text-sm font-medium transition-colors", saved ? "bg-green-600 text-white" : "bg-blue-600 hover:bg-blue-700 text-white")}>
              {saved ? "✓ Saved" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
