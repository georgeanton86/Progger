"use client";
import { useState } from "react";
import { sampleStats, sampleAppointments, samplePatients, sampleProvider, sampleRevenueOpportunities, sampleScopeAlerts } from "@/lib/sampleData";
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
import { cn } from "@/lib/utils";

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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DashboardHome() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const stats = sampleStats;

  return (
    <div className="p-6">
      {/* AI Status Banner */}
      <div className="mb-5 flex items-center gap-3 px-4 py-2.5 bg-blue-950/40 border border-blue-800/30 rounded-xl">
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs font-semibold text-green-400">PrognoSX AI Online</span>
        </div>
        <div className="h-3 w-px bg-blue-800/50" />
        <div className="flex items-center gap-4 text-xs text-blue-300/70 overflow-x-auto flex-nowrap">
          <span>Model: claude-sonnet-4-6</span>
          <span>·</span>
          <span>Uptime: 99.9%</span>
          <span>·</span>
          <span>Processing: 847 patients/hour</span>
          <span>·</span>
          <span>Latency: 1.2s avg</span>
          <span>·</span>
          <span>Last update: {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        </div>
      </div>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">PrognoSX Dashboard</h1>
        <p className="text-gray-400 text-sm mt-0.5">{today}</p>
        <p className="text-xs text-gray-500 mt-0.5">Provider: {sampleProvider.name} · {sampleProvider.specialty} · {sampleProvider.credentials}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <StatCard label="Patients Today" value={stats.patientsToday} color="text-blue-400" />
        <StatCard label="Completed" value={stats.completedEncounters} color="text-green-400" />
        <StatCard label="Pending Signatures" value={stats.pendingSignatures} color="text-yellow-400" />
        <StatCard label="Est. Revenue" value={`$${stats.estimatedRevenue.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Avg Encounter" value={`${stats.avgEncounterTime}m`} color="text-purple-400" />
        <StatCard label="Patient Satisfaction" value={`${stats.patientSatisfaction}/5`} color="text-pink-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">Today&apos;s Schedule</h2>
          <div className="space-y-2">
            {sampleAppointments.map(apt => {
              const patient = samplePatients.find(p => p.id === apt.patientId)!;
              const time = new Date(apt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
              return (
                <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-gray-400 w-12">{time}</span>
                    <div>
                      <p className="text-sm font-medium text-white">{patient.name}</p>
                      <p className="text-xs text-gray-400">{patient.primaryComplaint}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">{patient.insuranceProvider}</span>
                    <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", apt.status === "checked-in" ? "bg-green-900/40 text-green-400" : "bg-gray-700 text-gray-400")}>
                      {apt.status.replace("-", " ")}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">System Status</h2>
              <span className="text-xs text-green-400 bg-green-900/20 px-2 py-0.5 rounded-full border border-green-700/40">All Systems Go</span>
            </div>
            <div className="space-y-2">
              {[
                { label: "AI Engine", status: "Online", color: "text-green-400" },
                { label: `EHR (${sampleProvider.ehrSystem})`, status: "Connected", color: "text-green-400" },
                { label: "Insurance Verification", status: "Active", color: "text-green-400" },
                { label: "Revenue Tracking", status: "Live", color: "text-blue-400" },
              ].map(item => (
                <div key={item.label} className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{item.label}</span>
                  <span className={`text-xs font-medium ${item.color}`}>{item.status}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">Top Revenue Opportunities</h2>
            <div className="space-y-2">
              {sampleRevenueOpportunities.slice(0, 3).map(opp => (
                <div key={opp.id} className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-400 flex-1">{opp.opportunityType}</p>
                  <span className="text-xs font-bold text-emerald-400 flex-shrink-0">${opp.estimatedRevenue}</span>
                </div>
              ))}
              <p className="text-xs text-gray-600 mt-1">{sampleRevenueOpportunities.length} total opportunities identified</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-semibold text-white mb-3">Scope Alerts</h2>
            <div className="space-y-2">
              {sampleScopeAlerts.map(alert => (
                <div key={alert.id} className="flex items-start justify-between gap-2">
                  <p className="text-xs text-gray-400 flex-1">{alert.procedure}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded flex-shrink-0 ${alert.riskLevel === "high" ? "bg-red-900/40 text-red-400" : alert.riskLevel === "medium" ? "bg-yellow-900/40 text-yellow-400" : "bg-green-900/40 text-green-400"}`}>{alert.riskLevel}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">Rx</div>
            <div>
              <p className="font-semibold text-white text-sm">PrognoSX</p>
              <p className="text-xs text-gray-400">AI Medical Intelligence</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors text-left",
                activeTab === tab.id ? "bg-blue-600/20 text-blue-400 font-medium" : "text-gray-400 hover:text-white hover:bg-gray-800"
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

      {/* Content */}
      <main className="flex-1 overflow-y-auto bg-gray-950">
        {activeTab === "dashboard" && <DashboardHome />}
        {activeTab === "pre-visit" && <PreVisitTab />}
        {activeTab === "scope" && <ScopeValidationTab />}
        {activeTab === "care-planning" && <CarePlanningTab />}
        {activeTab === "briefing" && <ProtectiveBriefingTab />}
        {activeTab === "insurance" && <InsuranceTab />}
        {activeTab === "revenue" && <RevenueTab />}
        {activeTab === "patients" && <PatientsTab />}
        {activeTab === "appointments" && <AppointmentsTab />}
        {activeTab === "ehr" && <EhrIntegrationTab />}
        {activeTab === "settings" && <SettingsTab />}
      </main>
    </div>
  );
}
