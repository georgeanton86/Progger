"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    setLoading(false);
    if (res.ok) {
      router.push("/dashboard");
    } else {
      setError("Incorrect access code");
      setCode("");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm px-4">

        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 overflow-hidden" style={{ background: "linear-gradient(135deg, #0d9488 0%, #0891b2 100%)" }}>
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <polyline points="4,18 9,18 11,10 14,26 17,14 20,22 23,18 32,18" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
              <text x="22" y="14" fontSize="9" fontWeight="800" fill="white" opacity="0.55" fontFamily="system-ui">X</text>
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Prognos<span className="text-teal-400">X</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI Medical Intelligence Platform</p>
          <p className="text-gray-700 text-xs mt-1">Founded by Dr. George Antonopoulos</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-8">
          <p className="text-xs font-extrabold text-gray-500 uppercase tracking-widest mb-5">Private Beta — Access Required</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 mb-2">Access Code</label>
              <input
                type="password"
                inputMode="numeric"
                value={code}
                onChange={e => setCode(e.target.value)}
                placeholder="••••"
                autoFocus
                required
                className="w-full px-4 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-white text-center text-xl tracking-[0.5em] placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            <button
              type="submit"
              disabled={!code || loading}
              className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors"
            >
              {loading ? "Verifying…" : "Enter"}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          PrognoSX · Private Beta · Not for clinical use
        </p>
      </div>
    </div>
  );
}
