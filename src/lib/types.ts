export type Provider = {
  id: string;
  name: string;
  specialty: string;
  credentials: string;
  state: string;
  ehrSystem: string | null;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  dateOfBirth: string;
  insuranceProvider: string | null;
  insurancePlan: string | null;
  primaryComplaint: string | null;
  hpiPreview: string;
  medicalHistory: string[];
  medications: string[];
  allergies: string[];
  valueScore: number;
  paymentReliability: number;
  noShowRate: number;
  revenuePerVisit: number;
};

export type Appointment = {
  id: string;
  patientId: string;
  providerId: string;
  appointmentTime: string;
  visitType: string;
  status: string;
  preVisitComplete: boolean;
  scopeStatus: string;
  insuranceVerified: boolean;
  estimatedRevenue: string | null;
};

export type PatientWithAppointment = Patient & {
  appointment: Appointment;
  appointmentTime: string;
};

export type PatientEncounter = {
  id: string;
  patientId: string;
  appointmentId: string;
  chiefComplaint: string;
  hpi: string;
  ros: Record<string, string>;
  physicalExam: Record<string, string>;
  vitals: {
    bp: string; hr: string; temp: string; rr: string; o2sat: string; weight: string;
  };
  assessment: { code: string; description: string }[];
  plan: string[];
  icd10Codes: string[];
  cptCodes: string[];
  estimatedReimbursement: string;
  riskLevel: string;
  scopeStatus: string;
  progress: number;
  status: string;
};

export type ProviderBriefing = {
  satisfactionTips: string[];
  conversationStarters: string[];
  keyTalkingPoints: string[];
  patientConcerns: string[];
  redFlags: string[];
  quickWins: string[];
  culturalConsiderations: string[];
};

export type DashboardStats = {
  patientsToday: number;
  completedEncounters: number;
  pendingSignatures: number;
  estimatedRevenue: number;
  revenueToday: number;
  avgEncounterTime: number;
  patientSatisfaction: number;
};

export type RevenueOpportunity = {
  id: string;
  opportunityType: string;
  description: string;
  estimatedRevenue: string;
  category: string;
  status: string;
};

export type ScopeAlert = {
  id: string;
  procedure: string;
  alertType: string;
  riskLevel: string;
  recommendation: string | null;
};

export type LabResultStatus = "optimal" | "normal" | "borderline-low" | "borderline-high" | "low" | "high" | "critical";

export type LabResult = {
  name: string;
  value: number | string;
  unit: string;
  refRange: string;
  status: LabResultStatus;
  note?: string;
};

export type LabCategory = {
  name: string;
  icon: string;
  results: LabResult[];
};

export type PatientLabReview = {
  patientId: string;
  date: string;
  visitContext: string;
  protocol?: string;
  providerName: string;
  categories: LabCategory[];
  summary: string;
  recommendations: string[];
  followUp: string;
};
