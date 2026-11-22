import { AccessPolicy, PlanValidityType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type PlanFormInput = {
  nombre: string;
  descripcion?: string | null;
  tipoVigencia: PlanValidityType;
  precio: number;
  politicaAcceso: AccessPolicy;
  pasesTotales?: number | null;
  frecuenciaSemanalMax?: number | null;
  esPromo: boolean;
  promoInicio?: Date | null;
  promoFin?: Date | null;
  activo: boolean;
};

export function getDuracionDias(tipoVigencia: PlanValidityType): number {
  if (tipoVigencia === "DIARIO") return 1;
  if (tipoVigencia === "SEMANAL") return 7;
  return 30;
}

export function validatePlanInput(input: PlanFormInput): string[] {
  const errors: string[] = [];
  if (!input.nombre?.trim()) errors.push("El nombre es obligatorio.");
  if (!Number.isFinite(input.precio) || input.precio < 0) errors.push("El precio debe ser un número mayor o igual a 0.");
  if (input.politicaAcceso === "PASES_TOTALES") {
    if (!input.pasesTotales || input.pasesTotales < 1) errors.push("Pases totales debe ser mayor o igual a 1.");
  }
  if (input.politicaAcceso === "FRECUENCIA_SEMANAL") {
    if (!input.frecuenciaSemanalMax || input.frecuenciaSemanalMax < 1) errors.push("Frecuencia semanal debe ser mayor o igual a 1.");
  }
  if (input.promoInicio && input.promoFin && input.promoInicio > input.promoFin) {
    errors.push("La fecha de inicio de promo no puede ser posterior al fin.");
  }
  return errors;
}

export function buildPlanSnapshot(plan: {
  id: string;
  nombre: string;
  tipoVigencia: PlanValidityType;
  duracionDias: number;
  precio: unknown;
  politicaAcceso: AccessPolicy;
  pasesTotales: number | null;
  frecuenciaSemanalMax: number | null;
  esPromo: boolean;
}) {
  return {
    planId: plan.id,
    nombre: plan.nombre,
    tipoVigencia: plan.tipoVigencia,
    duracionDias: plan.duracionDias,
    precio: String(plan.precio),
    politicaAcceso: plan.politicaAcceso,
    pasesTotales: plan.pasesTotales,
    frecuenciaSemanalMax: plan.frecuenciaSemanalMax,
    esPromo: plan.esPromo,
  };
}

export async function getActivePlans(gymId: string) {
  return prisma.plan.findMany({
    where: { gymId, activo: true },
    orderBy: [{ esPromo: "desc" }, { nombre: "asc" }],
  });
}
