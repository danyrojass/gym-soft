import { AccessResult, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeDocumento } from "@/lib/format";
import { getGymTimezone } from "@/lib/domain/gym";
import { getMondayWeekRangeUtc, isDateWithinInclusive } from "@/lib/domain/dates";
import { computeEffectiveSubscriptionStatus, getSnapshot } from "@/lib/domain/subscriptions";

export type AccessDecision = {
  resultado: AccessResult;
  motivo: string;
  memberId: string | null;
  memberNombre: string | null;
  subscriptionId: string | null;
  subscriptionEstado: string | null;
  fechaHora: Date;
};

const REASON_LABELS: Record<string, string> = {
  SOCIO_NO_ENCONTRADO: "Socio no encontrado",
  SOCIO_INACTIVO: "Socio inactivo",
  SIN_SUSCRIPCION: "Sin suscripción",
  PENDIENTE_PAGO: "Suscripción pendiente de pago",
  VENCIDA: "Suscripción vencida",
  SUSPENDIDA: "Suscripción suspendida",
  CANCELADA: "Suscripción cancelada",
  PASES_AGOTADOS: "Pases agotados",
  CUPO_SEMANAL_AGOTADO: "Cupo semanal agotado",
  ERROR_SISTEMA: "Error del sistema",
  OK: "Acceso permitido",
};

export function accessReasonLabel(code: string): string {
  return REASON_LABELS[code] ?? code;
}

