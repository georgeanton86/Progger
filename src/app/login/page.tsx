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
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-500/30 mb-5">
            <span className="text-3xl">🩺</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Prognos<span className="text-blue-400">X</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">AI Medical Intelligence Platform</p>
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
