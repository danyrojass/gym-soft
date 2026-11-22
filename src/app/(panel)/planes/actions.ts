"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getDuracionDias, validatePlanInput } from "@/lib/domain/plans";
import { AccessPolicy, PlanValidityType } from "@prisma/client";

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

function readPlanForm(formData: FormData) {
  const tipoVigencia = String(formData.get("tipoVigencia") || "MENSUAL") as PlanValidityType;
  const politicaAcceso = String(formData.get("politicaAcceso") || "ILIMITADO") as AccessPolicy;
  const input = {
    nombre: String(formData.get("nombre") || "").trim(),
    descripcion: String(formData.get("descripcion") || "").trim() || null,
    tipoVigencia,
    precio: Number(String(formData.get("precio") || "0")),
    politicaAcceso,
    pasesTotales: politicaAcceso === "PASES_TOTALES" ? Number(formData.get("pasesTotales") || 0) : null,
    frecuenciaSemanalMax: politicaAcceso === "FRECUENCIA_SEMANAL" ? Number(formData.get("frecuenciaSemanalMax") || 0) : null,
    esPromo: String(formData.get("esPromo") || "") === "on",
    promoInicio: parseDate(String(formData.get("promoInicio") || "") || null),
    promoFin: parseDate(String(formData.get("promoFin") || "") || null),
    activo: String(formData.get("activo") || "") === "on",
  };
  return input;
}

export async function createPlanAction(formData: FormData) {
  const session = await requireSession();
  const input = readPlanForm(formData);
  const errors = validatePlanInput(input);
  if (errors.length) redirect(`/planes/nuevo?error=${encodeURIComponent(errors[0])}`);

  await prisma.plan.create({
    data: {
      gymId: session.user.gymId,
      nombre: input.nombre,
      descripcion: input.descripcion,
      tipoVigencia: input.tipoVigencia,
      duracionDias: getDuracionDias(input.tipoVigencia),
      precio: input.precio,
      politicaAcceso: input.politicaAcceso,
      pasesTotales: input.pasesTotales,
      frecuenciaSemanalMax: input.frecuenciaSemanalMax,
      esPromo: input.esPromo,
      promoInicio: input.promoInicio,
      promoFin: input.promoFin,
      activo: input.activo,
    },
  });
  revalidatePath("/planes");
  redirect("/planes?ok=1");
}

export async function updatePlanAction(planId: string, formData: FormData) {
  const session = await requireSession();
  const input = readPlanForm(formData);
  const errors = validatePlanInput(input);
  if (errors.length) redirect(`/planes/nuevo?edit=${planId}&error=${encodeURIComponent(errors[0])}`);

  await prisma.plan.update({
    where: { id: planId, gymId: session.user.gymId },
    data: {
      nombre: input.nombre,
      descripcion: input.descripcion,
      tipoVigencia: input.tipoVigencia,
      duracionDias: getDuracionDias(input.tipoVigencia),
      precio: input.precio,
      politicaAcceso: input.politicaAcceso,
      pasesTotales: input.pasesTotales,
      frecuenciaSemanalMax: input.frecuenciaSemanalMax,
      esPromo: input.esPromo,
      promoInicio: input.promoInicio,
      promoFin: input.promoFin,
      activo: input.activo,
    },
  });
  revalidatePath("/planes");
  redirect("/planes?ok=1");
}
