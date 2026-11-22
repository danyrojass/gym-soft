"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/session";
import { StaffRole } from "@prisma/client";
import { logAudit } from "@/lib/audit";

export async function createStaffUserAction(formData: FormData) {
  const session = await requireAdminSession();
  const gymId = session.user.gymId;
  const nombre = String(formData.get("nombre") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const rol = String(formData.get("rol") || "RECEPCION") as StaffRole;

  if (!nombre || !email || password.length < 8) redirect("/admin?error=Datos+inv%C3%A1lidos");
  if (rol !== "ADMIN" && rol !== "RECEPCION") redirect("/admin?error=Rol+inv%C3%A1lido");

  const passwordHash = await bcrypt.hash(password, 10);
  try {
    const user = await prisma.user.create({ data: { gymId, nombre, email, passwordHash, rol, activo: true } });
    await logAudit({ gymId, userId: session.user.id, accion: "STAFF_USER_CREATED", entidad: "User", entidadId: user.id, detalle: { email, rol } });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (code === "P2002") redirect("/admin?error=Email+ya+registrado");
    throw e;
  }
  revalidatePath("/admin");
  redirect("/admin?ok=usuario_creado");
}

export async function toggleStaffUserAction(userId: string) {
  const session = await requireAdminSession();
  const gymId = session.user.gymId;
  if (userId === session.user.id) redirect("/admin?error=No+pod%C3%A9s+desactivarte+a+vos+mismo");
  const user = await prisma.user.findFirst({ where: { id: userId, gymId } });
  if (!user) redirect("/admin?error=Usuario+no+encontrado");
  await prisma.user.update({ where: { id: user.id }, data: { activo: !user.activo } });
  await logAudit({ gymId, userId: session.user.id, accion: "STAFF_USER_TOGGLED", entidad: "User", entidadId: user.id, detalle: { activo: !user.activo } });
  revalidatePath("/admin");
  redirect("/admin?ok=usuario_actualizado");
}
