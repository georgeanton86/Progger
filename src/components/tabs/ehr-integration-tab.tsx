"use client";
import { useState } from "react";
import { samplePatients, sampleAppointments, sampleProvider } from "@/lib/sampleData";
import { cn } from "@/lib/utils";

type ExportFormat = "FHIR R4" | "HL7 v2.5" | "CCD/CCDA" | "CSV";

const systems = [
  { name: "Epic", status: "connected", color: "text-green-400", icon: "◉", lastSync: "2 min ago" },
  { name: "Cerner", status: "available", color: "text-gray-500", icon: "○", lastSync: "-" },
  { name: "Athena Health", status: "available", color: "text-gray-500", icon: "○", lastSync: "-" },
  { name: "DrChrono", status: "available", color: "text-gray-500", icon: "○", lastSync: "-" },
  { name: "eClinicalWorks", status: "available", color: "text-gray-500", icon: "○", lastSync: "-" },
  { name: "Kareo", status: "available", color: "text-gray-500", icon: "○", lastSync: "-" },
];

function buildFhirBundle() {
  const patients = samplePatients.map(p => ({
    resource: {
      resourceType: "Patient",
      id: p.id,
      name: [{ use: "official", text: p.name, family: p.name.split(" ")[1], given: [p.name.split(" ")[0]] }],
      birthDate: p.dateOfBirth,
      extension: [
        { url: "http://hl7.org/fhir/StructureDefinition/insurance-provider", valueString: p.insuranceProvider },
        { url: "http://example.org/valueScore", valueDecimal: p.valueScore },
      ],
    },
  }));
  return JSON.stringify({ resourceType: "Bundle", type: "collection", entry: patients }, null, 2);
}

function buildCsv() {
  const header = "ID,Name,Age,DOB,Insurance,Plan,Complaint,ValueScore,Revenue/Visit,PaymentReliability,NoShowRate";
  const rows = samplePatients.map(p =>
    `${p.id},"${p.name}",${p.age},${p.dateOfBirth},"${p.insuranceProvider}","${p.insurancePlan}","${p.primaryComplaint}",${p.valueScore},${p.revenuePerVisit},${p.paymentReliability},${p.noShowRate}`
  );
  return [header, ...rows].join("\n");
}

