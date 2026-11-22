# API / Contratos — GymSoft

> Iteración 1: panel operativo vía App Router + Server Actions. No hay API REST pública; los contratos internos son server actions y el motor de dominio.

## Autenticación (NextAuth)
- **`GET|POST /api/auth/*`**: rutas de NextAuth (Credentials).
  - Sesión JWT: `user.id`, `user.email`, `user.name`, `user.rol` (`ADMIN|RECEPCION`), `user.gymId`, `user.gymNombre`.
  - Login: `/login`.

## Rutas web (protegidas)
- `/dashboard` — resumen operativo.
- `/socios`, `/socios/nuevo`, `/socios/[id]` — ABM/búsqueda/ficha.
- `/planes`, `/planes/nuevo` — ABM de planes/promos.
- `/suscripciones`, `/suscripciones/nueva` — contratación con snapshot y pago.
- `/pagos` — registro, confirmación/rechazo de transferencias.
- `/checkin` — validación por DNI (panel).
- `/caja`, `/caja/arqueos` — movimientos y arqueos de efectivo.
- `/reportes`, `/reportes/export` — reportes y export CSV.
- `/admin` — solo `ADMIN`.

## Kiosco / Acceso (Iteración 2)
- `/kiosco` — UI pública de kiosco (modo pantalla completa, uso en punto de acceso).
- `POST /api/access/checkin` — body `{ documento, gymId?, puntoAcceso? }`. Normaliza documento, ejecuta `evaluateAccess`, registra `AccessEvent`, y si es `PERMITIDO` intenta accionar torniquete. Respuesta: `{ ok, decision: { resultado, motivo, motivoLabel, memberNombre, fechaHora }, turnstile: { ok, mode, message } }`.
- Adaptador torniquete: `src/lib/domain/turnstile.ts`. Config en `Gym.config.turnstile`: `{ mode: "SIMULATED"|"RELAY_HTTP", relayUrl?, pulseMs?, failOpen?, deviceId? }`. Default seguro: `SIMULATED`, fail-open lógico configurable.

## Middleware / autorización
- Matcher: `/dashboard/:path*`, `/admin/:path*`, `/panel/:path*`, `/socios/:path*`, `/planes/:path*`, `/suscripciones/:path*`, `/pagos/:path*`, `/checkin/:path*`.
- `/admin*` requiere rol `ADMIN`.
- Las páginas/actions server-side también validan sesión/gym por `requireSession()`.

## Contratos internos de dominio
- `evaluateAccess({ gymId, documento, puntoAcceso?, now?, dryRun? }) => { resultado: PERMITIDO|DENEGADO, motivo, memberId, memberNombre, subscriptionId, subscriptionEstado, fechaHora }`
  - Normaliza documento; evalúa socio activo, suscripción aplicable, vigencia efectiva, pases totales o frecuencia semanal lun-dom.
  - Registra `AccessEvent` en intentos reales; en permitido con pases totales decrementa `pasesRestantes` dentro de transacción.
- Pagos: efectivo se registra `CONFIRMADO` y genera `CashMovement` ingreso; transferencia se crea `PENDIENTE`, no habilita acceso hasta `confirmTransferPayment`.
- Suscripción: guarda `planSnapshot`; vigencia calculada por tipo (1/7/30 días) con fin inclusivo 23:59:59 hora local del gym.

## Convenciones
- Filtrar siempre por `gymId` de sesión.
- No exponer secretos; usar server actions para mutaciones.
- Transferencia pendiente nunca habilita acceso.
