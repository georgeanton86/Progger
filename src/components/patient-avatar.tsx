"use client";
import type { Patient } from "@/lib/types";

// ── Skin palette ────────────────────────────────────────────────────────────
const SKIN = [
  { base: "#FDDBB4", dark: "#C07840", lip: "#D4756A" },
  { base: "#F5C89A", dark: "#B86830", lip: "#C06058" },
  { base: "#E8B88A", dark: "#A85828", lip: "#B05048" },
  { base: "#D4956A", dark: "#9A5030", lip: "#A05048" },
  { base: "#C07848", dark: "#804020", lip: "#8B4040" },
];

// ── Eye colours ─────────────────────────────────────────────────────────────
const EYES = ["#3B2A1A", "#1D4ED8", "#065F46", "#1F2937", "#7C3AED", "#0369A1"];

// ── Condition → visual theme ─────────────────────────────────────────────────
function conditionTheme(patient: Patient) {
  const blob = [...patient.medicalHistory, patient.primaryComplaint ?? ""]
    .join(" ")
    .toLowerCase();

  if (blob.includes("chf") || blob.includes("systolic"))
    return { g1: "#FCA5A5", g2: "#DC2626", badge: "❤️", clothes: "#991B1B", label: "Cardiac Patient" };
  if (blob.includes("copd") || blob.includes("asthma") || blob.includes("cough") || blob.includes("respiratory"))
    return { g1: "#BAE6FD", g2: "#0284C7", badge: "🫁", clothes: "#1D4ED8", label: "Respiratory Patient" };
  if (blob.includes("diabetes") || blob.includes("prediabet") || blob.includes("a1c"))
    return { g1: "#FDE68A", g2: "#D97706", badge: "💉", clothes: "#B45309", label: "Metabolic Patient" };
  if (blob.includes("anxiety") || blob.includes("depression") || blob.includes("migraine"))
    return { g1: "#DDD6FE", g2: "#7C3AED", badge: "🧠", clothes: "#5B21B6", label: "Neurological Patient" };
  if (blob.includes("obesity") || blob.includes("weight") || blob.includes("bmi"))
    return { g1: "#FDE68A", g2: "#F59E0B", badge: "⚖️", clothes: "#B45309", label: "Weight Management Patient" };
  if (blob.includes("hypertension") || blob.includes("htn"))
    return { g1: "#BFDBFE", g2: "#2563EB", badge: "🩺", clothes: "#1E40AF", label: "Cardiovascular Patient" };
  if (blob.includes("back") || blob.includes("injury") || blob.includes("pain"))
    return { g1: "#BBF7D0", g2: "#16A34A", badge: "🦴", clothes: "#166534", label: "Active Worker" };
  if (blob.includes("annual") || blob.includes("physical"))
    return { g1: "#99F6E4", g2: "#0D9488", badge: "🩺", clothes: "#0F766E", label: "Preventive Care" };
  return { g1: "#99F6E4", g2: "#0D9488", badge: "🩺", clothes: "#0F766E", label: "Primary Care Patient" };
}

// ── Derive avatar config from patient data ───────────────────────────────────
function avatarConfig(patient: Patient) {
  const seed = patient.name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const skin = SKIN[seed % SKIN.length];
  const eyeColor = EYES[Math.floor(seed / 7) % EYES.length];

  const hairColor =
    patient.age >= 65 ? "#C4C8D0" :
    patient.age >= 55 ? "#7B7F8A" :
    seed % 5 === 0 ? "#0F172A" :
    seed % 5 === 1 ? "#1F2937" :
    seed % 5 === 2 ? "#7C2D12" :
    seed % 5 === 3 ? "#44403C" : "#292524";

  const firstName = patient.name.split(" ")[0].toLowerCase();
  const isFemale = ["sarah", "jennifer", "maria", "amanda", "emily", "jessica", "kara", "lisa", "mary", "susan"].some(n => firstName.startsWith(n));

  return { ...skin, eyeColor, hairColor, isFemale, ...conditionTheme(patient) };
}

