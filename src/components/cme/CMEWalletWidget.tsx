"use client";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  loadCMEStore, saveCMEStore, getCycleStats, updateLicense, resetCycle,
  LICENSE_CONFIG, LicenseType, CMEStore,
} from "@/lib/cme";

// ── Progress ring (pure CSS/SVG) ──────────────────────────────────────────────

function ProgressRing({ pct, color, size = 64 }: { pct: number; color: string; size?: number }) {
  const r  = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ * (pct / 100);
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1f2937" strokeWidth="5" />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }}
      />
    </svg>
  );
}

// ── License selector ──────────────────────────────────────────────────────────

function LicenseSetup({ onSelect }: { onSelect: (l: LicenseType) => void }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Select your license to start tracking CME</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.entries(LICENSE_CONFIG) as [LicenseType, typeof LICENSE_CONFIG[LicenseType]][]).map(([type, cfg]) => (
          <button
            key={type}
            onClick={() => onSelect(type)}
            className="p-3.5 rounded-xl border border-gray-700 hover:border-blue-800/60 hover:bg-blue-950/10 text-left transition-all group"
          >
            <p className="text-sm font-black text-white group-hover:text-blue-200 transition-colors">{cfg.label}</p>
            <p className="text-xs text-gray-500 mt-0.5 leading-snug">{cfg.fullLabel}</p>
            <p className="text-xs mt-1.5 font-semibold" style={{ color: cfg.color }}>
              {cfg.cycleCredits} {cfg.unit} / {cfg.cycleDays === 365 ? "year" : "2 years"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Main widget ───────────────────────────────────────────────────────────────

export function CMEWalletWidget({ refreshKey = 0 }: { refreshKey?: number }) {
  const [store, setStore]     = useState<CMEStore | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const reload = useCallback(() => {
    const s = loadCMEStore();
    setStore(s);
    setShowSetup(!s.licenseType);
  }, []);

  useEffect(() => { reload(); }, [reload, refreshKey]);

  if (!store) return null;

  const cfg   = LICENSE_CONFIG[store.licenseType];
  const stats = getCycleStats(store);

  const handleLicenseSelect = (l: LicenseType) => {
    updateLicense(l);
    setShowSetup(false);
    reload();
  };

  if (showSetup) {
    return (
      <div className="rounded-2xl border border-gray-800 bg-gray-900/60 overflow-hidden">
        <button
          onClick={() => setShowSetup(false)}
          className="w-full flex items-center gap-2 px-4 py-3 hover:bg-gray-800/30 transition-colors"
        >
          <span className="text-base">🎓</span>
          <span className="text-sm font-bold text-white flex-1 text-left">CME Wallet</span>
          <span className="text-xs text-blue-300 font-semibold">Set up →</span>
        </button>
        <div className="border-t border-gray-800">
          <LicenseSetup onSelect={handleLicenseSelect} />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border overflow-hidden transition-all duration-200"
      style={{ borderColor: `${cfg.color}30` }}>

      {/* Collapsed summary bar */}
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
        style={{ background: `linear-gradient(135deg, ${cfg.color}08, transparent)` }}
      >
        <div className="relative flex-shrink-0">
          <ProgressRing pct={stats.pct} color={cfg.color} size={44} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-black" style={{ color: cfg.color }}>{stats.pct}%</span>
          </div>
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-white leading-none">
            {stats.earned} <span className="text-gray-500 font-normal">/ {stats.required} {stats.unit}</span>
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-none">
            {cfg.label} · {stats.daysLeft}d left in cycle
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold px-2 py-1 rounded-full border text-white"
            style={{ borderColor: `${cfg.color}50`, background: `${cfg.color}15`, color: cfg.color }}>
            🎓 CME
          </span>
          <span className={cn("text-gray-600 text-sm transition-transform duration-200", expanded && "rotate-180")}>▾</span>
        </div>
      </button>

      {/* Expanded dashboard */}
      {expanded && (
        <div className="border-t space-y-4 p-4" style={{ borderColor: `${cfg.color}20` }}>

          {/* Big ring + stats */}
          <div className="flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <ProgressRing pct={stats.pct} color={cfg.color} size={88} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-white">{stats.earned}</span>
                <span className="text-xs text-gray-500 leading-none">{stats.unit.split(" ")[0]}</span>
              </div>
            </div>
            <div className="space-y-2 flex-1">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-gray-800/50 rounded-xl p-2.5">
                  <p className="text-gray-500 mb-0.5">Remaining</p>
                  <p className="font-black text-white">{stats.remaining}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-2.5">
                  <p className="text-gray-500 mb-0.5">Cycle ends</p>
                  <p className="font-black text-white text-xs">{stats.cycleEnd}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-2.5">
                  <p className="text-gray-500 mb-0.5">Sessions</p>
                  <p className="font-black text-white">{stats.sessionCount}</p>
                </div>
                <div className="bg-gray-800/50 rounded-xl p-2.5">
                  <p className="text-gray-500 mb-0.5">License</p>
                  <p className="font-black" style={{ color: cfg.color }}>{cfg.label}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Source breakdown */}
          {Object.keys(stats.bySource).length > 0 && (
            <div>
              <p className="text-xs font-extrabold text-gray-600 uppercase tracking-widest mb-2">By Source</p>
              <div className="space-y-1.5">
                {Object.entries(stats.bySource).map(([src, credits]) => {
                  const pct = Math.round((credits / stats.required) * 100);
                  return (
                    <div key={src} className="flex items-center gap-2">
                      <p className="text-xs text-gray-400 w-32 flex-shrink-0 truncate">{src}</p>
                      <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: cfg.color }} />
                      </div>
                      <p className="text-xs font-bold text-gray-400 w-10 text-right flex-shrink-0">
                        {credits.toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recent sessions */}
          {store.sessions.length > 0 && (
            <div>
              <p className="text-xs font-extrabold text-gray-600 uppercase tracking-widest mb-2">Recent Activity</p>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {store.sessions.slice(0, 8).map(s => {
                  const correct = s.questions.filter((q, i) => s.answers[i] === q.correct).length;
                  return (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-gray-800/40 border border-gray-700/30">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-200 truncate">{s.topic}</p>
                        <p className="text-xs text-gray-600">{s.source} · {new Date(s.date).toLocaleDateString()}</p>
                      </div>
                      <div className="text-right flex-shrink-0 space-y-0.5">
                        <p className="text-xs font-black" style={{ color: cfg.color }}>+{s.creditsEarned}</p>
                        <p className="text-xs text-gray-600">{correct}/{s.questions.length} ✓</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {store.sessions.length === 0 && (
            <div className="py-4 text-center">
              <p className="text-xs text-gray-600">No CME sessions yet — answer questions after your next AI analysis to start earning credits.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowSetup(true); setExpanded(false); }}
              className="flex-1 py-2 text-xs rounded-xl border border-gray-700 text-gray-500 hover:text-white hover:border-gray-500 transition-colors"
            >
              Change License
            </button>
            <button
              onClick={() => {
                if (confirm("Reset CME cycle? This clears all session history for the current cycle.")) {
                  resetCycle();
                  reload();
                }
              }}
              className="flex-1 py-2 text-xs rounded-xl border border-gray-700 text-gray-500 hover:text-red-400 hover:border-red-700/50 transition-colors"
            >
              New Cycle
            </button>
          </div>

          <p className="text-xs text-gray-700 text-center leading-relaxed">
            PrognoSX CME tracks self-designated AMA Category 2 / contact hours.<br />
            Verify requirements with your state board or certifying body.
          </p>
        </div>
      )}
    </div>
  );
}
