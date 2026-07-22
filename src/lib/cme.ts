// CME tracking — localStorage-backed, works across all PrognoSX apps

export type LicenseType = "MD" | "NP" | "PA" | "RN";
export type CMESource = "rAIdiology" | "Grand Rounds AI" | "gAIner" | "Document Extract" | "PrognoSX";

export interface CMEQuestion {
  q: string;
  options: string[];
  correct: string;
  explanation: string;
}

export interface CMESession {
  id: string;
  date: string;       // ISO
  source: CMESource;
  topic: string;
  questions: CMEQuestion[];
  answers: string[];  // user's answer per question
  creditsEarned: number;
}

export interface CMEStore {
  licenseType: LicenseType;
  cycleStart: string; // ISO date string  YYYY-MM-DD
  sessions: CMESession[];
}

export const LICENSE_CONFIG: Record<LicenseType, {
  label: string;
  fullLabel: string;
  cycleCredits: number;
  cycleDays: number;
  unit: string;
  body: string;
  color: string;
}> = {
  MD: {
    label: "MD / DO",
    fullLabel: "Physician (MD / DO)",
    cycleCredits: 50,
    cycleDays: 365,
    unit: "CME Credits",
    body: "AMA PRA Category 1 & 2",
    color: "#3b82f6",
  },
  NP: {
    label: "NP",
    fullLabel: "Nurse Practitioner",
    cycleCredits: 75,
    cycleDays: 730,
    unit: "Contact Hours",
    body: "ANCC / AANP",
    color: "#8b5cf6",
  },
  PA: {
    label: "PA-C",
    fullLabel: "Physician Assistant",
    cycleCredits: 100,
    cycleDays: 730,
    unit: "CME Credits",
    body: "NCCPA",
    color: "#06b6d4",
  },
  RN: {
    label: "RN",
    fullLabel: "Registered Nurse",
    cycleCredits: 30,
    cycleDays: 730,
    unit: "Contact Hours",
    body: "State board requirement",
    color: "#10b981",
  },
};

// Credits awarded per question
export const CREDITS_PER_CORRECT = 0.15;
export const CREDITS_PER_ATTEMPT = 0.10;

const KEY = "prognosx_cme_v1";

function defaultStore(): CMEStore {
  return {
    licenseType: "MD",
    cycleStart: new Date().toISOString().split("T")[0],
    sessions: [],
  };
}

export function loadCMEStore(): CMEStore {
  if (typeof window === "undefined") return defaultStore();
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CMEStore) : defaultStore();
  } catch {
    return defaultStore();
  }
}

export function saveCMEStore(store: CMEStore): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function addCMESession(session: CMESession): void {
  const store = loadCMEStore();
  store.sessions = [session, ...store.sessions];
  saveCMEStore(store);
}

export function updateLicense(licenseType: LicenseType): void {
  const store = loadCMEStore();
  store.licenseType = licenseType;
  saveCMEStore(store);
}

export function resetCycle(): void {
  const store = loadCMEStore();
  store.cycleStart = new Date().toISOString().split("T")[0];
  store.sessions = [];
  saveCMEStore(store);
}

// ── Derived stats ─────────────────────────────────────────────────────────────

export function getCycleStats(store: CMEStore) {
  const cfg = LICENSE_CONFIG[store.licenseType];
  const start = new Date(store.cycleStart);
  const end = new Date(store.cycleStart);
  end.setDate(end.getDate() + cfg.cycleDays);

  const cycleSessions = store.sessions.filter(s => {
    const d = new Date(s.date);
    return d >= start && d <= end;
  });

  const earned = cycleSessions.reduce((sum, s) => sum + s.creditsEarned, 0);
  const daysLeft = Math.max(0, Math.ceil((end.getTime() - Date.now()) / 86_400_000));
  const pct = Math.min(100, Math.round((earned / cfg.cycleCredits) * 100));

  const bySource = cycleSessions.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] ?? 0) + s.creditsEarned;
    return acc;
  }, {});

  return {
    earned: Math.round(earned * 100) / 100,
    required: cfg.cycleCredits,
    remaining: Math.max(0, Math.round((cfg.cycleCredits - earned) * 100) / 100),
    pct,
    daysLeft,
    cycleEnd: end.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    sessionCount: cycleSessions.length,
    bySource,
    unit: cfg.unit,
  };
}

export function calcSessionCredits(questions: CMEQuestion[], answers: string[]): number {
  const credits = questions.reduce((sum, q, i) => {
    const answered = answers[i] !== undefined;
    if (!answered) return sum;
    return sum + (answers[i] === q.correct ? CREDITS_PER_CORRECT : CREDITS_PER_ATTEMPT);
  }, 0);
  return Math.round(credits * 100) / 100;
}
