# Arquitectura — GymSoft

## Visión general
Aplicación web administrativa (Next.js, App Router) con backend integrado y base PostgreSQL local, diseñada para operación en una máquina del gimnasio y preparada para migrar a servidor/nube y escalar a múltiples gimnasios.

## Componentes implementados
- **UI/Panel (Next.js):** login, dashboard, administración y módulos operativos (socios, planes, suscripciones, pagos, check-in). Rutas protegidas por middleware + verificación server-side.
- **Autenticación:** NextAuth (Credentials) con usuarios staff en BD (`User`), contraseñas hasheadas (bcryptjs), sesión JWT con `rol`, `gymId`.
- **Persistencia:** PostgreSQL + Prisma (schema/migraciones). Modelo multi-tenant lógico mediante `gym_id` en entidades de negocio.
- **Dominio (Iteración 1):** `src/lib/domain/*` con reglas de vigencia, consumo semanal lun-dom, snapshot de plan, pagos efectivo/transferencia y motor determinista de autorización (`evaluateAccess`).
- **Infra local:** Docker Compose para BD; app en host (`npm run dev`). Backups vía `pg_dump`.
- **Documentación de dominio/hardware:** `docs/iteracion-0/*`.

## Estado por iteración
- **Iteración 2 (base software):** endpoint `POST /api/access/checkin`, kiosco `/kiosco`, adaptador de torniquete `SIMULATED|RELAY_HTTP` en `src/lib/domain/turnstile.ts`. Falta validación física en sitio con controlador/relé real.
- **Iteración 3:** caja (`/caja`), arqueos de efectivo (`/caja/arqueos`), reportes y export CSV (`/reportes`, `/reportes/export`). Ingresos automáticos por pago confirmado.
- **Iteración 4 (pendiente):** auditoría, backups automatizados/verificados, hardening, runbook migración y provisión multi-gimnasio.

## Modelo de datos (núcleo)
Entidades: `Gym`, `User`, `Member`, `Plan`, `Subscription` (snapshot de plan), `Payment`, `AccessEvent`, `CashMovement`, `CashSession`. Todas asociadas a `Gym` (`gymId`). Ver `prisma/schema.prisma`.

## Decisiones clave
- Multi-gimnasio desde el día 1 (aislamiento por `gym_id`).
- Acceso y estados derivados de suscripción/pagos/reglas (fuente de verdad), con auditoría de eventos.
- Configuración por entorno; misma pila local/nube para minimizar costo de migración.
- Torniquete: control propio + mecanismo físico estándar; DNI como credencial MVP (extensible).

## Diagrama lógico
Ver diagrama en el plan maestro (`.opencode/plan/gym-system-plan.md`) y `docs/iteracion-0/hardware-torniquete.md`.
