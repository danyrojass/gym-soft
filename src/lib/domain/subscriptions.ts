import { AccessPolicy, Prisma, SubscriptionStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGymTimezone } from "@/lib/domain/gym";
import { calculateSubscriptionEnd, getMondayWeekRangeUtc, isDateWithinInclusive } from "@/lib/domain/dates";

export type SubscriptionSnapshot = {
  planId: string;
  nombre: string;
  tipoVigencia: "DIARIO" | "SEMANAL" | "MENSUAL";
  duracionDias: number;
  precio: string;
  politicaAcceso: AccessPolicy;
  pasesTotales: number | null;
  frecuenciaSemanalMax: number | null;
  esPromo: boolean;
};

export type SubscriptionForConsumption = {
  id: string;
  gymId: string;
  estado: SubscriptionStatus;
  fechaInicio: Date;
  fechaFin: Date;
  pasesRestantes: number | null;
  planSnapshot: Prisma.JsonValue;
};

export function getSnapshot(sub: { planSnapshot: Prisma.JsonValue }): SubscriptionSnapshot {
  return sub.planSnapshot as unknown as SubscriptionSnapshot;
}

export function computeEffectiveSubscriptionStatus(
  sub: Pick<SubscriptionForConsumption, "estado" | "fechaFin" | "pasesRestantes" | "planSnapshot">,
  now: Date
): SubscriptionStatus {
  if (sub.estado === "CANCELADA" || sub.estado === "SUSPENDIDA" || sub.estado === "PENDIENTE_PAGO") {
    return sub.estado;
  }
  if (now.getTime() > sub.fechaFin.getTime()) {
    return "VENCIDA";
  }
  const snap = getSnapshot(sub);
  if (snap.politicaAcceso === "PASES_TOTALES" && (sub.pasesRestantes ?? 0) <= 0) {
    return "VENCIDA";
  }
  return "ACTIVA";
}

export async function getWeeklyUsage(subscriptionId: string, gymId: string, at: Date, timeZone: string) {
  const { start, end } = getMondayWeekRangeUtc(at, timeZone);
  const used = await prisma.accessEvent.count({
    where: {
      gymId,
      subscriptionId,
      resultado: "PERMITIDO",
      fechaHora: { gte: start, lte: end },
    },
  });
  return { used, weekStart: start, weekEnd: end };
}

export async function getSubscriptionConsumption(sub: SubscriptionForConsumption, now = new Date()) {
  const timeZone = await getGymTimezone(sub.gymId);
  const snap = getSnapshot(sub);
  const effectiveStatus = computeEffectiveSubscriptionStatus(sub, now);

  let weeklyUsed: number | null = null;
  let weekStart: Date | null = null;
  let weekEnd: Date | null = null;
  if (snap.politicaAcceso === "FRECUENCIA_SEMANAL") {
    const weekly = await getWeeklyUsage(sub.id, sub.gymId, now, timeZone);
    weeklyUsed = weekly.used;
    weekStart = weekly.weekStart;
    weekEnd = weekly.weekEnd;
  }

  return {
    timeZone,
    effectiveStatus,
    snapshot: snap,
    weeklyUsed,
    weekStart,
    weekEnd,
    isWithinValidity: isDateWithinInclusive(now, sub.fechaInicio, sub.fechaFin),
  };
}

export function buildSubscriptionCreateData(params: {
  gymId: string;
  memberId: string;
  plan: {
    id: string;
    nombre: string;
    tipoVigencia: "DIARIO" | "SEMANAL" | "MENSUAL";
    duracionDias: number;
    precio: Prisma.Decimal | string | number;
    politicaAcceso: AccessPolicy;
    pasesTotales: number | null;
    frecuenciaSemanalMax: number | null;
    esPromo: boolean;
  };
  start: Date;
  timeZone: string;
  creadaPorId: string;
  estado: SubscriptionStatus;
}) {
  const fechaFin = calculateSubscriptionEnd(params.start, params.plan.tipoVigencia, params.timeZone);
  const planSnapshot: SubscriptionSnapshot = {
    planId: params.plan.id,
    nombre: params.plan.nombre,
    tipoVigencia: params.plan.tipoVigencia,
    duracionDias: params.plan.duracionDias,
    precio: String(params.plan.precio),
    politicaAcceso: params.plan.politicaAcceso,
    pasesTotales: params.plan.pasesTotales,
    frecuenciaSemanalMax: params.plan.frecuenciaSemanalMax,
    esPromo: params.plan.esPromo,
  };

  return {
    gymId: params.gymId,
    memberId: params.memberId,
    planId: params.plan.id,
    planSnapshot: planSnapshot as unknown as Prisma.InputJsonValue,
    fechaInicio: params.start,
    fechaFin,
    estado: params.estado,
    pasesRestantes:
      params.plan.politicaAcceso === "PASES_TOTALES" ? params.plan.pasesTotales ?? 0 : null,
    creadaPorId: params.creadaPorId,
  };
}

export async function getMemberCurrentSubscription(gymId: string, memberId: string) {
  return prisma.subscription.findFirst({
    where: { gymId, memberId },
    orderBy: [{ estado: "asc" }, { fechaFin: "desc" }, { createdAt: "desc" }],
    include: { plan: true },
  });
}
