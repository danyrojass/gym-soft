import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || !session.user.gymId) {
    redirect("/login");
  }
  return session;
}

export async function requireAdminSession() {
  const session = await requireSession();
  if (session.user.rol !== "ADMIN") {
    redirect("/dashboard?error=forbidden");
  }
  return session;
}

export function getSessionUser(session: { user: { id: string; gymId: string; rol: string; name?: string | null; email?: string | null } }) {
  return {
    id: session.user.id,
    gymId: session.user.gymId,
    rol: session.user.rol,
    name: session.user.name ?? null,
    email: session.user.email ?? null,
  };
}
