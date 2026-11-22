# Iteración 0 — Backup y restauración (PostgreSQL local)

## Objetivo
Proteger los datos ante falla de disco, corrupción o borrado accidental en el despliegue local (máquina única). Los backups deben ser **portables** para la migración futura.

## Estrategia
- **Herramienta:** `pg_dump` (formato custom `-Fc` recomendado) para respaldo lógico; `pg_restore` para recuperación.
- **Frecuencia recomendada:** diaria automática + backup manual antes de cambios relevantes (actualizaciones/migraciones).
- **Retención sugerida:** mantener al menos 7 diarios y 4 semanales (ajustar según espacio). Rotar/eliminar antiguos.
- **Copia externa:** replicar el directorio de backups a un medio externo (disco USB/NAS/ruta de red) — el backup en el mismo disco no protege ante falla del disco.
- **Verificación:** realizar una **restauración de prueba** periódica (al menos una vez en Iteración 0 y luego mensual) en una base de datos temporal.

## Requisitos
- PostgreSQL accesible (local o contenedor Docker).
- `pg_dump`/`pg_restore` disponibles en el host o ejecutados dentro del contenedor (`docker exec`).
- Variables/credenciales leídas desde `.env` (no hardcodear). Ver `.env.example`.

## Scripts provistos
- `scripts/backup-db.ps1`: genera un dump con timestamp en `backups/`.
- `scripts/restore-db.ps1`: restaura un dump a una base de datos destino (por defecto una BD de prueba).

> Ejecutar desde PowerShell en la raíz del proyecto. Revisar/ajustar nombres de contenedor, base y credenciales según el entorno real.

## Procedimiento — Backup manual
1. Asegurar que PostgreSQL esté en ejecución (`docker compose up -d db` si se usa Docker).
2. Ejecutar:
   ```powershell
   ./scripts/backup-db.ps1
   ```
3. Verificar que se creó el archivo `backups/gymsoft-YYYYMMDD-HHmmss.dump` y que el tamaño es coherente (> 0).
4. Copiar el archivo a almacenamiento externo.

## Procedimiento — Restauración de prueba (verificación)
> **No restaurar sobre la base productiva sin necesidad.** La verificación se hace contra una base temporal.

1. Elegir un archivo de backup reciente (`backups/*.dump`).
2. Ejecutar:
   ```powershell
   ./scripts/restore-db.ps1 -DumpFile .\backups\gymsoft-YYYYMMDD-HHmmss.dump -TargetDb gymsoft_restore_test
   ```
3. Verificar que la restauración finaliza sin errores y que las tablas/datos clave existen (Gyms, Users, etc.).
4. Eliminar la base de prueba si ya no se necesita.

## Restauración ante desastre (producción local)
1. Detener la aplicación para evitar escrituras.
2. Crear/limpiar la base destino y restaurar el último dump válido con `pg_restore --clean --if-exists` (o según procedimiento definido).
3. Ejecutar migraciones pendientes si el dump es de una versión anterior del esquema (`npx prisma migrate deploy`).
4. Verificar integridad básica (login, conteos, último movimiento) y reanudar operación.
5. Registrar el incidente y la fecha/hora del backup restaurado (pérdida de datos = ventana desde ese backup).

## Automatización (Windows, Iteración 0/4)
- Usar **Programador de tareas** de Windows para ejecutar `scripts/backup-db.ps1` en un horario fijo (ej. diario 02:00) con el equipo encendido.
- Asegurar que la tarea tenga acceso a Docker/`pg_dump` y a la ruta de `backups/`.
- Configurar copia posterior a medio externo (script adicional o sincronización).
- En Iteración 4 se endurece con rotación, alertas de fallo y verificación periódica.

## Notas
- `backups/` contiene datos sensibles; está excluido del control de versiones (`.gitignore`).
- Probar restore después de cambios de esquema/migraciones importantes.
- Considerar cifrado del medio externo si contiene datos personales/operativos.
