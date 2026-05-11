"use client";
import { useState, useEffect } from "react";
import { sampleStats, sampleAppointments, samplePatients, sampleProvider } from "@/lib/sampleData";
import { PreVisitTab } from "@/components/tabs/pre-visit-tab";
import { ScopeValidationTab } from "@/components/tabs/scope-validation-tab";
import { CarePlanningTab } from "@/components/tabs/care-planning-tab";
import { ProtectiveBriefingTab } from "@/components/tabs/protective-briefing-tab";
import { InsuranceTab } from "@/components/tabs/insurance-tab";
import { RevenueTab } from "@/components/tabs/revenue-tab";
import { PatientsTab } from "@/components/tabs/patients-tab";
import { AppointmentsTab } from "@/components/tabs/appointments-tab";
import { EhrIntegrationTab } from "@/components/tabs/ehr-integration-tab";
import { SettingsTab } from "@/components/tabs/settings-tab";
import { PatientAvatar, PatientHealthCard } from "@/components/patient-avatar";
import { StreamlinedEncounter } from "@/components/encounter/streamlined-encounter";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

const tabs = [
  { id: "dashboard", label: "Dashboard", icon: "⊙" },
  { id: "pre-visit", label: "Pre-Visit Charting", icon: "👤" },
  { id: "scope", label: "Scope Validation", icon: "🛡" },
  { id: "care-planning", label: "Care Planning", icon: "✏️" },
  { id: "briefing", label: "Protective Briefing", icon: "📋" },
  { id: "insurance", label: "Insurance Optimization", icon: "📄" },
  { id: "revenue", label: "Revenue Prediction", icon: "📈" },
  { id: "patients", label: "Patient Management", icon: "👥" },
  { id: "appointments", label: "Appointments", icon: "📅" },
  { id: "ehr", label: "EHR Integration", icon: "🔗" },
  { id: "settings", label: "Profile & Credentials", icon: "⚙️" },
];

const specialties = [
  "Family Practice",
  "Internal Medicine",
  "Cardiology",
  "Dermatology",
  "Emergency Medicine",
  "Orthopedics",
  "Psychiatry",
  "Pediatrics",
  "OB/GYN",
  "Surgery",
  "Interventional Radiology",
  "Anesthesiology",
  "Pathology",
  "Radiology",
];

