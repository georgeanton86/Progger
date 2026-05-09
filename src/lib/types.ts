export type Provider = {
  id: string;
  name: string;
  specialty: string;
  npi: string;
  email: string;
};

export type Patient = {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dob: string;
  sex: "M" | "F" | "Other";
  phone: string;
  insurance: string;
  insuranceId: string;
  primaryDx: string;
  allergies: string[];
  medications: Medication[];
  encounters: Encounter[];
  appointments: Appointment[];
  createdAt: string;
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  prescriber: string;
  startDate: string;
  endDate?: string;
  active: boolean;
};

export type Encounter = {
  id: string;
  patientId: string;
  date: string;
  provider: string;
  chiefComplaint: string;
  soap: {
    subjective: string;
    objective: string;
    assessment: string;
    plan: string;
  };
  icdCodes: string[];
  cptCodes: string[];
  status: "draft" | "signed" | "billed";
  aiPreChart?: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  type: string;
  status: "scheduled" | "checked-in" | "in-progress" | "completed" | "cancelled";
  insurance: string;
  chiefComplaint: string;
};

export type ScopeAlert = {
  id: string;
  severity: "low" | "medium" | "high";
  category: string;
  message: string;
  recommendation: string;
};

export type DashboardStats = {
  patientsToday: number;
  completedEncounters: number;
  pendingSignatures: number;
  estimatedRevenue: number;
  avgEncounterTime: number;
  patientSatisfaction: number;
};
