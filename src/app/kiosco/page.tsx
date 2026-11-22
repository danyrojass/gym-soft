"use client";

import { useState } from "react";

type CheckinResponse = {
  ok: boolean;
  decision?: {
    resultado: "PERMITIDO" | "DENEGADO";
    motivo: string;
    motivoLabel: string;
    memberNombre: string | null;
    fechaHora: string;
  };
  turnstile?: { ok: boolean; mode: string; message: string };
  error?: string;
};

export default function KioscoPage() {
  const [documento, setDocumento] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CheckinResponse | null>(null);

  async function submit(value?: string) {
    const doc = (value ?? documento).trim();
    if (!doc || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/access/checkin", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ documento: doc, gymId: "gym-default", puntoAcceso: "principal" }),
      });
      const data = (await res.json()) as CheckinResponse;
      setResult(data);
      setDocumento("");
    } catch {
      setResult({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  }

  const decision = result?.decision;
  const permitted = decision?.resultado === "PERMITIDO";

  return (
    <main className="min-h-screen bg-slate-950 text-white p-6 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">GymSoft Acceso</h1>
          <p className="text-slate-400 mt-2">Ingresá tu DNI o cédula</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="space-y-4"
        >
          <input
            autoFocus
            value={documento}
            onChange={(e) => setDocumento(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-5 text-center text-3xl tracking-widest outline-none focus:border-cyan-400"
            placeholder="DNI / CÉDULA"
            inputMode="numeric"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-cyan-500 px-4 py-4 text-lg font-semibold text-slate-950 hover:bg-cyan-400 disabled:opacity-60"
          >
            {loading ? "Validando..." : "Validar acceso"}
          </button>
        </form>

        {result && (
          <div
            className={`mt-8 rounded-xl p-6 text-center border ${
              permitted
                ? "bg-emerald-950/60 border-emerald-700 text-emerald-200"
                : "bg-red-950/60 border-red-700 text-red-200"
            }`}
          >
            {decision ? (
              <>
                <div className="text-4xl font-black">{decision.resultado}</div>
                <div className="mt-2 text-lg">{decision.memberNombre || "Documento no identificado"}</div>
                <div className="mt-1 text-sm opacity-90">{decision.motivoLabel}</div>
                {permitted && result.turnstile && (
                  <div className="mt-3 text-xs opacity-80">{result.turnstile.message} ({result.turnstile.mode})</div>
                )}
              </>
            ) : (
              <>
                <div className="text-2xl font-bold">ERROR</div>
                <div className="mt-2 text-sm">{result.error || "Error desconocido"}</div>
              </>
            )}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-500">
          Modo kiosco. La integración física usa adaptador de relé (Iteración 2); por defecto opera en simulación.
        </p>
      </div>
    </main>
  );
}
