# Glosario — GymSoft

- **Gimnasio (Gym, tenant):** organización/cliente en el sistema. Identificado por `gym_id`; base del modelo multi-gimnasio.
- **Socio (Member):** persona registrada con documento (DNI/cédula) usado como credencial de acceso en el MVP.
- **Usuario staff (User):** personal que opera el panel (`ADMIN`, `RECEPCION`).
- **Plan:** plantilla configurable de suscripción (vigencia, precio, política de acceso). Puede ser promo.
- **Vigencia:** período de validez del plan: **diario** (1 día), **semanal** (7 días corridos), **mensual** (30 días corridos).
- **Política de acceso:** regla de uso: `ILIMITADO`, `PASES_TOTALES`, `FRECUENCIA_SEMANAL` (N veces por semana lun-dom).
- **Semana calendario:** lunes 00:00:00 a domingo 23:59:59 (hora local del gimnasio); el cupo semanal se reinicia cada lunes.
- **Suscripción (Subscription):** contratación de un plan por un socio; guarda **snapshot** de reglas/precio, fechas y estado (`PENDIENTE_PAGO`, `ACTIVA`, `VENCIDA`, `SUSPENDIDA`, `CANCELADA`).
- **Pago (Payment):** registro de cobro: `EFECTIVO` (confirmado al instante) o `TRANSFERENCIA` (pendiente hasta confirmar). Estados: `PENDIENTE`, `CONFIRMADO`, `RECHAZADO`, `ANULADO`.
- **Evento de acceso (AccessEvent):** registro de intento de ingreso (DNI, resultado `PERMITIDO`/`DENEGADO`, motivo, fecha/hora, punto de acceso).
- **Motor de autorización:** lógica que determina permitir/denegar según socio, suscripción vigente y consumo; auditable.
- **Kiosco:** interfaz de ingreso en el punto de acceso donde se tipea el DNI y se muestra el resultado.
- **Torniquete (paquete propio):** conjunto sistema + controlador/relé + mecanismo físico de paso; abre solo ante decisión `PERMITIR`.
- **Movimiento de caja (CashMovement):** ingreso o egreso operativo; ingresos se generan al confirmar pagos.
- **Sesión/arqueo de caja (CashSession):** control de efectivo por apertura/cierre con esperado/contado/diferencia.
- **Sin días de gracia:** política donde el vencimiento o agotamiento de cupo implica denegación inmediata.
- **Snapshot de plan:** copia de las condiciones del plan al crear la suscripción para preservar el contrato ante cambios futuros del plan.
- **Multi-gimnasio (multi-tenant lógico):** diseño con `gym_id` para aislar datos y permitir múltiples gimnasios en la misma plataforma a futuro.
