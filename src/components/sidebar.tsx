"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "⊙" },
  { href: "/pre-visit", label: "Pre-Visit Charting", icon: "👤" },
  { href: "/scope-validation", label: "Scope Validation", icon: "🛡" },
  { href: "/care-planning", label: "Care Planning", icon: "✏️" },
  { href: "/protective-briefing", label: "Protective Briefing", icon: "📋" },
  { href: "/insurance", label: "Insurance Optimization", icon: "📄" },
  { href: "/revenue", label: "Revenue Prediction", icon: "📈" },
  { href: "/patients", label: "Patient Management", icon: "👥" },
  { href: "/appointments", label: "Appointments", icon: "📅" },
  { href: "/ehr-integration", label: "EHR Integration", icon: "🔗" },
  { href: "/settings", label: "Profile & Credentials", icon: "⚙️" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    document.cookie = "ehr-auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800 flex flex-col">
      <div className="p-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">Rx</div>
          <div>
            <p className="font-semibold text-white text-sm">PrognoSX</p>
            <p className="text-xs text-gray-400">AI Medical Intelligence</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-blue-600/20 text-blue-400 font-medium"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <span className="text-base w-5 text-center">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <span className="text-base w-5 text-center">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
