import { CashMethod, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const CASH_CATEGORIES = {
  INGRESO: ["CUOTAS_PLANES", "VENTAS", "OTROS_INGRESOS"],
  EGRESO: ["ALQUILER", "SUELDOS", "SERVICIOS", "INSUMOS", "MANTENIMIENTO", "OTROS_EGRESOS"],
} as const;

export function normalizeCashMethod(method: string): CashMethod {
  if (method === "EFECTIVO" || method === "TRANSFERENCIA" || method === "OTRO") return method;
  return "OTRO";
}

export async function getOpenCashSession(gymId: string) {
  return prisma.cashSession.findFirst({
    where: { gymId, estado: "ABIERTA" },
    orderBy: { aperturaFecha: "desc" },
    include: { aperturaPor: true },
  });
}

export async function getCashSummary(gymId: string, from: Date, to: Date) {
  const where: Prisma.CashMovementWhereInput = { gymId, fecha: { gte: from, lte: to } };
  const [ingresos, egresos, byCategory, byMethod] = await Promise.all([
    prisma.cashMovement.aggregate({ where: { ...where, tipo: "INGRESO" }, _sum: { monto: true } }),
    prisma.cashMovement.aggregate({ where: { ...where, tipo: "EGRESO" }, _sum: { monto: true } }),
    prisma.cashMovement.groupBy({ by: ["tipo", "categoria"], where, _sum: { monto: true }, _count: { _all: true } }),
    prisma.cashMovement.groupBy({ by: ["tipo", "metodo"], where, _sum: { monto: true }, _count: { _all: true } }),
  ]);

  const totalIngresos = Number(ingresos._sum.monto ?? 0);
  const totalEgresos = Number(egresos._sum.monto ?? 0);
  return {
    totalIngresos,
    totalEgresos,
    balance: totalIngresos - totalEgresos,
    byCategory,
    byMethod,
  };
}

export async function getExpectedCashForSession(gymId: string, session: { aperturaFecha: Date; aperturaMonto: Prisma.Decimal | number | string }) {
  const [ing, egr] = await Promise.all([
    prisma.cashMovement.aggregate({ where: { gymId, metodo: "EFECTIVO", tipo: "INGRESO", fecha: { gte: session.aperturaFecha } }, _sum: { monto: true } }),
    prisma.cashMovement.aggregate({ where: { gymId, metodo: "EFECTIVO", tipo: "EGRESO", fecha: { gte: session.aperturaFecha } }, _sum: { monto: true } }),
  ]);
  const opening = Number(session.aperturaMonto);
  const totalIn = Number(ing._sum.monto ?? 0);
  const totalOut = Number(egr._sum.monto ?? 0);
  return opening + totalIn - totalOut;
}

export function parseDateRange(from?: string | null, to?: string | null) {
  const now = new Date();
  const defaultFrom = new Date(now);
  defaultFrom.setDate(defaultFrom.getDate() - 30);
  defaultFrom.setHours(0, 0, 0, 0);
  const defaultTo = new Date(now);
  defaultTo.setHours(23, 59, 59, 999);

  const parse = (v: string | null | undefined, endOfDay: boolean) => {
    if (!v) return null;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return null;
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), endOfDay ? 23 : 0, endOfDay ? 59 : 0, endOfDay ? 59 : 0, endOfDay ? 999 : 0);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  return { from: parse(from, false) ?? defaultFrom, to: parse(to, true) ?? defaultTo };
}
