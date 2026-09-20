# UI-G4-T04 — Capture/QA

**PASS técnico.** Frontend build correcto; DB y backend conservados. Capturas con reloj `2026-09-20T12:00:00Z`, fixture Halcones y sesiones QA efímeras.

## Evidencia

- `catalog-player-1440x1024.png` — 14 logros, CTA Proponer logro.
- `catalog-admin-1440x1024.png` — 14 logros, CTA Crear logro.
- `form-player-1440x1024.png` — datos representativos no enviados.
- `form-admin-1440x1024.png` — datos representativos no enviados.
- `catalog-player-390x844.png` y `form-player-390x844.png` — smoke móvil.
- `runtime-capture.json` — geometría, filtros, red y consola.

Catálogo desktop: grid de cinco columnas de ~234 px; móvil: una columna de 358 px. La búsqueda `Racha` redujo 14 cards a 2 y se restauró antes de capturar. Cero overflow global, errores de consola, HTTP o red. Formularios muestran campos y CTA propios de cada rol sin enviar durante la captura.

## POST controlados

- PLAYER envió únicamente `nombre`, `descripcion`, `criterios`: HTTP 201, propuesta PENDING; no creó catálogo, concesión ni solicitud.
- TEAM_ADMIN creó logro: HTTP 201; exactamente un Logro, cero UserLogro y cero SolicitudLogro.
- Registros QA identificados se eliminaron de forma puntual. Conteos antes/después idénticos: 6 propuestas, 19 logros, 42 concesiones, 8 solicitudes.
- El formulario bloquea doble submit con estado `loading`/botón disabled; la navegación posterior está definida por rol (`solicitudes` para PLAYER, `logros` para admin). No se forzó un duplicado destructivo.

Preflight PASS: 7164 MiB disponibles; swap 89 %. Runtime vivo en `http://100.65.11.85:3000/login`: frontend PID `655008`/sesión `35833`; backend PID `620960`/sesión `88569`; DB `weblogros_ui_review_g3`.
