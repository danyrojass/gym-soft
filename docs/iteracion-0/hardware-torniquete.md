# Iteración 0 — Ficha de relevamiento de hardware (torniquete propio)

> Estado: **plantilla de relevamiento / pendiente de datos de campo**. Completar con el mecanismo y controlador definitivos antes de la Iteración 2. La Iteración 0 deja cerrada la arquitectura de integración y los criterios de selección.

## 1. Objetivo del paquete "sistema + torniquete"
Ofrecer un punto único de acceso controlado por DNI/cédula donde:
- El **software (propio)** captura el DNI, valida con el motor de autorización y registra el evento.
- El **controlador (propio/integrado)** recibe la decisión y genera la señal de apertura.
- El **mecanismo físico** (barrera/trípode estándar) habilita el paso solo ante `PERMITIR`.

## 2. Arquitectura de integración propuesta

| Componente | Opción recomendada (MVP) | Alternativas | Estado |
|---|---|---|---|
| Punto de acceso | 1 (único) | N/A | Confirmado |
| Identificación | DNI/cédula tipeado (teclado numérico/pantalla) | Tarjeta/QR/huella (futuro) | Confirmado |
| Kiosco/UI | Pantalla + teclado numérico en modo kiosco (PC/mini-PC) | Tablet táctil | Pendiente selección equipo |
| Control lógico | Servicio Node.js/TypeScript (mismo proyecto/host local) | — | Definido |
| Controlador/actuador de señal | Módulo **relé USB** o **GPIO** (Raspberry Pi/mini-PC) con contacto seco | Controlador dedicado del fabricante | **Pendiente selección** |
| Mecanismo de paso | Trípode o barrera electromecánica estándar con entrada de apertura por pulso/contacto seco | Torniquete de altura completa | **Pendiente selección** |
| Interfaz de apertura | Pulso por contacto seco (relé NA/NC según mecanismo) | Señal TTL/voltaje específico | **Pendiente verificación** |

## 3. Datos a relevar del mecanismo (completar en sitio/compra)

- **Tipo de mecanismo:** [ ] trípode [ ] barrera abatible [ ] otro: ________
- **Marca/modelo:** ____________________
- **Proveedor / instalación:** ____________________
- **Tipo de entrada de apertura:** [ ] contacto seco [ ] pulso voltaje ____V [ ] otro: ________
- **Duración de pulso requerida:** ______ ms/s (parametrizable)
- **Voltaje/corriente de la bobina o entrada de control:** ____________________
- **Compatibilidad eléctrica con relé/controlador:** [ ] verificada [ ] pendiente
- **Sentido de paso / configuración de brazo:** ____________________
- **Sensores disponibles:** [ ] sensor de paso [ ] anti-retorno [ ] ninguno [ ] otro: ________
- **Comportamiento ante corte de energía:** [ ] fail-open (libera) [ ] fail-secure (bloquea) [ ] configurable
- **Modo requerido para el sitio (evacuación/normativa):** **recomendado fail-open** — decisión final: __________
- **Dimensiones/montaje y fijación:** ____________________
- **Alimentación eléctrica:** ____________________ (considerar UPS)

## 4. Datos a relevar del controlador/relé

- **Tipo:** [ ] relé USB [ ] GPIO Raspberry Pi [ ] placa controladora del mecanismo [ ] otro
- **Marca/modelo:** ____________________
- **Cantidad de canales:** ____ (mínimo 1)
- **Tipo de contacto:** [ ] NA [ ] NC [ ] conmutable
- **Aislamiento optoacoplado:** [ ] sí [ ] no [ ] N/D
- **Sistema operativo/host:** [ ] Windows (PC local) [ ] Linux [ ] Raspberry Pi OS
- **Driver/librería/forma de comando:** ____________________ (p. ej. puerto serie/USB HID, biblioteca GPIO)
- **Tiempo de conmutación/retardo anti-rebote:** ____________________

## 5. Esquema lógico de conexión

```text
[Teclado/Pantalla DNI] -> [App kiosco] -> [Motor autorización + BD local]
                                                    |
                                              PERMITIR? 
                                             /          \
                                          sí              no
                                           |               |
                                  [Adaptador relé]     (sin señal)
                                           |           UI: DENEGADO+motivo
                                     pulso N ms
                                           |
                                   [Mecanismo barrera] -> paso habilitado
                                           |
                                   UI: PERMITIDO
```

> Nota eléctrica: el relé debe dimensionarse para la carga de la entrada del mecanismo; ante duda, usar el contacto seco del relé para comandar la entrada del controlador del mecanismo (no conmutar potencia directamente sin verificación).

## 6. Configuración software prevista (Iteración 2)
Parámetros en configuración local/BD (por `gym_id`/punto):
- `access.point_id` = `principal`
- `access.pulse_ms` = duración del pulso de apertura (a calibrar)
- `access.controller_type` = `usb-relay` | `gpio` | `mock` (para pruebas)
- `access.controller_port` / `gpio_pin` según tipo
- `access.fail_mode` = `fail-open` | `fail-secure` (documental/instalación)
- `access.kiosk_enabled` = true/false

## 7. Plan de pruebas de integración (Iteración 2)
- [ ] Con mecanismo en banco/instalado: pulso abre correctamente y por el tiempo esperado.
- [ ] `DENEGAR` no genera pulso bajo ninguna condición.
- [ ] Prueba de reinicio de servicio/app: el sistema vuelve a estado seguro y operativo.
- [ ] Prueba de corte de energía: verificar comportamiento real (fail-open/fail-secure) acorde a lo definido.
- [ ] Registro de evento coincide con acción física (permitido↔apertura, denegado↔sin apertura).
- [ ] Prueba de uso continuo (flujo de varias personas) sin bloqueos de UI.

## 8. Riesgos y mitigaciones
- **Incompatibilidad eléctrica:** validar especificaciones antes de cablear; preferir contacto seco.
- **Seguridad de evacuación:** priorizar y documentar fail-open salvo justificación normativa.
- **Suplantación por DNI:** aceptada en MVP; dejar adaptador de credenciales extensible.
- **Falla de PC/controlador:** punto único de falla; mitigar con UPS, servicio reiniciable y procedimiento manual de contingencia.
- **Desgaste mecánico:** mantenimiento según fabricante (fuera del software, incluir en operación).

## 9. Pendientes para cerrar Iteración 0 (hardware)
- [ ] Seleccionar mecanismo (marca/modelo) e interfaz de apertura.
- [ ] Seleccionar controlador/relé compatible con host local.
- [ ] Confirmar modo fail-open/fail-secure y documentarlo.
- [ ] Definir esquema de montaje y responsables de instalación.
- [ ] Estimar costo del paquete "sistema + torniquete" (mecanismo, controlador, kiosco, instalación).
