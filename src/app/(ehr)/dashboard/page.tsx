import { sampleStats, sampleAppointments } from "@/lib/sampleData";

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const stats = sampleStats;
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">PrognoSX Dashboard</h1>
        <p className="text-gray-400 text-sm mt-1">{today}</p>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatCard label="Patients Today" value={stats.patientsToday} color="text-blue-400" />
        <StatCard label="Completed" value={stats.completedEncounters} color="text-green-400" />
        <StatCard label="Pending Signatures" value={stats.pendingSignatures} color="text-yellow-400" />
        <StatCard label="Est. Revenue" value={`$${stats.estimatedRevenue.toLocaleString()}`} color="text-emerald-400" />
        <StatCard label="Avg Encounter" value={`${stats.avgEncounterTime}m`} color="text-purple-400" />
        <StatCard label="Patient Satisfaction" value={`${stats.patientSatisfaction}/5`} color="text-pink-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Today&apos;s Schedule</h2>
          <div className="space-y-3">
            {sampleAppointments.map(apt => (
              <div key={apt.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-mono text-gray-400 w-12">{apt.time}</div>
                  <div>
                    <p className="text-sm font-medium text-white">{apt.patientName}</p>
                    <p className="text-xs text-gray-400">{apt.chiefComplaint}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  apt.status === "checked-in" ? "bg-green-900/50 text-green-400" :
                  apt.status === "in-progress" ? "bg-blue-900/50 text-blue-400" :
                  apt.status === "completed" ? "bg-gray-700 text-gray-400" :
                  "bg-gray-800 text-gray-400"
                }`}>
                  {apt.status.replace("-", " ")}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            {[
              { label: "Start Pre-Visit Charting", href: "/pre-visit", color: "bg-blue-600 hover:bg-blue-700" },
              { label: "View Appointments", href: "/appointments", color: "bg-gray-700 hover:bg-gray-600" },
              { label: "Export Notes", href: "/ehr-integration", color: "bg-gray-700 hover:bg-gray-600" },
              { label: "Revenue Report", href: "/revenue", color: "bg-gray-700 hover:bg-gray-600" },
            ].map(action => (
              <a
                key={action.href}
                href={action.href}
                className={`block w-full text-center py-2.5 px-4 rounded-lg text-sm font-medium text-white transition-colors ${action.color}`}
              >
                {action.label}
              </a>
            ))}
          </div>

          <div className="mt-6 p-3 bg-green-900/20 border border-green-800/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <p className="text-xs font-medium text-green-400">AI Connected</p>
            </div>
            <p className="text-xs text-gray-400">Last sync: just now</p>
          </div>
        </div>
      </div>
    </div>
  );
}
