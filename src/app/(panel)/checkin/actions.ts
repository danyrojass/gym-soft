"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/session";
import { evaluateAccess } from "@/lib/domain/access";

export async function checkInAction(formData: FormData) {
  const session = await requireSession();
  const documento = String(formData.get("documento") || "").trim();
  if (!documento) redirect("/checkin");

  const decision = await evaluateAccess({
    gymId: session.user.gymId,
    documento,
    puntoAcceso: "principal",
  });

  revalidatePath("/checkin");
  revalidatePath("/dashboard");
  if (decision.memberId) revalidatePath(`/socios/${decision.memberId}`);

  const params = new URLSearchParams({
    resultado: decision.resultado,
    motivo: decision.motivo,
    doc: documento,
  });
  if (decision.memberNombre) params.set("nombre", decision.memberNombre);
  redirect(`/checkin?${params.toString()}`);
}