function StatCard({ label, value, subtitle, color }: { label: string; value: string | number; subtitle?: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function DashboardHome({ onOpenEncounter }: { onOpenEncounter: (patient: Patient, apt: Appointment) => void }) {
  const [healthCardPatient, setHealthCardPatient] = useState<Patient | null>(null);
  const stats = sampleStats;

  const sorted = [...sampleAppointments].sort((a, b) =>
    new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()
  );

  const providerBriefingPatients = sorted.slice(0, 2).map(apt => {
    const p = samplePatients.find(pt => pt.id === apt.patientId)!;
    return { patient: p, apt };
  });

  return (
    <div className="p-6">
      {/* Patient health card modal */}
      {healthCardPatient && (
        <PatientHealthCard patient={healthCardPatient} onClose={() => setHealthCardPatient(null)} />
      )}

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Today's Patients" value={stats.patientsToday} color="text-teal-400" />
        <StatCard label="Revenue Today" value={`$${stats.revenueToday.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Scope Alerts" value={3} subtitle="2 caution · 1 outside scope" color="text-yellow-400" />
        <StatCard label="Satisfaction Score" value="4.8 ★" subtitle="96% positive" color="text-purple-400" />
      </div>

      {/* AI System Online Banner */}
      <div className="mb-5 flex items-center gap-3 px-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-sm font-semibold text-teal-400">PrognoSX AI System Online</span>
        </div>
        <div className="h-3 w-px bg-gray-700" />
        <span className="text-xs text-gray-400">99.9% Uptime · Processing: 847 patients/hour</span>
      </div>

      {/* Pre-Visit Patients */}
      <div className="bg-white rounded-xl p-5 mb-5">
        <h2 className="font-bold text-gray-900 text-lg mb-4">Pre-Visit Patients</h2>
        <div className="space-y-3">
          {sorted.map(apt => {
            const patient = samplePatients.find(p => p.id === apt.patientId)!;
            if (!patient) return null;
            const time = new Date(apt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const hasScopeWarning = patient.noShowRate > 10 || patient.medicalHistory.some(h => h.toLowerCase().includes("copd"));
            return (
              <div
                key={apt.id}
                onClick={() => onOpenEncounter(patient, apt)}
                className="border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-teal-400 hover:shadow-md transition-all active:scale-[0.99]"
              >
                <div className="flex items-start gap-3">
                  {/* Avatar — stops propagation to open health card instead */}
                  <div
                    onClick={e => { e.stopPropagation(); setHealthCardPatient(patient); }}
                    className="flex-shrink-0 hover:scale-105 transition-transform"
                    title={`View ${patient.name}'s health card`}
                  >
                    <PatientAvatar patient={patient} size={44} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-gray-900 text-teal-700">
                        {patient.name}, {patient.age} →
                      </span>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>{time}</span>
                        <span className="text-gray-700 font-medium hidden sm:inline">{patient.primaryComplaint}</span>
                      </div>
                    </div>
                    <div className="mb-2">
                      <span className="text-xs text-gray-500 font-medium">📋 History of Present Illness</span>
                      <p className="text-sm text-gray-400 mt-0.5">{patient.hpiPreview}</p>
                    </div>
                    {hasScopeWarning && (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
                        <span className="text-amber-600 text-xs font-semibold">⚠ Scope Validation Recommended</span>
                        <span className="text-amber-500 text-xs hidden sm:inline">· {patient.primaryComplaint} requires additional scope validation</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Provider Briefing - Patient Satisfaction */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="font-semibold text-white mb-4">Provider Briefing - Patient Satisfaction</h2>
        <div className="space-y-4">
          {providerBriefingPatients.map(({ patient, apt }) => {
            const time = new Date(apt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={apt.id} className="bg-gray-800 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <button onClick={() => setHealthCardPatient(patient)} className="flex-shrink-0 hover:scale-105 transition-transform">
                    <PatientAvatar patient={patient} size={40} />
                  </button>
                  <div>
                    <p className="font-semibold text-white">{patient.name}</p>
                    <p className="text-xs text-gray-400">{time} · {patient.primaryComplaint}</p>
                  </div>
                </div>
                <ul className="space-y-1.5 text-sm text-gray-300">
                  <li className="flex items-start gap-2"><span className="text-teal-400 mt-0.5">•</span> Patient has {patient.paymentReliability}% payment reliability — reliable financial profile.</li>
                  <li className="flex items-start gap-2"><span className="text-teal-400 mt-0.5">•</span> Insurance: {patient.insuranceProvider} {patient.insurancePlan} — verify coverage before visit.</li>
                  <li className="flex items-start gap-2"><span className="text-teal-400 mt-0.5">•</span> Review medications: {patient.medications.slice(0, 2).join(", ")}{patient.medications.length > 2 ? ` +${patient.medications.length - 2} more` : ""}.</li>
                  {patient.allergies.filter(a => a !== "None").length > 0 && (
                    <li className="flex items-start gap-2"><span className="text-amber-400 mt-0.5">•</span> Allergy alert: {patient.allergies.filter(a => a !== "None").join(", ")}.</li>
                  )}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [specialty, setSpecialty] = useState(sampleProvider.specialty);
  const [recording, setRecording] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [now, setNow] = useState(new Date());
  const [encounterCtx, setEncounterCtx] = useState<{ patient: Patient; apt: Appointment } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const dateStr = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  function handleTabSelect(tabId: string) {
    setActiveTab(tabId);
    setSidebarOpen(false);
  }

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      {/* Overlay — shown on mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — always fixed, always same element */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-30 w-64 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0 transition-transform duration-200",
        sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
      )}>
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">Rx</div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm">PrognoSX</p>
              <p className="text-xs text-gray-400">AI Medical Intelligence</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabSelect(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-colors text-left",
                activeTab === tab.id ? "bg-teal-600/20 text-teal-400 font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800"
              )}
            >
              <span className="text-sm w-4 text-center flex-shrink-0">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-2 border-t border-gray-800">
          <div className="px-3 py-2">
            <p className="text-xs text-gray-500 truncate">{sampleProvider.name}</p>
            <p className="text-xs text-gray-600">{sampleProvider.specialty}</p>
          </div>
        </div>
      </aside>

      {/* Main area — pushed right by sidebar width on desktop */}
      <div className="flex-1 flex flex-col overflow-hidden min-w-0 md:ml-64">
        {/* Header bar */}
        <div className="border-b border-gray-800 px-3 md:px-5 py-3 flex items-center gap-3 flex-shrink-0 bg-gray-900">
          {/* Hamburger (mobile only) */}
          <button
            onClick={() => setSidebarOpen(o => !o)}
            className="md:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors flex-shrink-0"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Left */}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-white text-sm truncate">PrognoSX</p>
            <p className="text-gray-500 text-xs hidden sm:block">{dateStr} · {timeStr}</p>
          </div>

          {/* Center: specialty selector */}
          <select
            value={specialty}
            onChange={e => setSpecialty(e.target.value)}
            className="hidden sm:block bg-gray-800 text-gray-200 text-sm border border-gray-700 rounded-lg px-3 py-1.5 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 flex-shrink-0"
          >
            {specialties.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          {/* Right */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setRecording(r => !r)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                recording ? "bg-red-600 hover:bg-red-700 text-white" : "bg-teal-500 hover:bg-teal-600 text-white"
              )}
            >
              <span>{recording ? "⏹" : "🎤"}</span>
              <span className="hidden sm:inline">{recording ? "Stop" : "Hello Progno"}</span>
            </button>
            <span className="text-gray-400 text-xs hidden lg:block truncate max-w-32">{sampleProvider.name}</span>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-950">
          {/* Encounter overlay — takes over the entire content area */}
          {encounterCtx && (
            <StreamlinedEncounter
              patient={encounterCtx.patient}
              appointment={encounterCtx.apt}
              onBack={() => setEncounterCtx(null)}
            />
          )}
          {!encounterCtx && activeTab === "dashboard" && (
            <DashboardHome onOpenEncounter={(patient, apt) => setEncounterCtx({ patient, apt })} />
          )}
          {!encounterCtx && activeTab === "pre-visit" && <PreVisitTab />}
          {!encounterCtx && activeTab === "scope" && <ScopeValidationTab />}
          {!encounterCtx && activeTab === "care-planning" && <CarePlanningTab />}
          {!encounterCtx && activeTab === "briefing" && <ProtectiveBriefingTab />}
          {!encounterCtx && activeTab === "insurance" && <InsuranceTab />}
          {!encounterCtx && activeTab === "revenue" && <RevenueTab />}
          {!encounterCtx && activeTab === "patients" && <PatientsTab />}
          {!encounterCtx && activeTab === "appointments" && <AppointmentsTab />}
          {!encounterCtx && activeTab === "ehr" && <EhrIntegrationTab />}
          {!encounterCtx && activeTab === "settings" && <SettingsTab />}
        </main>
      </div>
    </div>
  );
}
