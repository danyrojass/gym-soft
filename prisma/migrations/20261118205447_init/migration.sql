-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DNI', 'CEDULA', 'OTRO');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVO', 'INACTIVO');

-- CreateEnum
CREATE TYPE "StaffRole" AS ENUM ('ADMIN', 'RECEPCION');

-- CreateEnum
CREATE TYPE "PlanValidityType" AS ENUM ('DIARIO', 'SEMANAL', 'MENSUAL');

-- CreateEnum
CREATE TYPE "AccessPolicy" AS ENUM ('ILIMITADO', 'PASES_TOTALES', 'FRECUENCIA_SEMANAL');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('PENDIENTE_PAGO', 'ACTIVA', 'VENCIDA', 'SUSPENDIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDIENTE', 'CONFIRMADO', 'RECHAZADO', 'ANULADO');

-- CreateEnum
CREATE TYPE "AccessResult" AS ENUM ('PERMITIDO', 'DENEGADO');

-- CreateEnum
CREATE TYPE "CashMovementType" AS ENUM ('INGRESO', 'EGRESO');

-- CreateEnum
CREATE TYPE "CashMethod" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'OTRO');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('ABIERTA', 'CERRADA');

-- CreateTable
CREATE TABLE "gyms" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gyms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "rol" "StaffRole" NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "members" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "documentoTipo" "DocumentType" NOT NULL DEFAULT 'DNI',
    "documentoNumero" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "fechaNacimiento" TIMESTAMP(3),
    "estado" "MemberStatus" NOT NULL DEFAULT 'ACTIVO',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipoVigencia" "PlanValidityType" NOT NULL,
    "duracionDias" INTEGER NOT NULL,
    "precio" DECIMAL(12,2) NOT NULL,
    "politicaAcceso" "AccessPolicy" NOT NULL,
    "pasesTotales" INTEGER,
    "frecuenciaSemanalMax" INTEGER,
    "esPromo" BOOLEAN NOT NULL DEFAULT false,
    "promoInicio" TIMESTAMP(3),
    "promoFin" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planSnapshot" JSONB NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estado" "SubscriptionStatus" NOT NULL DEFAULT 'PENDIENTE_PAGO',
    "pasesRestantes" INTEGER,
    "creadaPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "PaymentMethod" NOT NULL,
    "estado" "PaymentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "referencia" TEXT,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaConfirmacion" TIMESTAMP(3),
    "registradoPorId" TEXT,
    "confirmadoPorId" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_events" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "memberId" TEXT,
    "subscriptionId" TEXT,
    "documentoIngresado" TEXT NOT NULL,
    "resultado" "AccessResult" NOT NULL,
    "motivo" TEXT NOT NULL,
    "fechaHora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "puntoAcceso" TEXT NOT NULL DEFAULT 'principal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_movements" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "tipo" "CashMovementType" NOT NULL,
    "categoria" TEXT NOT NULL,
    "monto" DECIMAL(12,2) NOT NULL,
    "metodo" "CashMethod" NOT NULL,
    "paymentId" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "descripcion" TEXT,
    "registradoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_sessions" (
    "id" TEXT NOT NULL,
    "gymId" TEXT NOT NULL,
    "estado" "CashSessionStatus" NOT NULL DEFAULT 'ABIERTA',
    "aperturaMonto" DECIMAL(12,2) NOT NULL,
    "aperturaFecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aperturaPorId" TEXT,
    "cierreFecha" TIMESTAMP(3),
    "cierrePorId" TEXT,
    "esperadoEfectivo" DECIMAL(12,2),
    "contadoEfectivo" DECIMAL(12,2),
    "diferencia" DECIMAL(12,2),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cash_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_gymId_idx" ON "users"("gymId");

-- CreateIndex
CREATE INDEX "members_gymId_apellido_nombre_idx" ON "members"("gymId", "apellido", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "members_gymId_documentoNumero_key" ON "members"("gymId", "documentoNumero");

-- CreateIndex
CREATE INDEX "plans_gymId_activo_idx" ON "plans"("gymId", "activo");

-- CreateIndex
CREATE INDEX "subscriptions_gymId_memberId_estado_idx" ON "subscriptions"("gymId", "memberId", "estado");

-- CreateIndex
CREATE INDEX "subscriptions_gymId_fechaFin_idx" ON "subscriptions"("gymId", "fechaFin");

-- CreateIndex
CREATE INDEX "payments_gymId_estado_fechaPago_idx" ON "payments"("gymId", "estado", "fechaPago");

-- CreateIndex
CREATE INDEX "payments_gymId_memberId_idx" ON "payments"("gymId", "memberId");

-- CreateIndex
CREATE INDEX "access_events_gymId_fechaHora_idx" ON "access_events"("gymId", "fechaHora");

-- CreateIndex
CREATE INDEX "access_events_gymId_memberId_fechaHora_idx" ON "access_events"("gymId", "memberId", "fechaHora");

-- CreateIndex
CREATE INDEX "access_events_gymId_subscriptionId_fechaHora_idx" ON "access_events"("gymId", "subscriptionId", "fechaHora");

-- CreateIndex
CREATE UNIQUE INDEX "cash_movements_paymentId_key" ON "cash_movements"("paymentId");

-- CreateIndex
CREATE INDEX "cash_movements_gymId_fecha_tipo_idx" ON "cash_movements"("gymId", "fecha", "tipo");

-- CreateIndex
CREATE INDEX "cash_sessions_gymId_estado_aperturaFecha_idx" ON "cash_sessions"("gymId", "estado", "aperturaFecha");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plans" ADD CONSTRAINT "plans_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_creadaPorId_fkey" FOREIGN KEY ("creadaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmadoPorId_fkey" FOREIGN KEY ("confirmadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "members"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_events" ADD CONSTRAINT "access_events_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_movements" ADD CONSTRAINT "cash_movements_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "gyms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_aperturaPorId_fkey" FOREIGN KEY ("aperturaPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_sessions" ADD CONSTRAINT "cash_sessions_cierrePorId_fkey" FOREIGN KEY ("cierrePorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
