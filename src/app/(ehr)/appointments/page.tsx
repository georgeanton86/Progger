import { sampleAppointments } from "@/lib/sampleData";

const statusColors: Record<string, string> = {
  scheduled: "bg-gray-700 text-gray-300",
  "checked-in": "bg-green-900/40 text-green-400",
  "in-progress": "bg-blue-900/40 text-blue-400",
  completed: "bg-gray-800 text-gray-500",
  cancelled: "bg-red-900/40 text-red-400",
};

export default function AppointmentsPage() {
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="p-8 max-w-4xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Appointments</h1>
          <p className="text-gray-400 text-sm mt-0.5">{today}</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          + Schedule Appointment
        </button>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-4 border-b border-gray-800 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <div>Time</div>
          <div className="col-span-2">Patient</div>
          <div>Type</div>
          <div>Insurance</div>
          <div>Status</div>
        </div>
        {sampleAppointments.map((apt, i) => (
          <div
            key={apt.id}
            className={`grid grid-cols-6 gap-4 p-4 items-center ${i < sampleAppointments.length - 1 ? "border-b border-gray-800" : ""} hover:bg-gray-800/50 transition-colors cursor-pointer`}
          >
            <div className="text-sm font-mono text-gray-400">{apt.time}</div>
            <div className="col-span-2">
              <p className="text-sm font-medium text-white">{apt.patientName}</p>
              <p className="text-xs text-gray-500 mt-0.5">{apt.chiefComplaint}</p>
            </div>
            <div className="text-sm text-gray-300">{apt.type}</div>
            <div className="text-sm text-gray-400 truncate">{apt.insurance}</div>
            <div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[apt.status] || "bg-gray-700 text-gray-400"}`}>
                {apt.status.replace("-", " ")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
