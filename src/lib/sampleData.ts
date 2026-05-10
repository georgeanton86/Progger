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
    hpiPreview: "Called 8:15 AM — reported nasal congestion, sore throat, mild fever x 3 days. PrognoSX pre-chart built at 8:16 AM. Chart complete, Rx ready, DDX generated before patient arrives. First appointment 10:30 AM.",
    medicalHistory: ["Seasonal allergies"],
    medications: ["Claritin 10mg daily"],
    allergies: ["Amoxicillin - rash"],
    valueScore: 85,
    paymentReliability: 98.5,
    noShowRate: 3,
    revenuePerVisit: 165,
  },
  {
    id: "p2",
    name: "Michael Rodriguez",
    age: 42,
    dateOfBirth: "1982-08-22",
    insuranceProvider: "Aetna",
    insurancePlan: "HMO",
    primaryComplaint: "Annual physical",
    hpiPreview: "Online intake 9:10 AM — annual physical, HTN well-controlled, interested in diabetes prevention. Pre-chart built 9:11 AM. A1C, lipid panel, and DPP referral pre-ordered. Appointment 11:00 AM.",
    medicalHistory: ["Hypertension", "Prediabetes"],
    medications: ["Lisinopril 10mg", "Metformin 500mg"],
    allergies: ["None"],
    valueScore: 92,
    paymentReliability: 95,
    noShowRate: 5,
    revenuePerVisit: 285,
  },
  {
    id: "p3",
    name: "Jennifer Thompson",
    age: 28,
    dateOfBirth: "1996-12-05",
    insuranceProvider: "Kaiser",
    insurancePlan: "HMO",
    primaryComplaint: "Chronic cough",
    hpiPreview: "Waiting room tablet 12:45 PM — persistent cough x 6 wks, using albuterol 2-3x/week. Pre-chart built 12:46 PM. Spirometry pre-ordered, step-up therapy ready for review. Appointment 1:30 PM.",
    medicalHistory: ["Asthma", "Eczema"],
    medications: ["Albuterol PRN", "Fluticasone inhaler"],
    allergies: ["Penicillin"],
    valueScore: 78,
    paymentReliability: 99,
    noShowRate: 2,
    revenuePerVisit: 195,
  },
  {
    id: "p4",
    name: "David Wilson",
    age: 55,
    dateOfBirth: "1969-03-18",
    insuranceProvider: "Medicare",
    insurancePlan: "Part B",
    primaryComplaint: "Bronchitis follow-up",
    hpiPreview: "Called 1:15 PM — improving cough but new exertional dyspnea, home SpO2 94%. Pre-chart built 1:16 PM. Spirometry, COPD exacerbation protocol, Medicare AWV overdue flagged — $185 liability + quality miss. Appointment 3:00 PM.",
    medicalHistory: ["COPD", "Tobacco use disorder"],
    medications: ["Spiriva 18mcg", "Advair 250/50"],
    allergies: ["Sulfa"],
    valueScore: 88,
    paymentReliability: 97,
    noShowRate: 8,
    revenuePerVisit: 220,
  },
  {
    id: "p5",
    name: "Robert Kim",
    age: 67,
    dateOfBirth: "1957-11-30",
    insuranceProvider: "Medicare Advantage",
    insurancePlan: "Gold Plus",
    primaryComplaint: "CHF management",
    hpiPreview: "Called 10:20 AM — 2 lb weight gain this week, mild ankle edema. Pre-chart built 10:21 AM. Diuretic adjustment ready, BMP pre-ordered, liability flag: no BNP in 6 months. Appointment 11:45 AM.",
    medicalHistory: ["CHF - systolic", "Type 2 Diabetes", "CKD Stage 3"],
    medications: ["Lasix 40mg", "Carvedilol 12.5mg", "Empagliflozin 10mg", "Insulin glargine 20u QHS"],
    allergies: ["ACE inhibitors - angioedema", "Contrast dye"],
    valueScore: 94,
    paymentReliability: 99,
    noShowRate: 4,
    revenuePerVisit: 340,
  },
  {
    id: "p6",
    name: "Maria Gonzalez",
    age: 45,
    dateOfBirth: "1979-07-14",
    insuranceProvider: "United Health",
    insurancePlan: "Choice Plus PPO",
    primaryComplaint: "Migraines with aura",
    hpiPreview: "Online intake 11:30 AM — 3 migraines in 2 weeks with visual aura, sumatriptan partial relief. Pre-chart built 11:31 AM. CGRP antagonist candidate flagged, thyroid check due, PHQ-9 depression screen overdue. Appointment 12:30 PM.",
    medicalHistory: ["Chronic migraines", "Generalized anxiety disorder", "Hypothyroidism"],
    medications: ["Topiramate 50mg", "Sertraline 100mg", "Levothyroxine 88mcg", "Sumatriptan 100mg PRN"],
    allergies: ["Aspirin - GI bleed"],
    valueScore: 89,
    paymentReliability: 96,
    noShowRate: 6,
    revenuePerVisit: 255,
  },
  {
    id: "p7",
    name: "James Park",
    age: 38,
    dateOfBirth: "1986-02-09",
    insuranceProvider: "Cigna",
    insurancePlan: "Open Access Plus",
    primaryComplaint: "Low back pain - new",
    hpiPreview: "Walk-in 2:30 PM — acute LBP x 4 days, lifting injury, 6/10 pain, worse flexion, no radiation or bowel/bladder changes. Pre-chart built 2:31 PM. Ottawa rules applied, workers comp billing flagged, Rx NSAID ready (check: no allergy). Appointment 3:45 PM.",
    medicalHistory: ["No significant PMH"],
    medications: ["Ibuprofen 400mg PRN"],
    allergies: ["None"],
    valueScore: 71,
    paymentReliability: 91,
    noShowRate: 12,
    revenuePerVisit: 145,
  },
  {
    id: "p8",
    name: "Amanda Foster",
    age: 52,
    dateOfBirth: "1972-09-23",
    insuranceProvider: "Blue Shield",
    insurancePlan: "PPO Select",
    primaryComplaint: "Weight management follow-up",
    hpiPreview: "Patient portal 1:45 PM — 8 lb weight loss on Ozempic, CPAP compliance 6.2 hrs/night, requesting dose escalation. Pre-chart built 1:46 PM. Prior auth pre-filled, LFTs flagged (NAFLD), sleep study referral revenue hook $165. Appointment 2:15 PM.",
    medicalHistory: ["Obesity (BMI 38)", "Hypothyroidism", "OSA on CPAP", "Non-alcoholic fatty liver"],
    medications: ["Levothyroxine 100mcg", "Ozempic 0.5mg weekly", "CPAP 10 cmH2O"],
    allergies: ["Codeine - nausea", "Latex"],
    valueScore: 83,
    paymentReliability: 94,
    noShowRate: 9,
    revenuePerVisit: 210,
  },
];

