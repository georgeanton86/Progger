"use client";
import { useState } from "react";
import { sampleAppointments, samplePatients } from "@/lib/sampleData";
import { cn } from "@/lib/utils";
import type { Appointment, Patient } from "@/lib/types";

type AptWithPatient = Appointment & { patient: Patient; timeStr: string };

const statusColors: Record<string, string> = {
  "scheduled": "text-gray-400 bg-gray-800 border-gray-700",
  "checked-in": "text-green-400 bg-green-900/20 border-green-700/40",
  "in-progress": "text-teal-400 bg-teal-900/20 border-teal-700/40",
  "completed": "text-purple-400 bg-purple-900/20 border-purple-700/40",
  "no-show": "text-red-400 bg-red-900/20 border-red-700/40",
  "cancelled": "text-orange-400 bg-orange-900/20 border-orange-700/40",
};

const statuses = ["scheduled", "checked-in", "in-progress", "completed", "no-show", "cancelled"];

function AppointmentRow({ apt, onStatusChange }: { apt: AptWithPatient; onStatusChange: (id: string, status: string) => void }) {
  const [showActions, setShowActions] = useState(false);

  return (
    <div className={cn("p-4 rounded-xl border transition-all", apt.status === "checked-in" ? "border-green-700/40 bg-green-900/5" : apt.status === "completed" ? "border-purple-700/30 bg-gray-900/50" : "border-gray-800 bg-gray-900/50")}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className="text-center w-14 flex-shrink-0">
            <p className="text-lg font-bold text-white font-mono">{apt.timeStr}</p>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-white">{apt.patient.name}</p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full border capitalize", statusColors[apt.status] || statusColors["scheduled"])}>
                {apt.status.replace("-", " ")}
              </span>
              {apt.insuranceVerified && <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-900/20 text-emerald-400 border border-emerald-700/40">✓ Insurance Verified</span>}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{apt.patient.primaryComplaint} · {apt.patient.insuranceProvider} {apt.patient.insurancePlan}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-emerald-400">${apt.estimatedRevenue}</p>
            <p className="text-xs text-gray-500">est. revenue</p>
          </div>
          <div className="relative">
            <button onClick={() => setShowActions(!showActions)} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs rounded-lg transition-colors">
              Update Status ▾
            </button>
            {showActions && (
              <div className="absolute right-0 top-full mt-1 bg-gray-900 border border-gray-700 rounded-xl shadow-xl z-10 overflow-hidden min-w-[160px]">
                {statuses.map(s => (
                  <button key={s} onClick={() => { onStatusChange(apt.id, s); setShowActions(false); }} className={cn("w-full text-left px-4 py-2.5 text-xs capitalize hover:bg-gray-800 transition-colors", apt.status === s ? "text-teal-400 bg-teal-900/20" : "text-gray-300")}>
                    {s.replace("-", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-800/50">
        <div className="text-center">
          <p className="text-xs text-gray-600">Value Score</p>
          <p className="text-xs font-semibold text-teal-400">{apt.patient.valueScore}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Payment Reliability</p>
          <p className="text-xs font-semibold text-green-400">{apt.patient.paymentReliability}%</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-600">Pre-Visit</p>
          <p className="text-xs font-semibold">{apt.preVisitComplete ? <span className="text-green-400">Complete</span> : <span className="text-yellow-400">Pending</span>}</p>
        </div>
      </div>
    </div>
  );
}

export function AppointmentsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [appointments, setAppointments] = useState(sampleAppointments);

  const enriched: AptWithPatient[] = appointments.map(a => ({
    ...a,
    patient: samplePatients.find(p => p.id === a.patientId)!,
    timeStr: new Date(a.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  const filtered = enriched.filter(a => statusFilter === "all" || a.status === statusFilter);

  const counts = statuses.reduce((acc, s) => ({ ...acc, [s]: enriched.filter(a => a.status === s).length }), {} as Record<string, number>);
  const totalRevenue = enriched.filter(a => a.status === "completed" || a.status === "checked-in").reduce((s, a) => s + parseFloat(a.estimatedRevenue || "0"), 0);

  function updateStatus(id: string, status: string) {
    setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
  }

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Appointments</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Total Scheduled</p>
          <p className="text-2xl font-bold text-white mt-1">{enriched.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Checked In</p>
          <p className="text-2xl font-bold text-green-400 mt-1">{counts["checked-in"] || 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Completed</p>
          <p className="text-2xl font-bold text-purple-400 mt-1">{counts["completed"] || 0}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <p className="text-xs text-gray-500">Revenue Captured</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">${totalRevenue.toFixed(0)}</p>
        </div>
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap mb-4">
        <button onClick={() => setStatusFilter("all")} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors", statusFilter === "all" ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
          All ({enriched.length})
        </button>
        {statuses.map(s => (counts[s] > 0 || true) && (
          <button key={s} onClick={() => setStatusFilter(s)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors", statusFilter === s ? "bg-teal-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white")}>
            {s.replace("-", " ")} {counts[s] ? `(${counts[s]})` : "(0)"}
          </button>
        ))}
      </div>

      {/* Appointment list */}
      <div className="space-y-3">
        {filtered.map(apt => (
          <AppointmentRow key={apt.id} apt={apt} onStatusChange={updateStatus} />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500 text-sm bg-gray-900 border border-gray-800 rounded-xl">
            No appointments with status &quot;{statusFilter}&quot;.
          </div>
        )}
      </div>

      {/* Quick stats bar */}
      <div className="mt-6 bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="text-sm font-medium text-white mb-3">Daily Performance</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-gray-500">Completion Rate</p>
            <p className="text-sm font-bold text-green-400">{enriched.length > 0 ? Math.round(((counts["completed"] || 0) / enriched.length) * 100) : 0}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">No-Show Rate</p>
            <p className="text-sm font-bold text-red-400">{enriched.length > 0 ? Math.round(((counts["no-show"] || 0) / enriched.length) * 100) : 0}%</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Insurance Verified</p>
            <p className="text-sm font-bold text-teal-400">{enriched.filter(a => a.insuranceVerified).length}/{enriched.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Pre-Visit Complete</p>
            <p className="text-sm font-bold text-purple-400">{enriched.filter(a => a.preVisitComplete).length}/{enriched.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
