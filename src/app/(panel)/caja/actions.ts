"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getExpectedCashForSession, getOpenCashSession, normalizeCashMethod } from "@/lib/domain/cash";
import { CashMovementType } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function createCashMovementAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const tipo = String(formData.get("tipo") || "EGRESO") as CashMovementType;
  const categoria = String(formData.get("categoria") || "").trim() || "OTROS_EGRESOS";
  const monto = Number(String(formData.get("monto") || "0"));
  const metodo = normalizeCashMethod(String(formData.get("metodo") || "EFECTIVO"));
  const descripcion = String(formData.get("descripcion") || "").trim() || null;
  const fechaStr = String(formData.get("fecha") || "").trim();
  const fecha = fechaStr ? new Date(`${fechaStr}T12:00:00`) : new Date();

  if (!Number.isFinite(monto) || monto <= 0) redirect("/caja?error=Monto+inv%C3%A1lido");
  if (tipo !== "INGRESO" && tipo !== "EGRESO") redirect("/caja?error=Tipo+inv%C3%A1lido");

  const movement = await prisma.cashMovement.create({
    data: { gymId, tipo, categoria, monto, metodo, fecha, descripcion, registradoPorId: session.user.id },
  });
  await logAudit({ gymId, userId: session.user.id, accion: "CASH_MOVEMENT_CREATED", entidad: "CashMovement", entidadId: movement.id, detalle: { tipo, categoria, monto, metodo } });

  revalidatePath("/caja"); revalidatePath("/dashboard"); revalidatePath("/reportes");
  redirect("/caja?ok=1");
}

export async function openCashSessionAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const aperturaMonto = Number(String(formData.get("aperturaMonto") || "0"));
  if (!Number.isFinite(aperturaMonto) || aperturaMonto < 0) redirect("/caja/arqueos?error=Monto+inv%C3%A1lido");

  const open = await getOpenCashSession(gymId);
  if (open) redirect("/caja/arqueos?error=Ya+hay+una+caja+abierta");

  const created = await prisma.cashSession.create({
    data: { gymId, estado: "ABIERTA", aperturaMonto, aperturaFecha: new Date(), aperturaPorId: session.user.id },
  });
  await logAudit({ gymId, userId: session.user.id, accion: "CASH_SESSION_OPENED", entidad: "CashSession", entidadId: created.id, detalle: { aperturaMonto } });
  revalidatePath("/caja"); revalidatePath("/caja/arqueos");
  redirect("/caja/arqueos?ok=abierta");
}

export async function closeCashSessionAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const sessionId = String(formData.get("sessionId") || "");
  const contadoEfectivo = Number(String(formData.get("contadoEfectivo") || "0"));
  const observaciones = String(formData.get("observaciones") || "").trim() || null;
  if (!sessionId) redirect("/caja/arqueos?error=Sesi%C3%B3n+inv%C3%A1lida");
  if (!Number.isFinite(contadoEfectivo) || contadoEfectivo < 0) redirect("/caja/arqueos?error=Conteo+inv%C3%A1lido");

  const cashSession = await prisma.cashSession.findFirst({ where: { id: sessionId, gymId, estado: "ABIERTA" } });
  if (!cashSession) redirect("/caja/arqueos?error=No+hay+caja+abierta");

  const esperado = await getExpectedCashForSession(gymId, cashSession);
  const diferencia = contadoEfectivo - esperado;
  await prisma.cashSession.update({
    where: { id: cashSession.id },
    data: { estado: "CERRADA", cierreFecha: new Date(), cierrePorId: session.user.id, esperadoEfectivo: esperado, contadoEfectivo, diferencia, observaciones },
  });
  await logAudit({ gymId, userId: session.user.id, accion: "CASH_SESSION_CLOSED", entidad: "CashSession", entidadId: cashSession.id, detalle: { esperado, contadoEfectivo, diferencia } });

  revalidatePath("/caja"); revalidatePath("/caja/arqueos"); revalidatePath("/reportes");
  redirect("/caja/arqueos?ok=cerrada");
}
