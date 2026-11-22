"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { normalizeDocumento } from "@/lib/format";
import { DocumentType, MemberStatus } from "@prisma/client";

function parseDateOnly(value: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0));
}

export async function createMemberAction(formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;

  const nombre = String(formData.get("nombre") || "").trim();
  const apellido = String(formData.get("apellido") || "").trim();
  const documentoTipo = String(formData.get("documentoTipo") || "DNI") as DocumentType;
  const documentoNumero = normalizeDocumento(String(formData.get("documentoNumero") || ""));
  const telefono = String(formData.get("telefono") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const fechaNacimiento = parseDateOnly(String(formData.get("fechaNacimiento") || "") || null);
  const notas = String(formData.get("notas") || "").trim() || null;

  if (!nombre || !apellido || !documentoNumero) {
    redirect("/socios/nuevo?error=campos_obligatorios");
  }

  try {
    const member = await prisma.member.create({
      data: {
        gymId,
        nombre,
        apellido,
        documentoTipo,
        documentoNumero,
        telefono,
        email,
        fechaNacimiento,
        estado: "ACTIVO",
        notas,
      },
    });
    revalidatePath("/socios");
    redirect(`/socios/${member.id}?ok=creado`);
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (code === "P2002") {
      redirect("/socios/nuevo?error=documento_duplicado");
    }
    throw e;
  }
}

export async function updateMemberAction(memberId: string, formData: FormData) {
  const session = await requireSession();
  const gymId = session.user.gymId;

  const nombre = String(formData.get("nombre") || "").trim();
  const apellido = String(formData.get("apellido") || "").trim();
  const documentoTipo = String(formData.get("documentoTipo") || "DNI") as DocumentType;
  const documentoNumero = normalizeDocumento(String(formData.get("documentoNumero") || ""));
  const telefono = String(formData.get("telefono") || "").trim() || null;
  const email = String(formData.get("email") || "").trim().toLowerCase() || null;
  const fechaNacimiento = parseDateOnly(String(formData.get("fechaNacimiento") || "") || null);
  const estado = String(formData.get("estado") || "ACTIVO") as MemberStatus;
  const notas = String(formData.get("notas") || "").trim() || null;

  if (!nombre || !apellido || !documentoNumero) {
    redirect(`/socios/${memberId}?edit=1&error=campos_obligatorios`);
  }

  try {
    await prisma.member.update({
      where: { id: memberId, gymId },
      data: { nombre, apellido, documentoTipo, documentoNumero, telefono, email, fechaNacimiento, estado, notas },
    });
  } catch (e: unknown) {
    const code = typeof e === "object" && e !== null && "code" in e ? String((e as { code?: unknown }).code) : "";
    if (code === "P2002") {
      redirect(`/socios/${memberId}?edit=1&error=documento_duplicado`);
    }
    throw e;
  }

  revalidatePath("/socios");
  revalidatePath(`/socios/${memberId}`);
  redirect(`/socios/${memberId}?ok=actualizado`);
}

export async function toggleMemberStatusAction(memberId: string) {
  const session = await requireSession();
  const gymId = session.user.gymId;
  const member = await prisma.member.findFirst({ where: { id: memberId, gymId }, select: { estado: true } });
  if (!member) redirect("/socios");
  await prisma.member.update({
    where: { id: memberId, gymId },
    data: { estado: member.estado === "ACTIVO" ? "INACTIVO" : "ACTIVO" },
  });
  revalidatePath("/socios");
  revalidatePath(`/socios/${memberId}`);
}
