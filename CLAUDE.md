# GymSoft — contexto para asistentes

## Propósito
Sistema de gestión para gimnasio: socios, planes/promos dinámicos, suscripciones, pagos manuales (efectivo/transferencia), control de acceso por DNI con torniquete propio (integración progresiva) y caja/ingresos-egresos. Operación inicial local (1 gimnasio, 1 punto de acceso), preparado para migración y multi-gimnasio (`gym_id` en todas las entidades de negocio).

## Stack y estructura
- **Next.js 14 (App Router)** + TypeScript + Tailwind CSS (`src/app`, `src/components`, `src/lib`)
- **PostgreSQL** + **Prisma 6** (`prisma/schema.prisma`, `prisma/migrations`, `prisma/seed.js`)
- **Auth:** NextAuth v4 Credentials + JWT (`src/lib/auth.ts`, `src/app/api/auth/[...nextauth]`, `src/middleware.ts`), roles `ADMIN`/`RECEPCION`
- **Infra local:** `docker-compose.yml`, `Dockerfile`, scripts en `scripts/`, config por `.env` (ver `.env.example`)
- **Docs:** `docs/` (arquitectura, api, runbook, glosario, `docs/iteracion-0/*`)

## Comandos clave
- `npm run db:up` / `db:down` — PostgreSQL (Docker)
- `npm run prisma:generate` / `prisma:migrate` / `prisma:deploy` — Prisma
- `npm run db:seed` — datos iniciales (gym + admin + recepción)
- `npm run dev` / `build` / `start` / `lint`
- `npm run backup:db` / `restore:db` — backup/restore BD (PowerShell)

## Reglas de negocio importantes
- Vigencias: diario 1 día, semanal 7 días corridos, mensual 30 días corridos. **Sin días de gracia**.
- Frecuencia semanal: semana **lunes–domingo** (cupo reinicia lunes 00:00). Promo ejemplo: 3 veces/semana por 1 mes.
- Pagos: **efectivo** confirmado al instante; **transferencia** pendiente y **no habilita acceso** hasta confirmar.
- Acceso por **DNI/cédula** en punto único; decisión determinista y auditable (`AccessEvent`).
- Suscripción guarda **snapshot** de reglas/precio del plan. Estado/consumo derivado (fuente de verdad).
- Detalle y checklist: `docs/iteracion-0/reglas-negocio.md`.

## Estado
- **Iteración 0:** base técnica implementada (entorno, esquema/migración, seed, auth/roles, docs, backup/restore). Hardware torniquete pendiente de relevamiento definitivo.
- **Iteraciones 1+:** módulos operativos (ABM socios/planes, suscripciones/pagos, motor de acceso y check-in, integración torniquete, caja/reportes) según `plan` maestro.

## Convenciones
- Mantener `gym_id` en nuevas entidades/consultas; respetar aislamiento por tenant.
- Configuración por entorno (no hardcodear hosts/secretos). Zona horaria del gimnasio en config/seed (`GYM_TIMEZONE`).
- Actualizar `docs/` cuando cambios afecten arquitectura, API/contratos, operaciones o glosario.
