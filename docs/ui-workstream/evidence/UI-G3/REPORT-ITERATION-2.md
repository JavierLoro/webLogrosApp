# UI-G3-T05 — Captura técnica, iteración 2

## Resultado

**PASS técnico.** La corrección puntual elimina el overflow interno del panel Participación del equipo en PLAYER y TEAM_ADMIN: `scrollHeight === clientHeight`, sin clipping ni descendientes fuera de la caja. Los otros cinco paneles permanecen intactos, las bandas desktop conservan 328/296 px y no hay overflow horizontal global.

La vista PLAYER canónica, el smoke TEAM_ADMIN y el smoke móvil se capturaron con fixture real y reloj fijo. No se registraron errores de consola, respuestas HTTP de error ni fallos de red no cancelados. Este informe no realiza crítica ni aprobación visual.

## Artefactos

| Archivo | Escenario | Viewport | SHA-256 |
| --- | --- | --- | --- |
| `dashboard-player-iteration-2-1440x1024.png` | Ana Fernández · PLAYER · canónico | 1440 × 1024 | `17da5ee7200546b85c2ae9dfe32076739f3aa3be110e92bfa5cb2ff9642e4b06` |
| `dashboard-team-admin-iteration-2-1440x1024.png` | Diego Ruiz · TEAM_ADMIN · smoke | 1440 × 1024 | `2580fd306077a9c59d7be6b026891b4a5c566f3577e65ffb9b8eec1d6507aded` |
| `dashboard-player-iteration-2-390x844.png` | Ana Fernández · PLAYER · smoke móvil | 390 × 844 | `9e87886113fef47c9cf71cb3cc0be56fc3aaf20bde636a724c90d56beb371c5c` |
| `runtime-capture-iteration-2.json` | Payload, geometría, overflow, red y consola | — | — |

Ruta: `http://127.0.0.1:3000/equipos/halcones`. Reloj: `2026-09-20T12:00:00.000Z`; locale/timezone: `es-ES` / `Europe/Madrid`.

## Refresco incremental seguro

- Preflight `local build`: PASS; 7241 MiB disponibles de 8192 MiB; swap al 89 % con 53 MiB libres.
- PostgreSQL `weblogros_ui_review_g3`, backend PID `620960` y todos los datos se conservaron sin reinicio.
- Se comparó la copia viva con el worktree y se transfirió solo `TeamDashboardPanels.tsx`.
- Hash anterior en runtime: `d7888b376f40f190f2ae68e4030b3bf976b1ec8769c2bc91cf3c155091194cfa`.
- Hash nuevo verificado: `66be47acc8aa01a7c458e1b4fbe6149dd679ea92ab7c6a916bf6646f805ad4f6`.
- Se detuvo únicamente el frontend PID `621216`, se eliminó solo su `.next`, y el build Next.js pasó.
- Nueva instancia frontend: PID `631856`, sesión supervisada `12161`, `0.0.0.0:3000`.
- Checkout y base principal de CT112 no se modificaron.

## Geometría y contención

Desktop PLAYER y TEAM_ADMIN:

- banda superior: 328 px;
- banda inferior: 296 px;
- los seis títulos ocupan una línea;
- medidor: 20 segmentos;
- Actividad reciente: cinco filas de 48 px;
- Top 3: tres filas de 64 px;
- overflow global X: 0;
- descendientes fuera de su panel: 0.

| Panel desktop | Delta X | Delta Y | Clipping |
| --- | ---: | ---: | ---: |
| Participación del equipo | 0 | **0** | 0 |
| Estadísticas del equipo | 0 | 0 | 0 |
| Actividad reciente | 0 | 0 | 0 |
| Últimos logros añadidos | 0 | 0 | 0 |
| Tu resumen | 0 | 0 | 0 |
| Top 3 jugadores | 0 | 0 | 0 |

Móvil PLAYER 390 × 844: reflow de una columna, sin overflow global ni interno. `Últimos logros añadidos` ocupa dos líneas en móvil por el ancho disponible; no desborda ni se recorta.

## Datos, roles y ejecución

- Payload dashboard: 200.
- Fixture visible: 83 %, 12/14/40/4280/7/10, Ana 790/7/#1, top 3, actividad y destacados.
- PLAYER sin Administración; TEAM_ADMIN con Administración.
- Consola/excepciones: 0.
- HTTP `>= 400`: 0.
- Fallos de red no cancelados: 0.
- Solo se probó el estado poblado. Loading, error, empty, 401, 403 y 404 no se probaron en runtime en esta iteración.

Al comenzar la captura, el limitador de login en memoria aún acumulaba las autenticaciones de la iteración anterior. Para no reiniciar el backend se usaron JWT QA efímeros, firmados solo en memoria para los IDs del fixture y nunca guardados en los artefactos. Tras expirar esa ventana, se verificaron de nuevo los logins reales: Ana respondió 200 como PLAYER y Diego 200 como TEAM_ADMIN.

## Sesión de revisión entregada

Chrome de captura se cerró; el puerto 9226 quedó libre. La app permanece viva en `http://100.65.11.85:3000/login`:

- PLAYER: `ana@halcones.test`;
- TEAM_ADMIN: `diego@halcones.test`;
- contraseña: `LockerBoard2026!`.

Handles:

- frontend PID `631856`, sesión `12161`;
- backend PID `620960`, sesión `88569`;
- PostgreSQL `weblogros_ui_review_g3`, `127.0.0.1:55437`;
- temporal `/tmp/weblogros-ui-review-g3`.

