"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { PaymentMethod } from "@prisma/client";
import { confirmTransferPayment, rejectTransferPayment } from "@/lib/domain/payments";
import { getGymTimezone } from "@/lib/domain/gym";
import { buildSubscriptionCreateData } from "@/lib/domain/subscriptions";
import { logAudit } from "@/lib/audit";

export async function createPaymentAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const userId = session.user.id;

  const memberId = String(formData.get("memberId") || "");
  const subscriptionId = String(formData.get("subscriptionId") || "") || null;
  const monto = Number(String(formData.get("monto") || "0"));
  const metodo = String(formData.get("metodo") || "EFECTIVO") as PaymentMethod;
  const referencia = String(formData.get("referencia") || "").trim() || null;
  const notas = String(formData.get("notas") || "").trim() || null;

  if (!memberId || !Number.isFinite(monto) || monto < 0) redirect("/pagos?error=Datos+inv%C3%A1lidos");

  const member = await prisma.member.findFirst({ where: { id: memberId, gymId } });
  if (!member) redirect("/pagos?error=Socio+inv%C3%A1lido");

  let sub = null;
  if (subscriptionId) {
    sub = await prisma.subscription.findFirst({ where: { id: subscriptionId, gymId, memberId }, include: { plan: true } });
    if (!sub) redirect("/pagos?error=Suscripci%C3%B3n+inv%C3%A1lida");
  }

  const now = new Date();

  let createdPaymentId: string | null = null;
  if (metodo === "EFECTIVO") {
    await prisma.$transaction(async (tx) => {
      let activeSubId = sub?.id ?? null;

      if (sub) {
        const tz = await getGymTimezone(gymId);
        if (sub.estado === "PENDIENTE_PAGO") await tx.subscription.update({ where: { id: sub.id }, data: { estado: "CANCELADA" } });
        else if (sub.estado === "ACTIVA") await tx.subscription.update({ where: { id: sub.id }, data: { estado: "VENCIDA" } });
        const newSub = await tx.subscription.create({
          data: buildSubscriptionCreateData({ gymId, memberId, plan: sub.plan, start: now, timeZone: tz, creadaPorId: userId, estado: "ACTIVA" }),
        });
        activeSubId = newSub.id;
      }

      const payment = await tx.payment.create({
        data: {
          gymId, memberId, subscriptionId: activeSubId, monto, metodo: "EFECTIVO", estado: "CONFIRMADO",
          referencia, notas, fechaPago: now, fechaConfirmacion: now, registradoPorId: userId, confirmadoPorId: userId,
        },
      });
      createdPaymentId = payment.id;
      await tx.cashMovement.create({
        data: {
          gymId, tipo: "INGRESO", categoria: "CUOTAS_PLANES", monto, metodo: "EFECTIVO", paymentId: payment.id, fecha: now,
          descripcion: `Pago efectivo - ${member.apellido}, ${member.nombre}`, registradoPorId: userId,
        },
      });
    });
    await logAudit({ gymId, userId, accion: "PAYMENT_CASH_CONFIRMED", entidad: "Payment", entidadId: createdPaymentId, detalle: { memberId, subscriptionId, monto, metodo } });
  } else {
    const payment = await prisma.payment.create({
      data: { gymId, memberId, subscriptionId: sub?.id ?? null, monto, metodo: "TRANSFERENCIA", estado: "PENDIENTE", referencia, notas, fechaPago: now, registradoPorId: userId },
    });
    await logAudit({ gymId, userId, accion: "PAYMENT_TRANSFER_PENDING", entidad: "Payment", entidadId: payment.id, detalle: { memberId, subscriptionId, monto } });
  }

  revalidatePath("/pagos");
  revalidatePath("/dashboard");
  revalidatePath("/socios");
  revalidatePath(`/socios/${memberId}`);
  revalidatePath("/suscripciones");
  redirect("/pagos?ok=1");
}

export async function confirmPaymentAction(paymentId: string) {
  const session = await requireSession();
  try {
    await confirmTransferPayment({ gymId: session.user.gymId, paymentId, confirmedByUserId: session.user.id });
    await logAudit({ gymId: session.user.gymId, userId: session.user.id, accion: "PAYMENT_TRANSFER_CONFIRMED", entidad: "Payment", entidadId: paymentId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo confirmar";
    redirect(`/pagos?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/pagos"); revalidatePath("/dashboard"); revalidatePath("/suscripciones"); revalidatePath("/socios"); revalidatePath("/caja"); revalidatePath("/reportes");
  redirect("/pagos?ok=1");
}

export async function rejectPaymentAction(paymentId: string) {
  const session = await requireSession();
  try {
    await rejectTransferPayment({ gymId: session.user.gymId, paymentId, confirmedByUserId: session.user.id });
    await logAudit({ gymId: session.user.gymId, userId: session.user.id, accion: "PAYMENT_TRANSFER_REJECTED", entidad: "Payment", entidadId: paymentId });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "No se pudo rechazar";
    redirect(`/pagos?error=${encodeURIComponent(message)}`);
  }
  revalidatePath("/pagos"); revalidatePath("/dashboard"); revalidatePath("/suscripciones");
  redirect("/pagos?ok=1");
}
