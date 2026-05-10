"use client";
import { useState } from "react";
import { sampleAppointments, samplePatients } from "@/lib/sampleData";
import { StreamlinedEncounter } from "@/components/encounter/streamlined-encounter";
import { cn } from "@/lib/utils";
import type { Patient, Appointment } from "@/lib/types";

function ValueBadge({ score }: { score: number }) {
  const color = score >= 90 ? "text-green-400 bg-green-900/30 border-green-700/40" : score >= 80 ? "text-blue-400 bg-blue-900/30 border-blue-700/40" : "text-yellow-400 bg-yellow-900/30 border-yellow-700/40";
  return <span className={cn("text-xs px-2 py-0.5 rounded-full border font-semibold", color)}>{score}</span>;
}

export function PreVisitTab() {
  const [selected, setSelected] = useState<{ patient: Patient; appointment: Appointment } | null>(null);

  if (selected) {
    return (
      <StreamlinedEncounter
        patient={selected.patient}
        appointment={selected.appointment}
        onBack={() => setSelected(null)}
      />
    );
  }

  const sorted = [...sampleAppointments].sort((a, b) =>
    new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime()
  );

  return (
    <div className="p-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">Pre-Visit Charting</h1>
        <p className="text-sm text-gray-400 mt-0.5">{sorted.length} patients scheduled · Click a patient to open full encounter</p>
      </div>

      {/* Summary row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Patients", value: sorted.length, color: "text-white" },
          { label: "Checked In", value: sampleAppointments.filter(a => a.status === "checked-in").length, color: "text-green-400" },
          { label: "Pre-Visit Complete", value: sampleAppointments.filter(a => a.preVisitComplete).length, color: "text-blue-400" },
          { label: "Est. Revenue", value: `$${sampleAppointments.reduce((s, a) => s + parseFloat(a.estimatedRevenue || "0"), 0).toFixed(0)}`, color: "text-emerald-400" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={cn("text-2xl font-bold mt-1", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map(apt => {
          const patient = samplePatients.find(p => p.id === apt.patientId)!;
          if (!patient) return null;
          const time = new Date(apt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
          return (
            <button
              key={apt.id}
              onClick={() => setSelected({ patient, appointment: apt })}
              className={cn(
                "w-full text-left p-4 rounded-xl border transition-all hover:border-blue-500/50 hover:bg-blue-600/5 group",
                apt.status === "checked-in" ? "border-green-700/40 bg-green-900/5" : "border-gray-800 bg-gray-900/50"
              )}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="text-center w-16 flex-shrink-0">
                    <p className="text-lg font-bold font-mono text-white">{time}</p>
                    <p className="text-xs text-gray-500 capitalize">{apt.visitType.replace("-", " ")}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p className="text-base font-semibold text-white">{patient.name}</p>
                      <ValueBadge score={patient.valueScore} />
                      <span className={cn("text-xs px-2 py-0.5 rounded-full capitalize", apt.status === "checked-in" ? "bg-green-900/40 text-green-400" : "bg-gray-800 text-gray-500")}>
                        {apt.status.replace("-", " ")}
                      </span>
                    </div>
                    <p className="text-sm text-gray-400">{patient.primaryComplaint}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{patient.insuranceProvider} {patient.insurancePlan} · Age {patient.age}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6 flex-shrink-0">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-gray-500">Est. Revenue</p>
                    <p className="text-base font-bold text-emerald-400">${appointment_revenue(apt)}</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500">Pay Reliability</p>
                    <p className="text-sm font-semibold text-green-400">{patient.paymentReliability}%</p>
                  </div>
                  <div className="text-right hidden md:block">
                    <p className="text-xs text-gray-500">No-Show</p>
                    <p className={cn("text-sm font-semibold", patient.noShowRate > 10 ? "text-red-400" : "text-gray-400")}>{patient.noShowRate}%</p>
                  </div>
                  <div className="text-right hidden lg:block">
                    <p className="text-xs text-gray-500">Pre-Visit</p>
                    <p className={cn("text-xs font-medium", apt.preVisitComplete ? "text-blue-400" : "text-yellow-400")}>{apt.preVisitComplete ? "Complete" : "Pending"}</p>
                  </div>
                  <div className="text-blue-400 group-hover:text-blue-300 transition-colors text-lg">→</div>
                </div>
              </div>

              {/* Medication strip */}
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {patient.medications.map(m => (
                  <span key={m} className="text-xs px-2 py-0.5 bg-blue-900/20 text-blue-400 border border-blue-800/30 rounded">{m}</span>
                ))}
                {patient.allergies.filter(a => a !== "None").map(a => (
                  <span key={a} className="text-xs px-2 py-0.5 bg-red-900/20 text-red-400 border border-red-800/30 rounded">⚠ {a}</span>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function appointment_revenue(apt: Appointment) {
  return parseFloat(apt.estimatedRevenue || "0").toFixed(0);
}
