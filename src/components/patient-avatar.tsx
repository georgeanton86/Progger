"use client";
import type { Patient } from "@/lib/types";

// ── Condition → visual theme ─────────────────────────────────────────────────
function conditionTheme(patient: Patient) {
  const blob = [...(patient.medicalHistory ?? []), patient.primaryComplaint ?? ""].join(" ").toLowerCase();

  if (blob.includes("chf") || blob.includes("systolic"))
    return { bg: "#DC2626", light: "#FEE2E2", badge: "❤️", label: "Cardiac Patient" };
  if (blob.includes("copd") || blob.includes("asthma") || blob.includes("cough") || blob.includes("respiratory"))
    return { bg: "#0284C7", light: "#DBEAFE", badge: "🫁", label: "Respiratory Patient" };
  if (blob.includes("diabetes") || blob.includes("prediabet") || blob.includes("a1c"))
    return { bg: "#D97706", light: "#FEF3C7", badge: "💉", label: "Metabolic Patient" };
  if (blob.includes("anxiety") || blob.includes("depression") || blob.includes("migraine"))
    return { bg: "#7C3AED", light: "#EDE9FE", badge: "🧠", label: "Neurological Patient" };
  if (blob.includes("obesity") || blob.includes("weight") || blob.includes("bmi"))
    return { bg: "#F59E0B", light: "#FEF3C7", badge: "⚖️", label: "Weight Management" };
  if (blob.includes("hypertension") || blob.includes("htn"))
    return { bg: "#2563EB", light: "#DBEAFE", badge: "🩺", label: "Cardiovascular Patient" };
  if (blob.includes("back") || blob.includes("injury") || blob.includes("pain"))
    return { bg: "#16A34A", light: "#DCFCE7", badge: "🦴", label: "Active Worker" };
  if (blob.includes("annual") || blob.includes("physical"))
    return { bg: "#0D9488", light: "#CCFBF1", badge: "🩺", label: "Preventive Care" };
  return { bg: "#0D9488", light: "#CCFBF1", badge: "🩺", label: "Primary Care Patient" };
}

function faceEmoji(patient: Patient): string {
  const firstName = patient.name.split(" ")[0].toLowerCase();
  const isFemale = ["sarah", "jennifer", "maria", "amanda", "emily", "jessica", "kara", "lisa", "mary", "susan"].some(n => firstName.startsWith(n));
  if (patient.age >= 65) return isFemale ? "👵" : "👴";
  if (patient.age >= 45) return isFemale ? "👩" : "👨";
  if (patient.age >= 25) return isFemale ? "👩" : "👨";
  return isFemale ? "👧" : "👦";
}

// ── Public avatar component ───────────────────────────────────────────────────
export function PatientAvatar({ patient, size = 48 }: { patient: Patient; size?: number }) {
  const theme = conditionTheme(patient);
  const face = faceEmoji(patient);
  const badgeSize = Math.round(size * 0.36);
  const fontSize = Math.round(size * 0.52);
  const badgeFontSize = Math.round(size * 0.22);

  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      <div
        className="w-full h-full rounded-full flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.bg} 100%)` }}
      >
        <span style={{ fontSize, lineHeight: 1, userSelect: "none" }} role="img" aria-label={theme.label}>
          {face}
        </span>
      </div>
      {size >= 44 && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white shadow border border-white flex items-center justify-center"
          style={{ width: badgeSize, height: badgeSize, fontSize: badgeFontSize, lineHeight: 1 }}
        >
          {theme.badge}
        </div>
      )}
    </div>
  );
}

// ── Patient Health Card (full modal) ─────────────────────────────────────────
export function PatientHealthCard({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const theme = conditionTheme(patient);
  const face = faceEmoji(patient);
  const haAllergies = (patient.allergies ?? []).filter(a => a !== "None");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Hero header */}
        <div
          className="relative p-5 pb-4"
          style={{ background: `linear-gradient(140deg, ${theme.light} 0%, ${theme.bg} 100%)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-bold hover:bg-white/50 transition-colors"
          >✕</button>

          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{patient.name}</h2>
              <p className="text-white/80 text-sm mt-0.5">{patient.age}-Year-Old {theme.label}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {patient.medicalHistory.slice(0, 4).map(h => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">{h}</span>
                ))}
              </div>
            </div>
            <div
              className="flex-shrink-0 w-24 h-24 rounded-full flex items-center justify-center shadow-xl border-4 border-white/40"
              style={{ background: `linear-gradient(135deg, ${theme.light} 0%, ${theme.bg} 100%)` }}
            >
              <span style={{ fontSize: 52, lineHeight: 1 }}>{face}</span>
            </div>
          </div>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
          {[
            { label: "Insurance", value: patient.insuranceProvider },
            { label: "Est. Revenue", value: `$${patient.revenuePerVisit}`, color: "text-emerald-600" },
            { label: "Pay Reliability", value: `${patient.paymentReliability}%`, color: "text-blue-600" },
          ].map(s => (
            <div key={s.label} className="px-3 py-2.5 text-center">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-sm font-bold truncate ${s.color ?? "text-gray-800"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Allergies */}
        {haAllergies.length > 0 && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 flex-wrap">
            <span className="text-red-500 font-bold text-xs">⚠ ALLERGIES:</span>
            {haAllergies.map(a => (
              <span key={a} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full">{a}</span>
            ))}
          </div>
        )}

        {/* Medications */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Current Medications</h3>
          <div className="space-y-2">
            {patient.medications.map(med => (
              <div key={med} className="flex items-center gap-2.5">
                <span className="text-lg leading-none">💊</span>
                <span className="text-sm text-gray-700 font-medium">{med}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Today's visit */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Today&apos;s Visit</h3>
          <div className="flex items-center gap-3 p-3 rounded-xl border border-teal-200 bg-teal-50 mb-2.5">
            <span className="text-2xl leading-none">🏥</span>
            <p className="text-sm font-semibold text-teal-800">{patient.primaryComplaint}</p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">{patient.hpiPreview.slice(0, 140)}…</p>
        </div>

        {/* Value metrics */}
        <div className="px-5 py-4">
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Patient Value Profile</h3>
          <div className="space-y-2">
            {[
              { label: "Value Score", value: patient.valueScore, color: "bg-teal-500" },
              { label: "Payment Reliability", value: patient.paymentReliability, color: "bg-emerald-500" },
              { label: "No-Show Risk", value: 100 - patient.noShowRate * 5, color: "bg-blue-500" },
            ].map(m => (
              <div key={m.label}>
                <div className="flex justify-between mb-0.5">
                  <span className="text-xs text-gray-500">{m.label}</span>
                  <span className="text-xs font-semibold text-gray-700">{m.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${m.color}`} style={{ width: `${m.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
