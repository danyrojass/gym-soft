import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeDocumento } from "@/lib/format";
import { evaluateAccess, accessReasonLabel } from "@/lib/domain/access";
import { actuateTurnstile } from "@/lib/domain/turnstile";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { documento?: string; gymId?: string; puntoAcceso?: string };
    const documento = normalizeDocumento(String(body.documento ?? ""));
    const gymId = String(body.gymId ?? "gym-default");
    const puntoAcceso = String(body.puntoAcceso ?? "principal").slice(0, 64);

    if (!documento) {
      return NextResponse.json({ ok: false, error: "documento requerido" }, { status: 400 });
    }

    const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { id: true } });
    if (!gym) return NextResponse.json({ ok: false, error: "gimnasio no encontrado" }, { status: 404 });

    const decision = await evaluateAccess({ gymId, documento, puntoAcceso });
    let turnstile = { ok: false, mode: "NONE", message: "No accionado" };
    if (decision.resultado === "PERMITIDO") {
      turnstile = await actuateTurnstile(gymId);
    }

    return NextResponse.json({
      ok: true,
      decision: {
        ...decision,
        motivoLabel: accessReasonLabel(decision.motivo),
        fechaHora: decision.fechaHora.toISOString(),
      },
      turnstile,
    });
  } catch (e) {
    console.error("checkin api error", e);
    return NextResponse.json({ ok: false, error: "error interno" }, { status: 500 });
  }
}
