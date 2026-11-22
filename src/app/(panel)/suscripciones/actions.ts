"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { getGymTimezone } from "@/lib/domain/gym";
import { buildSubscriptionCreateData } from "@/lib/domain/subscriptions";
import { PaymentMethod } from "@prisma/client";

export async function createSubscriptionAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const userId = session.user.id;

  const memberId = String(formData.get("memberId") || "");
  const planId = String(formData.get("planId") || "");
  const metodo = String(formData.get("metodo") || "EFECTIVO") as PaymentMethod;
  const referencia = String(formData.get("referencia") || "").trim() || null;
  const notas = String(formData.get("notas") || "").trim() || null;
  const registrarPago = String(formData.get("registrarPago") || "on") === "on";

  if (!memberId || !planId) redirect("/suscripciones/nueva?error=Datos+incompletos");

  const [member, plan] = await Promise.all([
    prisma.member.findFirst({ where: { id: memberId, gymId } }),
    prisma.plan.findFirst({ where: { id: planId, gymId, activo: true } }),
  ]);
  if (!member || !plan) redirect("/suscripciones/nueva?error=Socio+o+plan+inv%C3%A1lido");

  const tz = await getGymTimezone(gymId);
  const now = new Date();

  if (registrarPago && metodo === "EFECTIVO") {
    await prisma.$transaction(async (tx) => {
      const subData = buildSubscriptionCreateData({
        gymId,
        memberId,
        plan,
        start: now,
        timeZone: tz,
        creadaPorId: userId,
        estado: "ACTIVA",
      });
      const sub = await tx.subscription.create({ data: subData });
      const payment = await tx.payment.create({
        data: {
          gymId,
          memberId,
          subscriptionId: sub.id,
          monto: plan.precio,
          metodo: "EFECTIVO",
          estado: "CONFIRMADO",
          referencia,
          notas,
          fechaPago: now,
          fechaConfirmacion: now,
          registradoPorId: userId,
          confirmadoPorId: userId,
        },
      });
      await tx.cashMovement.create({
        data: {
          gymId,
          tipo: "INGRESO",
          categoria: "CUOTAS_PLANES",
          monto: plan.precio,
          metodo: "EFECTIVO",
          paymentId: payment.id,
          fecha: now,
          descripcion: `Pago efectivo - ${member.apellido}, ${member.nombre} - ${plan.nombre}`,
          registradoPorId: userId,
        },
      });
    });
  } else if (registrarPago && metodo === "TRANSFERENCIA") {
    await prisma.$transaction(async (tx) => {
      const subData = buildSubscriptionCreateData({
        gymId,
        memberId,
        plan,
        start: now,
        timeZone: tz,
        creadaPorId: userId,
        estado: "PENDIENTE_PAGO",
      });
      const sub = await tx.subscription.create({ data: subData });
      await tx.payment.create({
        data: {
          gymId,
          memberId,
          subscriptionId: sub.id,
          monto: plan.precio,
          metodo: "TRANSFERENCIA",
          estado: "PENDIENTE",
          referencia,
          notas,
          fechaPago: now,
          registradoPorId: userId,
        },
      });
    });
  } else {
    const subData = buildSubscriptionCreateData({
      gymId,
      memberId,
      plan,
      start: now,
      timeZone: tz,
      creadaPorId: userId,
      estado: "PENDIENTE_PAGO",
    });
    await prisma.subscription.create({ data: subData });
  }

  revalidatePath("/suscripciones");
  revalidatePath("/socios");
  revalidatePath(`/socios/${memberId}`);
  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  redirect("/suscripciones?ok=1");
}
