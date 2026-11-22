import { PrismaClient, StaffRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function upsertUser(params: {
  gymId: string;
  email: string;
  password: string;
  nombre: string;
  rol: StaffRole;
}) {
  const email = params.email.toLowerCase().trim();
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { email },
    update: {
      nombre: params.nombre,
      rol: params.rol,
      activo: true,
      gymId: params.gymId,
      passwordHash,
    },
    create: {
      gymId: params.gymId,
      nombre: params.nombre,
      email,
      passwordHash,
      rol: params.rol,
      activo: true,
    },
  });
}

async function main() {
  const gymName = process.env.SEED_GYM_NAME || "Gimnasio Principal";
  const timezone = process.env.GYM_TIMEZONE || "America/Argentina/Buenos_Aires";

  const adminEmail = process.env.SEED_ADMIN_EMAIL || "admin@gym.local";
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin12345!";
  const adminName = process.env.SEED_ADMIN_NAME || "Administrador";

  const recepcionEmail = process.env.SEED_RECEPCION_EMAIL || "recepcion@gym.local";
  const recepcionPassword = process.env.SEED_RECEPCION_PASSWORD || "Recepcion12345!";
  const recepcionName = process.env.SEED_RECEPCION_NAME || "Recepción";

  const gym = await prisma.gym.upsert({
    where: { id: "gym-default" },
    update: {
      nombre: gymName,
      config: { timezone },
    },
    create: {
      id: "gym-default",
      nombre: gymName,
      estado: "ACTIVO",
      config: { timezone },
    },
  });

  const admin = await upsertUser({
    gymId: gym.id,
    email: adminEmail,
    password: adminPassword,
    nombre: adminName,
    rol: StaffRole.ADMIN,
  });

  const recepcion = await upsertUser({
    gymId: gym.id,
    email: recepcionEmail,
    password: recepcionPassword,
    nombre: recepcionName,
    rol: StaffRole.RECEPCION,
  });

  console.log("Seed completado:");
  console.log(`- Gym: ${gym.nombre} (${gym.id})`);
  console.log(`- Admin: ${admin.email} (${admin.rol})`);
  console.log(`- Recepcion: ${recepcion.email} (${recepcion.rol})`);
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
