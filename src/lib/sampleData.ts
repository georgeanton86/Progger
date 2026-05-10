import type { Patient, Appointment, DashboardStats, RevenueOpportunity, ScopeAlert, Provider } from "./types";

export const sampleProvider: Provider = {
  id: "prov-1",
  name: "Dr. Sarah Johnson",
  specialty: "Family Practice",
  credentials: "MD, ABFM",
  state: "California",
  ehrSystem: "Epic",
};

export const samplePatients: Patient[] = [
  {
    id: "p1",
    name: "Sarah Chen",
    age: 34,
    dateOfBirth: "1990-05-15",
    insuranceProvider: "Blue Cross",
    insurancePlan: "PPO",
    primaryComplaint: "Upper respiratory symptoms",
    medicalHistory: ["Seasonal allergies"],
    medications: ["Claritin"],
    allergies: ["Amoxicillin - rash"],
    valueScore: 85.0,
    paymentReliability: 98.5,
    noShowRate: 3.0,
    revenuePerVisit: 165.0,
  },
  {
    id: "p2",
    name: "Michael Rodriguez",
    age: 42,
    dateOfBirth: "1982-08-22",
    insuranceProvider: "Aetna",
    insurancePlan: "HMO",
    primaryComplaint: "Annual physical",
    medicalHistory: ["Hypertension"],
    medications: ["Lisinopril 10mg"],
    allergies: ["None"],
    valueScore: 92.0,
    paymentReliability: 95.0,
    noShowRate: 5.0,
    revenuePerVisit: 285.0,
  },
  {
    id: "p3",
    name: "Jennifer Thompson",
    age: 28,
    dateOfBirth: "1996-12-05",
    insuranceProvider: "Kaiser",
    insurancePlan: "HMO",
    primaryComplaint: "Chronic cough",
    medicalHistory: ["Asthma"],
    medications: ["Albuterol PRN"],
    allergies: ["Penicillin"],
    valueScore: 78.0,
    paymentReliability: 99.0,
    noShowRate: 2.0,
    revenuePerVisit: 195.0,
  },
  {
    id: "p4",
    name: "David Wilson",
    age: 55,
    dateOfBirth: "1969-03-18",
    insuranceProvider: "Medicare",
    insurancePlan: "Part B",
    primaryComplaint: "Bronchitis follow-up",
    medicalHistory: ["COPD"],
    medications: ["Spiriva"],
    allergies: ["Sulfa"],
    valueScore: 88.0,
    paymentReliability: 97.0,
    noShowRate: 8.0,
    revenuePerVisit: 220.0,
  },
];

const today = new Date().toISOString().split("T")[0];
export const sampleAppointments: Appointment[] = [
  { id: "a1", patientId: "p1", providerId: "prov-1", appointmentTime: `${today}T08:30:00Z`, visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "165.00" },
  { id: "a2", patientId: "p2", providerId: "prov-1", appointmentTime: `${today}T10:00:00Z`, visitType: "office-visit", status: "checked-in", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "285.00" },
  { id: "a3", patientId: "p3", providerId: "prov-1", appointmentTime: `${today}T13:30:00Z`, visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "195.00" },
  { id: "a4", patientId: "p4", providerId: "prov-1", appointmentTime: `${today}T15:00:00Z`, visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "220.00" },
];

export const sampleStats: DashboardStats = {
  patientsToday: 4,
  completedEncounters: 1,
  pendingSignatures: 2,
  estimatedRevenue: 865,
  avgEncounterTime: 18,
  patientSatisfaction: 4.7,
};

export const sampleRevenueOpportunities: RevenueOpportunity[] = [
  { id: "r1", opportunityType: "Annual Wellness Visit", description: "Medicare AWV due for David Wilson", estimatedRevenue: "185.00", category: "preventive", status: "pending" },
  { id: "r2", opportunityType: "Chronic Care Management", description: "CCM eligible: Michael Rodriguez (HTN)", estimatedRevenue: "62.00", category: "chronic", status: "pending" },
  { id: "r3", opportunityType: "Spirometry", description: "Pulmonary function test for Jennifer Thompson", estimatedRevenue: "120.00", category: "diagnostic", status: "pending" },
];

export const sampleScopeAlerts: ScopeAlert[] = [
  { id: "s1", procedure: "Spirometry interpretation", alertType: "documentation", riskLevel: "low", recommendation: "Ensure proper documentation of clinical indication" },
  { id: "s2", procedure: "Controlled substance prescribing", alertType: "compliance", riskLevel: "medium", recommendation: "Verify PDMP check prior to prescribing" },
];

export function getPatientWithTime(patientId: string) {
  const patient = samplePatients.find(p => p.id === patientId);
  const appt = sampleAppointments.find(a => a.patientId === patientId);
  if (!patient || !appt) return null;
  return {
    ...patient,
    appointment: appt,
    appointmentTime: new Date(appt.appointmentTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };
}
