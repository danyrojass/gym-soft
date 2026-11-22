# Runbook — Operación y troubleshooting (GymSoft)

## Arranque local
1. Verificar `.env` (especialmente `DATABASE_URL`, `POSTGRES_PORT`, `NEXTAUTH_SECRET`).
2. Levantar BD: `npm run db:up` (contenedor `gymsoft-db`).
3. Migraciones/cliente: `npm run prisma:generate` y `npm run prisma:deploy` (o `prisma:migrate` en dev).
4. Seed inicial (primera vez): `npm run db:seed`.
5. App: `npm run dev` → http://localhost:3000.

## Credenciales iniciales (seed)
- Admin: `admin@gym.local` / `Admin12345!`
- Recepción: `recepcion@gym.local` / `Recepcion12345!`
(Cambiar en entorno real.)

## Backups y restauración
- Ver procedimiento detallado: `docs/iteracion-0/backup-restore.md`.
- Backup: `npm run backup:db` (genera `.dump` en `backups/`).
- Restore de prueba: `npm run restore:db -- -DumpFile .\backups\<archivo>.dump -TargetDb gymsoft_restore_test` (o invocar script directamente con parámetros).
- Recomendado: copia externa, retención y restauraciones de prueba periódicas.

## Troubleshooting
- **BD no conecta / puerto ocupado:** comprobar contenedor (`docker compose ps`), salud (`docker inspect gymsoft-db`), y que `POSTGRES_PORT`/`DATABASE_URL` apunten al puerto publicado correcto (ej. 5434). Conflictos comunes con Postgres local en 5432.
- **Error de credenciales Prisma contra localhost:** preferir `127.0.0.1` en `DATABASE_URL`; verificar que no haya otro servicio en el puerto mapeado.
- **Migraciones pendientes:** `npm run prisma:deploy` (prod) o `npm run prisma:migrate` (dev).
- **Seed falla:** ejecutar `npm run db:seed` (usa `node prisma/seed.js`). Verificar `DATABASE_URL` y que la BD esté arriba.
- **Login inválido:** confirmar usuario activo en BD, seed ejecutado y `NEXTAUTH_SECRET/NEXTAUTH_URL` correctos.
- **Acceso denegado a /admin:** esperado para rol `RECEPCION`; requiere `ADMIN`.
- **Respaldo/restore:** requiere Docker y contenedor en ejecución; revisar permisos de `backups/` y logs de `pg_dump/pg_restore`.

## Operación diaria
- Levantar BD: `npm run db:up`
- Levantar app: `npm run dev` (o `npm run build && npm run start`)
- Panel staff: `http://localhost:3000/login`
- Kiosco de acceso: `http://localhost:3000/kiosco`
- Backup manual: `npm run backup:db`

## Torniquete (Iteración 2)
- Default `SIMULATED`: registra acceso y simula apertura; no acciona hardware.
- Relé HTTP: configurar `Gym.config.turnstile`, ej. `{"turnstile":{"mode":"RELAY_HTTP","relayUrl":"http://<controlador>/pulse","pulseMs":1500,"failOpen":true,"deviceId":"principal"}}`.
- El controlador debe aceptar `POST` JSON `{ action, pulseMs, deviceId }` y accionar pulso/contacto seco. Validar fail-open/fail-secure en sitio.

## Caja (Iteración 3)
- Pagos confirmados generan `CashMovement` ingreso automáticamente.
- Egresos/ingresos manuales: `/caja`. Arqueos: `/caja/arqueos` (diferencia = contado - esperado efectivo desde apertura).
- Reportes/export CSV: `/reportes`.

## Operación futura
- Endurecimiento, auditoría, migración a servidor/nube y multi-gimnasio: Iteración 4.
