import { prisma } from "@/lib/prisma";

export type TurnstileConfig = {
  mode: "SIMULATED" | "RELAY_HTTP";
  relayUrl?: string | null;
  pulseMs: number;
  failOpen: boolean;
  deviceId: string;
};

export async function getTurnstileConfig(gymId: string): Promise<TurnstileConfig> {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { config: true } });
  const config = (gym?.config ?? {}) as Record<string, unknown>;
  const t = (config.turnstile ?? {}) as Record<string, unknown>;
  return {
    mode: t.mode === "RELAY_HTTP" ? "RELAY_HTTP" : "SIMULATED",
    relayUrl: typeof t.relayUrl === "string" ? t.relayUrl : null,
    pulseMs: typeof t.pulseMs === "number" && t.pulseMs > 0 ? Math.min(t.pulseMs, 10000) : 1500,
    failOpen: typeof t.failOpen === "boolean" ? t.failOpen : true,
    deviceId: typeof t.deviceId === "string" && t.deviceId ? t.deviceId : "principal",
  };
}

export async function actuateTurnstile(gymId: string): Promise<{ ok: boolean; mode: string; message: string }> {
  const cfg = await getTurnstileConfig(gymId);
  if (cfg.mode === "RELAY_HTTP" && cfg.relayUrl) {
    try {
      const res = await fetch(cfg.relayUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "pulse", pulseMs: cfg.pulseMs, deviceId: cfg.deviceId }),
        cache: "no-store",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) return { ok: false, mode: cfg.mode, message: `Relay HTTP ${res.status}` };
      return { ok: true, mode: cfg.mode, message: "Pulso enviado al relé" };
    } catch (e) {
      return { ok: false, mode: cfg.mode, message: e instanceof Error ? e.message : "Error de relé" };
    }
  }
  // SIMULATED: no hardware. Used for Iteration 2 software validation / dev.
  return { ok: true, mode: "SIMULATED", message: `Apertura simulada (${cfg.pulseMs}ms)` };
}
