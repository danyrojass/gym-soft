import { prisma } from "@/lib/prisma";

export async function getGymTimezone(gymId: string): Promise<string> {
  const gym = await prisma.gym.findUnique({ where: { id: gymId }, select: { config: true } });
  const config = (gym?.config ?? {}) as Record<string, unknown>;
  const tz = typeof config.timezone === "string" && config.timezone.trim() ? config.timezone : null;
  return tz || process.env.GYM_TIMEZONE || "America/Argentina/Buenos_Aires";
}
