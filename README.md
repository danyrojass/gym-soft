# GymSoft

Sistema de gestión para gimnasio (operación local, Iteración 0 implementada como base técnica).

Incluye base para: socios, planes/promos, suscripciones, pagos (efectivo/transferencia), control de acceso por DNI con torniquete propio (integración futura) y caja/ingresos-egresos, con modelo **multi-gimnasio** (`gym_id`) desde el inicio.

## Stack
- **Web:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **BD:** PostgreSQL 16 (Docker)
- **ORM:** Prisma 6 + migraciones
- **Auth:** NextAuth (Credentials, JWT) con roles `ADMIN` / `RECEPCION`
- **Entorno local:** Docker Compose, configuración por `.env`

## Estado actual
### Iteración 0 (base)
- [x] Proyecto Next.js + TS + Tailwind y configuración por entorno
- [x] Docker Compose con PostgreSQL local (`POSTGRES_PORT` configurable; por defecto 5434)
- [x] Esquema Prisma multi-gimnasio y migración inicial
- [x] Seed con gimnasio y usuarios staff por defecto
- [x] Login y protección de rutas por rol
- [x] Documentación de reglas/hardware y scripts backup/restore

### Iteración 1 (MVP operativo software)
- [x] Socios, planes/promos, suscripciones con snapshot, pagos efectivo/transferencia, check-in software con `evaluateAccess` y `AccessEvent`.

### Iteración 2 (torniquete/kiosco - base software)
- [x] API de check-in: `POST /api/access/checkin` (DNI/gym/puntoAcceso) → decisión + actuación.
- [x] Adaptador torniquete: `src/lib/domain/turnstile.ts` con modo `SIMULATED` o `RELAY_HTTP` configurable en `Gym.config.turnstile`.
- [x] Kiosco dedicado: `/kiosco` (UI fullscreen, DNI, resultado permitido/denegado, dispara apertura en permitido).

### Iteración 3 (caja y contabilidad operativa)
- [x] Caja: movimientos ingreso/egreso manuales, categorías, filtros por período. ` /caja`.
- [x] Arqueos efectivo: apertura/cierre, esperado vs contado, diferencia. `/caja/arqueos`.
- [x] Reportes: ingresos/egresos/balance, por categoría, pendientes de transferencias, asistencias/denegados, export CSV. `/reportes`, `/reportes/export`.

> Pendientes: integración física real de relé/controlador en sitio (ajustar `Gym.config.turnstile`), endurecimiento/auditoría/migración multi-gym (Iteración 4). Build validado con `NODE_OPTIONS=--max-old-space-size=4096`.

## Requisitos
- Node.js 20+ y npm
- Docker Desktop / Docker Engine + Docker Compose

## Configuración rápida

1. Copiar variables de entorno (si no existe `.env`):
   ```powershell
   Copy-Item .env.example .env
   ```
   Ajustar `DATABASE_URL` / `POSTGRES_PORT` si los puertos por defecto están ocupados y definir un `NEXTAUTH_SECRET` seguro.

2. Levantar PostgreSQL:
   ```powershell
   npm run db:up
   ```

3. Instalar dependencias (si hace falta):
   ```powershell
   npm install
   ```

4. Generar cliente Prisma y aplicar migraciones:
   ```powershell
   npm run prisma:generate
   npm run prisma:deploy
   ```
   Para desarrollo con historial interactivo: `npm run prisma:migrate`.

5. Cargar datos iniciales (gym + usuarios):
   ```powershell
   npm run db:seed
   ```

6. Iniciar la app:
   ```powershell
   npm run dev
   ```
   Abrir http://localhost:3000

## Credenciales seed (por defecto)
- **Admin:** `admin@gym.local` / `Admin12345!` (rol `ADMIN`, acceso a `/admin`)
- **Recepción:** `recepcion@gym.local` / `Recepcion12345!` (rol `RECEPCION`)

> Cambiar contraseñas y `NEXTAUTH_SECRET` antes de cualquier uso real.

## Scripts útiles
- `npm run dev` / `build` / `start` — app Next.js
- `npm run lint` — ESLint
- `npm run db:up` / `db:down` / `db:reset` — contenedor PostgreSQL
- `npm run prisma:generate` / `prisma:migrate` / `prisma:deploy` / `prisma:studio`
- `npm run db:seed` — seed (`node prisma/seed.js`)
- `npm run backup:db` — genera `backups/gymsoft-YYYYMMDD-HHmmss.dump`
- `npm run restore:db` — restaura dump (ver parámetros en script y `docs/iteracion-0/backup-restore.md`)

## Backup y restore (resumen)
- Backup (requiere contenedor `gymsoft-db` en ejecución):
  ```powershell
  ./scripts/backup-db.ps1
  ```
- Restore de prueba a BD temporal:
  ```powershell
  ./scripts/restore-db.ps1 -DumpFile .\backups\<archivo>.dump -TargetDb gymsoft_restore_test
  ```
  Detalle y recomendaciones en `docs/iteracion-0/backup-restore.md`.

## Documentación
- Plan maestro: `C:\Users\danyr\.opencode\plan\gym-system-plan.md` (referencia de planificación)
- Iteración 0: `docs/iteracion-0/reglas-negocio.md`, `docs/iteracion-0/hardware-torniquete.md`, `docs/iteracion-0/backup-restore.md`
- Arquitectura/API/runbook/glosario: `docs/architecture.md`, `docs/api-reference.md`, `docs/runbook.md`, `docs/glossary.md`

## Notas
- Puerto PostgreSQL por defecto del proyecto en `.env.example`: `5434` (para evitar conflicto con instancias locales en 5432/5433). Ajustar según el equipo.
- El esquema incluye entidades núcleo para iteraciones futuras; la UI/logic operativa completa se implementa en Iteraciones 1+.