// Use local time so times display correctly in any timezone
function localApptTime(hour: number, minute = 0): string {
  const d = new Date();
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const sampleAppointments: Appointment[] = [
  { id: "a1", patientId: "p1", providerId: "prov-1", appointmentTime: localApptTime(10, 30), visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "165.00" },
  { id: "a2", patientId: "p2", providerId: "prov-1", appointmentTime: localApptTime(11, 0), visitType: "office-visit", status: "checked-in", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "285.00" },
  { id: "a3", patientId: "p5", providerId: "prov-1", appointmentTime: localApptTime(11, 45), visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "340.00" },
  { id: "a4", patientId: "p6", providerId: "prov-1", appointmentTime: localApptTime(12, 30), visitType: "office-visit", status: "checked-in", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "255.00" },
  { id: "a5", patientId: "p3", providerId: "prov-1", appointmentTime: localApptTime(13, 30), visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "195.00" },
  { id: "a6", patientId: "p8", providerId: "prov-1", appointmentTime: localApptTime(14, 15), visitType: "office-visit", status: "scheduled", preVisitComplete: false, scopeStatus: "within_scope", insuranceVerified: false, estimatedRevenue: "210.00" },
  { id: "a7", patientId: "p4", providerId: "prov-1", appointmentTime: localApptTime(15, 0), visitType: "office-visit", status: "scheduled", preVisitComplete: true, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "220.00" },
  { id: "a8", patientId: "p7", providerId: "prov-1", appointmentTime: localApptTime(15, 45), visitType: "office-visit", status: "scheduled", preVisitComplete: false, scopeStatus: "within_scope", insuranceVerified: true, estimatedRevenue: "145.00" },
];

export const sampleStats: DashboardStats = {
  patientsToday: 8,
  completedEncounters: 2,
  pendingSignatures: 4,
  estimatedRevenue: 1815,
  revenueToday: 1815,
  avgEncounterTime: 18,
  patientSatisfaction: 4.8,
};

export const sampleRevenueOpportunities: RevenueOpportunity[] = [
  { id: "r1", opportunityType: "Annual Wellness Visit", description: "Medicare AWV due for David Wilson", estimatedRevenue: "185.00", category: "preventive", status: "pending" },
  { id: "r2", opportunityType: "Chronic Care Management", description: "CCM eligible: Michael Rodriguez (HTN + prediabetes)", estimatedRevenue: "62.00", category: "chronic", status: "pending" },
  { id: "r3", opportunityType: "Spirometry", description: "PFT indicated for Jennifer Thompson (asthma)", estimatedRevenue: "120.00", category: "diagnostic", status: "pending" },
  { id: "r4", opportunityType: "CCM - Complex", description: "Complex CCM: Robert Kim (CHF + T2DM + CKD)", estimatedRevenue: "134.00", category: "chronic", status: "pending" },
  { id: "r5", opportunityType: "Diabetes Prevention Program", description: "DPP referral for Michael Rodriguez", estimatedRevenue: "810.00", category: "preventive", status: "pending" },
  { id: "r6", opportunityType: "Remote Patient Monitoring", description: "RPM for Robert Kim (CHF - daily weights)", estimatedRevenue: "110.00", category: "chronic", status: "pending" },
  { id: "r7", opportunityType: "Sleep Study Referral", description: "Formal PSG for Amanda Foster (OSA compliance)", estimatedRevenue: "165.00", category: "diagnostic", status: "pending" },
  { id: "r8", opportunityType: "Annual Wellness + TCM", description: "Medicare AWV overdue for Robert Kim", estimatedRevenue: "185.00", category: "preventive", status: "pending" },
];

export const sampleScopeAlerts: ScopeAlert[] = [
  { id: "s1", procedure: "Spirometry interpretation", alertType: "documentation", riskLevel: "low", recommendation: "Ensure proper documentation of clinical indication" },
  { id: "s2", procedure: "Controlled substance prescribing", alertType: "compliance", riskLevel: "medium", recommendation: "Verify PDMP check prior to prescribing; document in chart" },
  { id: "s3", procedure: "Ozempic prior auth", alertType: "authorization", riskLevel: "medium", recommendation: "Blue Shield requires BMI ≥30 + one comorbidity for GLP-1 coverage" },
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
