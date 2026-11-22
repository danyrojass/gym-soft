import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function logAudit(params: {
  gymId: string;
  userId?: string | null;
  accion: string;
  entidad: string;
  entidadId?: string | null;
  detalle?: Record<string, unknown> | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        gymId: params.gymId,
        userId: params.userId ?? null,
        accion: params.accion,
        entidad: params.entidad,
        entidadId: params.entidadId ?? null,
        detalle: (params.detalle ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (e) {
    console.error("audit log error", e);
  }
}
