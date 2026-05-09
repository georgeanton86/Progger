"use client";
import { useState } from "react";
import { samplePatients } from "@/lib/sampleData";

const systems = ["Epic", "Cerner", "Athenahealth", "eClinicalWorks", "AllScripts"];

export default function EhrIntegrationPage() {
  const [selectedSystem, setSelectedSystem] = useState("Epic");
  const [selectedPatient, setSelectedPatient] = useState(samplePatients[0].id);
  const [exported, setExported] = useState(false);

  const patient = samplePatients.find(p => p.id === selectedPatient)!;

  function handleExport() {
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  }

  const fhirBundle = JSON.stringify({
    resourceType: "Bundle",
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: patient.id,
          name: [{ family: patient.lastName, given: [patient.firstName] }],
          birthDate: patient.dob,
          gender: patient.sex === "M" ? "male" : "female",
        },
      },
      ...patient.medications.map(med => ({
        resource: {
          resourceType: "MedicationRequest",
          status: med.active ? "active" : "stopped",
          medicationCodeableConcept: { text: med.name },
          dosageInstruction: [{ text: `${med.dose} ${med.frequency}` }],
        },
      })),
    ],
  }, null, 2);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-white mb-1">EHR Integration</h1>
      <p className="text-gray-400 text-sm mb-6">Export patient records to Epic, Cerner, and other EHR systems via FHIR R4</p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-medium text-white mb-3">Target System</h2>
            <div className="space-y-2">
              {systems.map(sys => (
                <button
                  key={sys}
                  onClick={() => setSelectedSystem(sys)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedSystem === sys ? "bg-blue-600/20 text-blue-400 border border-blue-500" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {sys}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-medium text-white mb-3">Patient</h2>
            <div className="space-y-2">
              {samplePatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPatient(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selectedPatient === p.id ? "bg-blue-600/20 text-blue-400 border border-blue-500" : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                  }`}
                >
                  {p.firstName} {p.lastName}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-medium text-white">FHIR R4 Payload — {patient.firstName} {patient.lastName}</h2>
              <button
                onClick={handleExport}
                className={`px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors ${
                  exported ? "bg-green-600" : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {exported ? "✓ Exported!" : `Export to ${selectedSystem}`}
              </button>
            </div>
            <pre className="text-xs text-gray-400 bg-gray-800 rounded-lg p-4 overflow-auto max-h-96 font-mono">
              {fhirBundle}
            </pre>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="font-medium text-white mb-3">Connection Status</h2>
            <div className="space-y-2">
              {systems.map(sys => (
                <div key={sys} className="flex items-center justify-between p-2">
                  <span className="text-sm text-gray-300">{sys}</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${sys === "Epic" ? "bg-green-400" : "bg-gray-600"}`}></div>
                    <span className={`text-xs ${sys === "Epic" ? "text-green-400" : "text-gray-500"}`}>
                      {sys === "Epic" ? "Connected" : "Not configured"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
