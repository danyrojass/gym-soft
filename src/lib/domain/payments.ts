import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getGymTimezone } from "@/lib/domain/gym";
import { buildSubscriptionCreateData } from "@/lib/domain/subscriptions";

export async function confirmTransferPayment(params: {
  gymId: string;
  paymentId: string;
  confirmedByUserId: string;
}) {
  const now = new Date();

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const payment = await tx.payment.findFirst({
      where: { id: params.paymentId, gymId: params.gymId },
      include: { subscription: { include: { plan: true } }, member: true },
    });
    if (!payment) throw new Error("Pago no encontrado.");
    if (payment.metodo !== "TRANSFERENCIA") throw new Error("Solo se pueden confirmar pagos por transferencia.");
    if (payment.estado === "CONFIRMADO") return payment;
    if (payment.estado !== "PENDIENTE") throw new Error("El pago no está pendiente.");

    await tx.payment.update({
      where: { id: payment.id },
      data: {
        estado: "CONFIRMADO",
        fechaConfirmacion: now,
        confirmadoPorId: params.confirmedByUserId,
      },
    });

    // Activate/renew subscription. Policy: create a new subscription on confirmation.
    if (payment.subscriptionId && payment.subscription) {
      const tz = await getGymTimezone(params.gymId);
      const plan = payment.subscription.plan;
      // Deactivate previous pending/current active? We'll create new active; mark old as VENCIDA if it was pending/old active and different.
      // Simpler: create new subscription from the same plan, set as ACTIVA starting now.
      const subData = buildSubscriptionCreateData({
        gymId: params.gymId,
        memberId: payment.memberId,
        plan: {
          id: plan.id,
          nombre: plan.nombre,
          tipoVigencia: plan.tipoVigencia,
          duracionDias: plan.duracionDias,
          precio: plan.precio,
          politicaAcceso: plan.politicaAcceso,
          pasesTotales: plan.pasesTotales,
          frecuenciaSemanalMax: plan.frecuenciaSemanalMax,
          esPromo: plan.esPromo,
        },
        start: now,
        timeZone: tz,
        creadaPorId: params.confirmedByUserId,
        estado: "ACTIVA",
      });

      // Mark the original pending subscription as CANCELADA? Or keep as historical; better: if it was PENDIENTE_PAGO, mark CANCELADA and create new ACTIVA linked via payment update? 
      // We keep traceability: update payment.subscriptionId to new subscription.
      if (payment.subscription.estado === "PENDIENTE_PAGO") {
        await tx.subscription.update({ where: { id: payment.subscription.id }, data: { estado: "CANCELADA" } });
      } else if (payment.subscription.estado === "ACTIVA") {
        await tx.subscription.update({ where: { id: payment.subscription.id }, data: { estado: "VENCIDA" } });
      }

      const newSub = await tx.subscription.create({ data: subData });
      await tx.payment.update({ where: { id: payment.id }, data: { subscriptionId: newSub.id } });
    }

    await tx.cashMovement.upsert({
      where: { paymentId: payment.id },
      update: {
        monto: payment.monto,
        metodo: payment.metodo,
        fecha: now,
        categoria: "CUOTAS_PLANES",
        descripcion: `Pago confirmado - ${payment.member.apellido}, ${payment.member.nombre}`,
        registradoPorId: params.confirmedByUserId,
      },
      create: {
        gymId: params.gymId,
        tipo: "INGRESO",
        categoria: "CUOTAS_PLANES",
        monto: payment.monto,
        metodo: payment.metodo,
        paymentId: payment.id,
        fecha: now,
        descripcion: `Pago confirmado - ${payment.member.apellido}, ${payment.member.nombre}`,
        registradoPorId: params.confirmedByUserId,
      },
    });

    return tx.payment.findUnique({ where: { id: payment.id }, include: { subscription: true, member: true } });
  });
}

export async function rejectTransferPayment(params: {
  gymId: string;
  paymentId: string;
  confirmedByUserId: string;
}) {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({ where: { id: params.paymentId, gymId: params.gymId } });
    if (!payment) throw new Error("Pago no encontrado.");
    if (payment.metodo !== "TRANSFERENCIA") throw new Error("Solo se pueden rechazar pagos por transferencia.");
    if (payment.estado !== "PENDIENTE") throw new Error("El pago no está pendiente.");
    return tx.payment.update({
      where: { id: payment.id },
      data: { estado: "RECHAZADO", confirmadoPorId: params.confirmedByUserId, fechaConfirmacion: new Date() },
    });
  });
}

export function canCreateCashIncome(metodo: PaymentMethod, estado: PaymentStatus) {
  return estado === "CONFIRMADO" && (metodo === "EFECTIVO" || metodo === "TRANSFERENCIA");
}