async function pickRelevantSubscription(gymId: string, memberId: string) {
  const subs = await prisma.subscription.findMany({
    where: { gymId, memberId },
    orderBy: [{ fechaFin: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  if (subs.length === 0) return null;

  const activeLike = subs.find((s) => ["ACTIVA", "PENDIENTE_PAGO", "SUSPENDIDA"].includes(s.estado));
  if (activeLike) return activeLike;

  return subs[0] ?? null;
}

export async function evaluateAccess(params: {
  gymId: string;
  documento: string;
  puntoAcceso?: string;
  now?: Date;
  dryRun?: boolean;
}): Promise<AccessDecision> {
  const now = params.now ?? new Date();
  const documentoNormalizado = normalizeDocumento(params.documento);

  if (!documentoNormalizado) {
    const decision: AccessDecision = {
      resultado: "DENEGADO",
      motivo: "SOCIO_NO_ENCONTRADO",
      memberId: null,
      memberNombre: null,
      subscriptionId: null,
      subscriptionEstado: null,
      fechaHora: now,
    };
    if (!params.dryRun) {
      await prisma.accessEvent.create({
        data: {
          gymId: params.gymId,
          documentoIngresado: params.documento,
          resultado: decision.resultado,
          motivo: decision.motivo,
          fechaHora: now,
          puntoAcceso: params.puntoAcceso ?? "principal",
        },
      });
    }
    return decision;
  }

  try {
    const member = await prisma.member.findFirst({
      where: { gymId: params.gymId, documentoNumero: documentoNormalizado },
    });

    if (!member) {
      const decision: AccessDecision = {
        resultado: "DENEGADO",
        motivo: "SOCIO_NO_ENCONTRADO",
        memberId: null,
        memberNombre: null,
        subscriptionId: null,
        subscriptionEstado: null,
        fechaHora: now,
      };
      if (!params.dryRun) {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            documentoIngresado: documentoNormalizado,
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      }
      return decision;
    }

    if (member.estado !== "ACTIVO") {
      const decision: AccessDecision = {
        resultado: "DENEGADO",
        motivo: "SOCIO_INACTIVO",
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: null,
        subscriptionEstado: null,
        fechaHora: now,
      };
      if (!params.dryRun) {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            memberId: member.id,
            documentoIngresado: documentoNormalizado,
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      }
      return decision;
    }

    const sub = await pickRelevantSubscription(params.gymId, member.id);
    if (!sub) {
      const decision: AccessDecision = {
        resultado: "DENEGADO",
        motivo: "SIN_SUSCRIPCION",
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: null,
        subscriptionEstado: null,
        fechaHora: now,
      };
      if (!params.dryRun) {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            memberId: member.id,
            documentoIngresado: documentoNormalizado,
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      }
      return decision;
    }

    const effectiveStatus = computeEffectiveSubscriptionStatus(sub, now);
    if (effectiveStatus !== "ACTIVA") {
      const motivo =
        effectiveStatus === "PENDIENTE_PAGO" ||
        effectiveStatus === "VENCIDA" ||
        effectiveStatus === "SUSPENDIDA" ||
        effectiveStatus === "CANCELADA"
          ? effectiveStatus
          : "VENCIDA";
      const decision: AccessDecision = {
        resultado: "DENEGADO",
        motivo,
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: sub.id,
        subscriptionEstado: effectiveStatus,
        fechaHora: now,
      };
      if (!params.dryRun) {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            memberId: member.id,
            subscriptionId: sub.id,
            documentoIngresado: documentoNormalizado,
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      }
      return decision;
    }

    if (!isDateWithinInclusive(now, sub.fechaInicio, sub.fechaFin)) {
      const decision: AccessDecision = {
        resultado: "DENEGADO",
        motivo: "VENCIDA",
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: sub.id,
        subscriptionEstado: "VENCIDA",
        fechaHora: now,
      };
      if (!params.dryRun) {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            memberId: member.id,
            subscriptionId: sub.id,
            documentoIngresado: documentoNormalizado,
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      }
      return decision;
    }

    const snap = getSnapshot(sub);
    if (snap.politicaAcceso === "PASES_TOTALES") {
      if ((sub.pasesRestantes ?? 0) <= 0) {
        const decision: AccessDecision = {
          resultado: "DENEGADO",
          motivo: "PASES_AGOTADOS",
          memberId: member.id,
          memberNombre: `${member.apellido}, ${member.nombre}`,
          subscriptionId: sub.id,
          subscriptionEstado: "VENCIDA",
          fechaHora: now,
        };
        if (!params.dryRun) {
          await prisma.accessEvent.create({
            data: {
              gymId: params.gymId,
              memberId: member.id,
              subscriptionId: sub.id,
              documentoIngresado: documentoNormalizado,
              resultado: decision.resultado,
              motivo: decision.motivo,
              fechaHora: now,
              puntoAcceso: params.puntoAcceso ?? "principal",
            },
          });
        }
        return decision;
      }
    }

    if (snap.politicaAcceso === "FRECUENCIA_SEMANAL") {
      const tz = await getGymTimezone(params.gymId);
      const { start, end } = getMondayWeekRangeUtc(now, tz);
      const used = await prisma.accessEvent.count({
        where: {
          gymId: params.gymId,
          subscriptionId: sub.id,
          resultado: "PERMITIDO",
          fechaHora: { gte: start, lte: end },
        },
      });
      const max = snap.frecuenciaSemanalMax ?? 0;
      if (used >= max) {
        const decision: AccessDecision = {
          resultado: "DENEGADO",
          motivo: "CUPO_SEMANAL_AGOTADO",
          memberId: member.id,
          memberNombre: `${member.apellido}, ${member.nombre}`,
          subscriptionId: sub.id,
          subscriptionEstado: effectiveStatus,
          fechaHora: now,
        };
        if (!params.dryRun) {
          await prisma.accessEvent.create({
            data: {
              gymId: params.gymId,
              memberId: member.id,
              subscriptionId: sub.id,
              documentoIngresado: documentoNormalizado,
              resultado: decision.resultado,
              motivo: decision.motivo,
              fechaHora: now,
              puntoAcceso: params.puntoAcceso ?? "principal",
            },
          });
        }
        return decision;
      }
    }

    if (params.dryRun) {
      return {
        resultado: "PERMITIDO",
        motivo: "OK",
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: sub.id,
        subscriptionEstado: effectiveStatus,
        fechaHora: now,
      };
    }

    const decision = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Re-check inside transaction for simple race protection.
      const freshSub = await tx.subscription.findFirst({ where: { id: sub.id, gymId: params.gymId } });
      if (!freshSub) {
        throw new Error("SUBSCRIPTION_MISSING");
      }
      const freshStatus = computeEffectiveSubscriptionStatus(freshSub, now);
      if (freshStatus !== "ACTIVA" || !isDateWithinInclusive(now, freshSub.fechaInicio, freshSub.fechaFin)) {
        await tx.accessEvent.create({
          data: {
            gymId: params.gymId,
            memberId: member.id,
            subscriptionId: freshSub.id,
            documentoIngresado: documentoNormalizado,
            resultado: "DENEGADO",
            motivo: freshStatus === "ACTIVA" ? "VENCIDA" : freshStatus,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
        return {
          resultado: "DENEGADO" as const,
          motivo: freshStatus === "ACTIVA" ? "VENCIDA" : freshStatus,
          memberId: member.id,
          memberNombre: `${member.apellido}, ${member.nombre}`,
          subscriptionId: freshSub.id,
          subscriptionEstado: freshStatus,
          fechaHora: now,
        };
      }

      const freshSnap = getSnapshot(freshSub);
      if (freshSnap.politicaAcceso === "PASES_TOTALES") {
        if ((freshSub.pasesRestantes ?? 0) <= 0) {
          await tx.accessEvent.create({
            data: {
              gymId: params.gymId,
              memberId: member.id,
              subscriptionId: freshSub.id,
              documentoIngresado: documentoNormalizado,
              resultado: "DENEGADO",
              motivo: "PASES_AGOTADOS",
              fechaHora: now,
              puntoAcceso: params.puntoAcceso ?? "principal",
            },
          });
          return {
            resultado: "DENEGADO" as const,
            motivo: "PASES_AGOTADOS",
            memberId: member.id,
            memberNombre: `${member.apellido}, ${member.nombre}`,
            subscriptionId: freshSub.id,
            subscriptionEstado: "VENCIDA",
            fechaHora: now,
          };
        }
        await tx.subscription.update({
          where: { id: freshSub.id },
          data: { pasesRestantes: { decrement: 1 } },
        });
      }

      if (freshSnap.politicaAcceso === "FRECUENCIA_SEMANAL") {
        const tz = await getGymTimezone(params.gymId);
        const { start, end } = getMondayWeekRangeUtc(now, tz);
        const used = await tx.accessEvent.count({
          where: {
            gymId: params.gymId,
            subscriptionId: freshSub.id,
            resultado: "PERMITIDO",
            fechaHora: { gte: start, lte: end },
          },
        });
        if (used >= (freshSnap.frecuenciaSemanalMax ?? 0)) {
          await tx.accessEvent.create({
            data: {
              gymId: params.gymId,
              memberId: member.id,
              subscriptionId: freshSub.id,
              documentoIngresado: documentoNormalizado,
              resultado: "DENEGADO",
              motivo: "CUPO_SEMANAL_AGOTADO",
              fechaHora: now,
              puntoAcceso: params.puntoAcceso ?? "principal",
            },
          });
          return {
            resultado: "DENEGADO" as const,
            motivo: "CUPO_SEMANAL_AGOTADO",
            memberId: member.id,
            memberNombre: `${member.apellido}, ${member.nombre}`,
            subscriptionId: freshSub.id,
            subscriptionEstado: freshStatus,
            fechaHora: now,
          };
        }
      }

      await tx.accessEvent.create({
        data: {
          gymId: params.gymId,
          memberId: member.id,
          subscriptionId: freshSub.id,
          documentoIngresado: documentoNormalizado,
          resultado: "PERMITIDO",
          motivo: "OK",
          fechaHora: now,
          puntoAcceso: params.puntoAcceso ?? "principal",
        },
      });

      // For pases totales, mark vencida if it reached 0 after decrement.
      if (freshSnap.politicaAcceso === "PASES_TOTALES") {
        const updated = await tx.subscription.findUnique({ where: { id: freshSub.id }, select: { pasesRestantes: true } });
        if ((updated?.pasesRestantes ?? 0) <= 0) {
          await tx.subscription.update({ where: { id: freshSub.id }, data: { estado: "VENCIDA" } });
        }
      }

      return {
        resultado: "PERMITIDO" as const,
        motivo: "OK",
        memberId: member.id,
        memberNombre: `${member.apellido}, ${member.nombre}`,
        subscriptionId: freshSub.id,
        subscriptionEstado: freshStatus,
        fechaHora: now,
      };
    });

    return decision;
  } catch (error) {
    console.error("evaluateAccess error", error);
    const decision: AccessDecision = {
      resultado: "DENEGADO",
      motivo: "ERROR_SISTEMA",
      memberId: null,
      memberNombre: null,
      subscriptionId: null,
      subscriptionEstado: null,
      fechaHora: now,
    };
    if (!params.dryRun) {
      try {
        await prisma.accessEvent.create({
          data: {
            gymId: params.gymId,
            documentoIngresado: normalizeDocumento(params.documento) || params.documento.slice(0, 64),
            resultado: decision.resultado,
            motivo: decision.motivo,
            fechaHora: now,
            puntoAcceso: params.puntoAcceso ?? "principal",
          },
        });
      } catch {}
    }
    return decision;
  }
}