function downloadText(content: string, filename: string, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function EhrIntegrationTab() {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("FHIR R4");
  const [preview, setPreview] = useState("");
  const [analysisOutput, setAnalysisOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState<string[]>([]);

  function generatePreview() {
    if (selectedFormat === "FHIR R4") setPreview(buildFhirBundle());
    else if (selectedFormat === "CSV") setPreview(buildCsv());
    else if (selectedFormat === "HL7 v2.5") setPreview(`MSH|^~\\&|PrognoSX|Clinic|Epic|Hospital|${new Date().toISOString()}||ADT^A08|${Date.now()}|P|2.5\nPID|1||P1^^^MR||Chen^Sarah||19900515|F|||123 Main St^^San Francisco^CA^94102||555-1234|||S|||123-45-6789`);
    else setPreview(`<?xml version="1.0" encoding="UTF-8"?>\n<ClinicalDocument xmlns="urn:hl7-org:v3">\n  <title>Continuity of Care Document</title>\n  <effectiveTime value="${new Date().toISOString()}"/>\n  <!-- Patient data for ${samplePatients.length} patients -->\n</ClinicalDocument>`);
  }

  function downloadExport() {
    if (selectedFormat === "FHIR R4") downloadText(buildFhirBundle(), "caremind-fhir-r4.json", "application/json");
    else if (selectedFormat === "CSV") downloadText(buildCsv(), "caremind-patients.csv", "text/csv");
    else downloadText(preview || "No preview generated", `caremind-export.${selectedFormat === "HL7 v2.5" ? "hl7" : "xml"}`);
  }

  async function simulateSync() {
    setSyncing(true);
    setSyncLog([]);
    const steps = [
      "Connecting to Epic FHIR endpoint...",
      "Authenticating with OAuth 2.0...",
      "Fetching patient demographics...",
      "Syncing appointment data...",
      "Uploading encounter notes...",
      "Validating FHIR R4 conformance...",
      "Sync complete. 4 patients, 4 appointments updated.",
    ];
    for (let i = 0; i < steps.length; i++) {
      await new Promise(r => setTimeout(r, 600));
      setSyncLog(prev => [...prev, steps[i]]);
    }
    setSyncing(false);
  }

  async function generateIntegrationAnalysis() {
    setLoading(true); setAnalysisOutput("");
    const res = await fetch("/api/ai", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: `Provide a detailed EHR integration strategy including:
1. Current system assessment (Epic integration readiness)
2. FHIR R4 API integration roadmap with specific endpoints
3. Data migration plan and validation steps
4. HL7 interface requirements
5. CDS Hooks implementation opportunities for clinical decision support
6. Security & HIPAA compliance requirements for API access
7. Estimated implementation timeline and cost savings
8. Recommended integration architecture (direct API vs. middleware)`,
        context: `Current EHR: ${sampleProvider.ehrSystem}
Provider: ${sampleProvider.name}, ${sampleProvider.specialty}
State: ${sampleProvider.state}
Patients: ${samplePatients.length} active
Data Volume: ${sampleAppointments.length} appointments today`,
      }),
    });
    const data = await res.json();
    setAnalysisOutput(data.reply || data.error);
    setLoading(false);
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-white">EHR Integration Hub</h1>
        <p className="text-sm text-gray-400 mt-0.5">FHIR R4, HL7, and multi-system data exchange</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Connected systems */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="font-semibold text-white mb-4">EHR Systems</h2>
          <div className="space-y-3">
            {systems.map(sys => (
              <div key={sys.name} className={cn("flex items-center justify-between p-3 rounded-lg border transition-colors", sys.status === "connected" ? "border-green-700/40 bg-green-900/5" : "border-gray-800 bg-gray-800/30")}>
                <div className="flex items-center gap-2">
                  <span className={cn("text-sm", sys.color)}>{sys.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-white">{sys.name}</p>
                    <p className="text-xs text-gray-500">Last sync: {sys.lastSync}</p>
                  </div>
                </div>
                <button
                  onClick={sys.status === "connected" ? simulateSync : undefined}
                  disabled={syncing}
                  className={cn("text-xs px-2 py-1 rounded transition-colors", sys.status === "connected" ? "bg-green-800/40 text-green-400 hover:bg-green-800/60" : "bg-gray-700 text-gray-500 cursor-not-allowed")}
                >
                  {sys.status === "connected" ? (syncing ? "Syncing..." : "Sync") : "Connect"}
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Sync log + stats */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{samplePatients.length}</p>
              <p className="text-xs text-gray-500 mt-1">Patients Synced</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-teal-400">{sampleAppointments.length}</p>
              <p className="text-xs text-gray-500 mt-1">Appointments Synced</p>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-purple-400">R4</p>
              <p className="text-xs text-gray-500 mt-1">FHIR Version</p>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold text-white">Sync Activity Log</h2>
              <button onClick={simulateSync} disabled={syncing} className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-xs font-medium rounded-lg transition-colors">
                {syncing ? "Syncing..." : "Run Sync"}
              </button>
            </div>
            <div className="bg-gray-950 rounded-lg p-3 font-mono text-xs min-h-[100px] space-y-1">
              {syncLog.length === 0 && <p className="text-gray-600">No sync activity. Click &quot;Run Sync&quot; to begin.</p>}
              {syncLog.map((line, i) => (
                <p key={i} className={i === syncLog.length - 1 ? "text-green-400" : "text-gray-500"}>
                  [{new Date().toLocaleTimeString()}] {line}
                </p>
              ))}
              {syncing && <p className="text-teal-400 animate-pulse">[...] Processing...</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Export section */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 mb-5">
        <h2 className="font-semibold text-white mb-4">Data Export</h2>
        <div className="flex gap-2 flex-wrap mb-4">
          {(["FHIR R4", "HL7 v2.5", "CCD/CCDA", "CSV"] as ExportFormat[]).map(fmt => (
            <button key={fmt} onClick={() => setSelectedFormat(fmt)} className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border", selectedFormat === fmt ? "bg-teal-600 text-white border-teal-500" : "bg-gray-800 text-gray-400 border-gray-700 hover:text-white")}>
              {fmt}
            </button>
          ))}
        </div>
        <div className="flex gap-3 mb-4">
          <button onClick={generatePreview} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg transition-colors">
            Preview Export
          </button>
          <button onClick={downloadExport} disabled={!preview} className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            Download {selectedFormat}
          </button>
        </div>
        {preview && (
          <div className="bg-gray-950 rounded-lg p-4 overflow-x-auto">
            <pre className="text-xs text-gray-400 font-mono max-h-64 overflow-y-auto">{preview}</pre>
          </div>
        )}
      </div>

      {/* AI Integration Analysis */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-semibold text-white">AI Integration Strategy</h2>
            <p className="text-xs text-gray-400 mt-0.5">Personalized EHR integration roadmap</p>
          </div>
          <button onClick={generateIntegrationAnalysis} disabled={loading} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
            {loading ? "Analyzing..." : "Generate Strategy"}
          </button>
        </div>
        {analysisOutput ? (
          <pre className="whitespace-pre-wrap text-sm text-gray-300 font-sans leading-relaxed">{analysisOutput}</pre>
        ) : (
          <p className="text-gray-500 text-sm">Generate an AI-powered analysis of your integration options, FHIR implementation guide, and migration strategy.</p>
        )}
      </div>
    </div>
  );
}
