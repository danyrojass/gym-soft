# Iteración 0 — Reglas de negocio cerradas (propuestas base)

> Estado: **propuesto para validación operativa**. Estas reglas cierran las ambigüedades del plan para permitir la implementación de Iteraciones 0/1. Deben confirmarse/ajustarse antes de dar por cerrada la Iteración 0.

## 1. Identidad y acceso
- **Credencial de acceso:** DNI/cédula tipeado en kiosco (un solo punto de acceso).
- **Normalización de documento:** se almacena y compara en formato normalizado (trim, mayúsculas donde aplique, sin puntos/espacios/guiones). La UI puede mostrar el formato original si se decide, pero la búsqueda/validación usa el valor normalizado.
- **Unicidad:** `documento_numero` es único por `gym_id`.
- **Limitación aceptada (MVP):** el DNI identifica la suscripción pero **no prueba identidad** (riesgo de suplantación). Mitigación futura: credencial física (tarjeta/QR/huella) reutilizando el mismo motor.

## 2. Vigencia de suscripciones
- **Tipos y duración:**
  - `DIARIO`: 1 día.
  - `SEMANAL`: 7 días corridos.
  - `MENSUAL`: 30 días corridos.
- **Inicio de vigencia (propuesto):** la suscripción inicia al **confirmar el pago** que la activa/renueva (momento de activación), salvo que en Iteración 1 se habilite explícitamente una fecha de inicio manual para casos operativos. Recomendación operativa: usar inicio al confirmar pago para evitar accesos sin cobro confirmado.
- **Fin de vigencia (propuesto):** vigencia **inclusiva hasta las 23:59:59** (hora local del gimnasio) del día de fin calculado.
  - Ejemplo mensual: inicio 2026-01-10 18:30 → fin 2026-02-08 23:59:59 (30 días corridos, inclusive fin de día).
  - Ejemplo semanal: inicio 2026-01-10 → fin 2026-01-16 23:59:59.
  - Ejemplo diario: inicio 2026-01-10 → fin 2026-01-10 23:59:59.
- **Zona horaria:** única por gimnasio, configurada en `Gym.config.timezone` (valor inicial sugerido según país del gimnasio). Todos los cálculos de vigencia, semana y reportes usan esta zona.
- **Sin días de gracia:** al superar `fecha_fin` (o agotar pases totales), el acceso se deniega de inmediato.

## 3. Planes, promos y consumo
- **Plan como plantilla:** define vigencia, precio y política de acceso. Cambios al plan no afectan suscripciones ya creadas.
- **Snapshot en suscripción:** al contratar se guarda copia de nombre, vigencia, política, límites y precio (`plan_snapshot`).
- **Políticas de acceso:**
  - `ILIMITADO`: ingresos sin límite durante la vigencia.
  - `PASES_TOTALES`: N ingresos totales en la vigencia; cada ingreso permitido descuenta 1.
  - `FRECUENCIA_SEMANAL`: máximo N ingresos por semana calendario.
- **Semana calendario (confirmado):** **lunes a domingo** (`[lunes 00:00:00, domingo 23:59:59]`, hora local del gimnasio). El cupo se reinicia cada lunes 00:00.
- **Semana parcial (propuesto):** si la vigencia cubre parcialmente una semana (al inicio o al fin), esa semana mantiene su cupo semanal completo (`N`) pero **solo** pueden usarse ingresos en días que estén dentro de la vigencia de la suscripción.
- **Promo ejemplo:** "3 veces por semana por 1 mes" = `tipo_vigencia=MENSUAL` (30 días), `politica_acceso=FRECUENCIA_SEMANAL`, `frecuencia_semanal_max=3`.
- **Conteo recomendado:** auditable desde `AccessEvent` con `resultado=PERMITIDO`; `pases_restantes` puede mantenerse como contador derivado para planes por pases totales.

## 4. Estados de suscripción
- `PENDIENTE_PAGO`: creada/registrada sin pago confirmado. **No habilita acceso.**
- `ACTIVA`: vigente y con derecho de acceso sujeto a consumo.
- `VENCIDA`: fuera de vigencia o sin pases (sin gracia). **No habilita acceso.**
- `SUSPENDIDA`: bloqueo manual. **No habilita acceso.**
- `CANCELADA`: baja definitiva. **No habilita acceso.**
- **Renovación (propuesto):** al renovar se crea una **nueva suscripción** con su propio período y snapshot (historial preservado). Evitar extender en sitio salvo caso administrativo explícito; si se soporta extensión, debe quedar auditada. Solapamientos: por defecto no solapar; si existe una activa, la nueva puede programarse para iniciar al terminar la vigente (definir en Iteración 1).