// ── Core SVG face ─────────────────────────────────────────────────────────────
function FaceSVG({ patient, uid }: { patient: Patient; uid: string }) {
  const p = avatarConfig(patient);
  const senior = patient.age >= 60;

  return (
    <svg width="100%" height="100%" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <clipPath id={`cp${uid}`}>
          <circle cx="50" cy="50" r="50" />
        </clipPath>
      </defs>

      {/* Background — two-tone split for depth without gradient (mobile-safe) */}
      <circle cx="50" cy="50" r="50" fill={p.g2} />
      <ellipse cx="50" cy="22" rx="50" ry="32" fill={p.g1} opacity="0.6" />

      <g clipPath={`url(#cp${uid})`}>
        {/* Clothes / shoulders */}
        <ellipse cx="50" cy="108" rx="48" ry="26" fill={p.clothes} />
        <rect x="2" y="90" width="96" height="20" fill={p.clothes} />

        {/* Neck */}
        <rect x="43" y="74" width="14" height="19" rx="5" fill={p.base} />

        {/* Long hair back (female) */}
        {p.isFemale && (
          <>
            <path d="M 20 50 C 14 66 16 84 20 102 L 30 102 C 26 84 26 66 30 52 Z" fill={p.hairColor} />
            <path d="M 80 50 C 86 66 84 84 80 102 L 70 102 C 74 84 74 66 70 52 Z" fill={p.hairColor} />
          </>
        )}

        {/* Face */}
        <ellipse cx="50" cy="55" rx="27" ry="31" fill={p.base} />

        {/* Ears */}
        <ellipse cx="23" cy="56" rx="5" ry="7" fill={p.base} />
        <ellipse cx="77" cy="56" rx="5" ry="7" fill={p.base} />
        <ellipse cx="23" cy="56" rx="2.5" ry="4" fill={p.dark} opacity="0.22" />
        <ellipse cx="77" cy="56" rx="2.5" ry="4" fill={p.dark} opacity="0.22" />

        {/* Hair top */}
        {p.isFemale ? (
          <path d="M 23 54 C 22 30 34 19 50 18 C 66 19 78 30 77 54 C 72 40 50 36 28 40 Z" fill={p.hairColor} />
        ) : (
          <path d="M 27 51 C 26 28 35 20 50 19 C 65 20 74 28 73 51 C 70 36 50 33 30 36 Z" fill={p.hairColor} />
        )}

        {/* Blush */}
        <ellipse cx="34" cy="64" rx="7" ry="4" fill="#FF8080" opacity="0.18" />
        <ellipse cx="66" cy="64" rx="7" ry="4" fill="#FF8080" opacity="0.18" />

        {/* Left eye */}
        <ellipse cx="40" cy="52" rx="8" ry="6.5" fill="white" />
        <circle cx="41" cy="52" r="5" fill={p.eyeColor} />
        <circle cx="41" cy="52" r="3" fill="#060614" />
        <circle cx="39.5" cy="50.5" r="1.6" fill="white" opacity="0.9" />
        <circle cx="42.5" cy="53.5" r="0.7" fill="white" opacity="0.6" />

        {/* Right eye */}
        <ellipse cx="60" cy="52" rx="8" ry="6.5" fill="white" />
        <circle cx="59" cy="52" r="5" fill={p.eyeColor} />
        <circle cx="59" cy="52" r="3" fill="#060614" />
        <circle cx="57.5" cy="50.5" r="1.6" fill="white" opacity="0.9" />
        <circle cx="60.5" cy="53.5" r="0.7" fill="white" opacity="0.6" />

        {/* Eyebrows */}
        <path d={`M 32 44 Q 40 ${p.isFemale ? 41 : 40} 47 44`} stroke={p.hairColor} strokeWidth={p.isFemale ? "2" : "2.5"} fill="none" strokeLinecap="round" />
        <path d={`M 53 44 Q 60 ${p.isFemale ? 41 : 40} 68 44`} stroke={p.hairColor} strokeWidth={p.isFemale ? "2" : "2.5"} fill="none" strokeLinecap="round" />

        {/* Nose */}
        <circle cx="47" cy="61" r="1.2" fill={p.dark} opacity="0.4" />
        <circle cx="53" cy="61" r="1.2" fill={p.dark} opacity="0.4" />

        {/* Mouth */}
        <path d="M 43 68 Q 50 74 57 68" stroke={p.lip} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        <path d="M 44 68 Q 47 65.5 50 66 Q 53 65.5 56 68" stroke={p.lip} strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.45" />

        {/* Senior wrinkle hints */}
        {senior && (
          <>
            <path d="M 29 69 Q 33 66 37 69" stroke={p.dark} strokeWidth="0.6" fill="none" opacity="0.28" />
            <path d="M 63 69 Q 67 66 71 69" stroke={p.dark} strokeWidth="0.6" fill="none" opacity="0.28" />
          </>
        )}
      </g>
    </svg>
  );
}