## 5. Pagos
- **Métodos:** `EFECTIVO`, `TRANSFERENCIA`.
- **Efectivo:** se registra como `CONFIRMADO` al momento, genera ingreso de caja inmediato y puede activar/renovar suscripción.
- **Transferencia:** se registra como `PENDIENTE` con referencia/comprobante opcional; **no genera ingreso ni habilita acceso** hasta confirmación.
  - **Confirmar:** pasa a `CONFIRMADO`, registra `confirmado_por` y `fecha_confirmacion`, genera ingreso de caja y activa/renueva suscripción.
  - **Rechazar/Anular:** pasa a `RECHAZADO`/`ANULADO`, sin ingreso ni habilitación.
- **Trazabilidad:** no eliminar pagos confirmados. Correcciones por anulación/ajuste registrado (política detallada en Iteración 3, principio desde Iteración 1).
- **Idempotencia operativa:** controles para evitar doble confirmación del mismo pago.

## 6. Motor de autorización (acceso)
Orden de evaluación ante ingreso de DNI:
1. **Socio:** existe y `ACTIVO` en el `gym_id` → si no, `DENEGAR` (`SOCIO_NO_ENCONTRADO` / `SOCIO_INACTIVO`).
2. **Suscripción aplicable:** existe suscripción habilitable relevante → si no, `DENEGAR` (`SIN_SUSCRIPCION`, `PENDIENTE_PAGO`, `VENCIDA`, `SUSPENDIDA`, `CANCELADA`).
3. **Vigencia temporal:** ahora dentro de `[fecha_inicio, fecha_fin]` inclusivo fin de día → si no, `DENEGAR` (`VENCIDA`).
4. **Consumo:** según política (`ILIMITADO` ok; `PASES_TOTALES` con saldo; `FRECUENCIA_SEMANAL` bajo cupo lun-dom) → si excede, `DENEGAR` (`PASES_AGOTADOS` / `CUPO_SEMANAL_AGOTADO`).
5. **Permitir:** registrar `AccessEvent` `PERMITIDO`, actualizar consumo si aplica y accionar torniquete.

- **Auditoría:** todo intento registra `documento_ingresado`, resultado, motivo, fecha/hora, socio/suscripción (si aplica) y punto de acceso.

## 7. Caja e ingresos-egresos (alcance operativo)
- **Ingreso:** se genera automáticamente al **confirmar** un pago (efectivo o transferencia confirmada).
- **Egreso:** registro manual con categoría, monto, método, fecha y descripción.
- **Arqueo de efectivo:** apertura/cierre, esperado vs contado, diferencia (Iteración 3).
- **Exportación:** CSV/Excel de movimientos y resúmenes por período (Iteración 3).
- **Categorías iniciales sugeridas (parametrizables):**
  - Ingresos: `CUOTAS_PLANES`, `INSCRIPCION`, `OTROS_INGRESOS`.
  - Egresos: `ALQUILER`, `SUELDOS`, `SERVICIOS`, `INSUMOS`, `MANTENIMIENTO`, `OTROS_EGRESOS`.
- **Correcciones (propuesto):** preferir **anulación** con traza sobre edición destructiva de movimientos/pagos confirmados.

## 8. Checklist de confirmación (Iteración 0)
- [ ] Fin de vigencia inclusivo hasta 23:59:59 hora local.
- [ ] Inicio de vigencia al confirmar pago (o regla alternativa acordada).
- [ ] Semana parcial con cupo semanal completo, solo días dentro de vigencia.
- [ ] Renovación crea nueva suscripción (historial preservado).
- [ ] Transferencia pendiente no habilita acceso hasta confirmar.
- [ ] Modo fail-open/fail-secure y mecanismo/controlador definitivo.
- [ ] Catálogo inicial de categorías de ingresos/egresos.
- [ ] Política de correcciones (anulación vs edición).

> Nota: los ítems dependientes de hardware se completan con `docs/iteracion-0/hardware-torniquete.md`.