// ── Public avatar component ───────────────────────────────────────────────────
export function PatientAvatar({ patient, size = 48 }: { patient: Patient; size?: number }) {
  const { badge } = avatarConfig(patient);
  const badgeSize = Math.round(size * 0.36);
  const badgeFontSize = Math.round(size * 0.2);

  return (
    <div className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
      <div className="w-full h-full rounded-full overflow-hidden" style={{ width: size, height: size }}>
        <FaceSVG patient={patient} uid={`${patient.id}-${size}`} />
      </div>
      {size >= 44 && (
        <div
          className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white shadow border border-white flex items-center justify-center"
          style={{ width: badgeSize, height: badgeSize, fontSize: badgeFontSize }}
        >
          {badge}
        </div>
      )}
    </div>
  );
}

// ── Patient Health Card (full modal — inspired by illustrated lab report) ──────
export function PatientHealthCard({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  const cfg = avatarConfig(patient);
  const lifestyle = cfg.label;

  const haAllergies = patient.allergies.filter(a => a !== "None");

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
          style={{ background: `linear-gradient(140deg, ${cfg.g1} 0%, ${cfg.g2} 100%)` }}
        >
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/30 flex items-center justify-center text-white text-xs font-bold hover:bg-white/50 transition-colors"
          >✕</button>

          <div className="flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-extrabold text-white leading-tight drop-shadow">{patient.name}</h2>
              <p className="text-white/80 text-sm mt-0.5">{patient.age}-Year-Old {lifestyle}</p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {patient.medicalHistory.slice(0, 4).map(h => (
                  <span key={h} className="text-xs px-2 py-0.5 rounded-full bg-white/25 text-white backdrop-blur-sm">
                    {h}
                  </span>
                ))}
              </div>
            </div>
            {/* Large illustrated avatar */}
            <div className="flex-shrink-0">
              <PatientAvatar patient={patient} size={96} />
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
          {[
            { label: "Insurance", value: `${patient.insuranceProvider}` },
            { label: "Est. Revenue", value: `$${patient.revenuePerVisit}`, color: "text-emerald-600" },
            { label: "Pay Reliability", value: `${patient.paymentReliability}%`, color: "text-blue-600" },
          ].map(s => (
            <div key={s.label} className="px-3 py-2.5 text-center">
              <p className="text-xs text-gray-400">{s.label}</p>
              <p className={`text-sm font-bold truncate ${s.color ?? "text-gray-800"}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Allergies (red alert row) */}
        {haAllergies.length > 0 && (
          <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex items-center gap-2 flex-wrap">
            <span className="text-red-500 font-bold text-xs">⚠ ALLERGIES:</span>
            {haAllergies.map(a => (
              <span key={a} className="text-xs px-2 py-0.5 bg-red-100 text-red-700 border border-red-200 rounded-full">{a}</span>
            ))}
          </div>
        )}

        {/* Current Medications */}
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
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2.5">Today's Visit</h3>
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
              { label: "Value Score", value: patient.valueScore, max: 100, color: "bg-teal-500" },
              { label: "Payment Reliability", value: patient.paymentReliability, max: 100, color: "bg-emerald-500" },
              { label: "No-Show Risk", value: 100 - patient.noShowRate * 5, max: 100, color: "bg-blue-500" },
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
