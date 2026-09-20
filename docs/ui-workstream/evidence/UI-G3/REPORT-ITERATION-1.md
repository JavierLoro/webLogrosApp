# UI-G3-T05 — Captura técnica, iteración 1

## Resultado

**PASS de build, datos, captura, red y responsive; FAIL del criterio estricto de overflow interno en un panel.** La vista PLAYER canónica, el smoke TEAM_ADMIN y el smoke móvil se capturaron con fixture real y reloj fijo. Las bandas desktop miden exactamente 328 px y 296 px, no existe overflow horizontal global y no se registraron errores de consola, HTTP ni red.

El panel desktop **Participación del equipo** conserva un rango de scroll interno vertical de 14 px (`scrollHeight 340` frente a `clientHeight 326`) en PLAYER y TEAM_ADMIN. Ningún descendiente medido rebasa el `bounding rect` del panel y el PNG no muestra contenido cortado, pero la comprobación estricta `scrollHeight > clientHeight` falla. Los otros cinco paneles desktop y los seis paneles móviles no presentan overflow interno.

Este informe entrega evidencia técnica; no critica ni aprueba el diseño.

## Artefactos

| Archivo | Escenario | Viewport | SHA-256 |
| --- | --- | --- | --- |
| `dashboard-player-iteration-1-1440x1024.png` | Ana Fernández · PLAYER · canónico | 1440 × 1024 | `5376c663b757db9f091209c6dd925dab47e44b99111f5443c387428d80e1a20a` |
| `dashboard-team-admin-iteration-1-1440x1024.png` | Diego Ruiz · TEAM_ADMIN · smoke | 1440 × 1024 | `30591a429b31ab84b5686a2ee8b481ff2b0e36d314918ea2411b508ec14d73ef` |
| `dashboard-player-mobile-iteration-1-390x844.png` | Ana Fernández · PLAYER · smoke móvil | 390 × 844 | `da4d71b1703c3dcd8799f03d662fcdb0eadf1482b58fd17ea57555eb1b828489` |
| `runtime-capture-iteration-1.json` | Payload, red, consola, geometría y overflow | — | — |

Ruta: `http://127.0.0.1:3000/equipos/halcones`. Reloj del navegador: `2026-09-20T12:00:00.000Z`; locale/timezone: `es-ES` / `Europe/Madrid`.

## Entorno reproducible

- Host: CT112 (`devbox`), modo local estable.
- Preflight inicial `local build`: PASS; 7439 MiB disponibles de 8192 MiB; swap al 89 % con 52 MiB libres, warning no bloqueante.
- Preflight repetido tras corregir el montaje temporal de dependencias: PASS; 7399 MiB disponibles; swap al 89 %.
- Checkout principal `/srv/projects/webLogrosApp`: no modificado y limpio.
- Base principal `weblogros_db`: detenida durante toda la validación.
- Copia temporal exacta del worktree: `/tmp/weblogros-ui-review-g3/repo`; transporte sin `.env`.
- PostgreSQL aislado: `weblogros_ui_review_g3`, enlazado solo a `127.0.0.1:55437`.
- 13 migraciones aplicadas desde cero.
- Seed: 2 equipos, 19 logros, 13 usuarios, 42 asignaciones, 8 solicitudes, 6 invitaciones y 6 propuestas.
- Backend TypeScript: build PASS.
- Frontend Next.js: build PASS.
- El primer intento de frontend build se rechazó porque Turbopack no admite un `node_modules` enlazado fuera del root temporal. Se sustituyó únicamente ese montaje de QA por una copia física, se repitió el preflight y ambos builds pasaron. No fue un defecto del producto.
- El script `seed:dev` requiere `.env.seed.local`, excluido deliberadamente del transporte seguro; el seed se ejecutó mediante `prisma db seed` con variables de prueba explícitas, sin persistir ni imprimir secretos.

## Datos y roles

La respuesta real de `/api/equipos/halcones/dashboard` fue 200 y confirmó:

- 12 miembros, 14 logros, 40 concesiones, 4280 puntos, 7 logros distintos y 10 participantes;
- participación 83 %;
- Ana: 790 puntos, 7 logros, posición 1;
- Top 3: Ana Fernández 790/7, Marcos del Río 700/6 y Laura Sánchez 550/5;
- destacados: Primer vuelo (10) y Racha impecable (2);
- actividad visible de Álex Moreno de la Fuente y Carlos Torres.

Login/rol Halcones: Ana `PLAYER`; Diego `TEAM_ADMIN`. La pantalla PLAYER no muestra Administración y la TEAM_ADMIN sí.

La bandera automática `visibleFixture.totals` quedó en `false` porque la aserción esperaba literalmente `4.280`. La captura inspeccionada muestra `4280`, que es la salida correcta de `Intl.NumberFormat("es-ES")` para una cifra de cuatro dígitos. El payload y los cuatro totales visibles son correctos; la telemetría original se conserva sin reescribir.

## Geometría y overflow

Desktop PLAYER y TEAM_ADMIN:

- banda superior: 328 px, columnas `452.297 / 392.797 / 345.188`;
- banda inferior: 296 px, columnas `452.297 / 321.375 / 416.609`;
- títulos de los seis paneles: una línea;
- Actividad reciente: cinco filas de 48 px;
- Top 3: tres filas de 64 px, completamente dentro de su panel;
- Últimos logros: tres tarjetas de 206.234 px de alto;
- medidor segmentado: 20 segmentos;
- overflow horizontal global: no.

| Panel desktop | clientHeight | scrollHeight | Overflow X | Overflow Y | Descendientes fuera del panel |
| --- | ---: | ---: | --- | --- | ---: |
| Participación del equipo | 326 | 340 | no | **sí, 14 px** | 0 |
| Estadísticas del equipo | 326 | 326 | no | no | 0 |
| Actividad reciente | 326 | 326 | no | no | 0 |
| Últimos logros añadidos | 294 | 294 | no | no | 0 |
| Tu resumen | 294 | 294 | no | no | 0 |
| Top 3 jugadores | 294 | 294 | no | no | 0 |

Móvil PLAYER 390 × 844: reflow de una columna, `scrollWidth === clientWidth`, sin overflow global ni interno en ninguno de los seis paneles.

## Consola, red y estados

- Errores de consola/excepciones: 0.
- Respuestas HTTP `>= 400`: 0.
- Fallos de red no cancelados: 0.
- `/api/equipos/halcones/dashboard`: 200.
- Estado poblado: probado en runtime para los tres escenarios.
- Loading, error, empty, 401, 403 y 404: existen en el código revisado, pero **no se probaron en runtime en esta iteración**.

## Sesión de revisión entregada

Chrome de captura se cerró y el puerto 9226 quedó libre. La versión capturada permanece accesible para revisión en `http://100.65.11.85:3000/login`:

- PLAYER: `ana@halcones.test`;
- TEAM_ADMIN: `diego@halcones.test`;
- contraseña de revisión: `LockerBoard2026!`.

Handles al entregar:

- frontend PID `621216`, sesión supervisada `89626`, `0.0.0.0:3000`;
- backend PID `620960`, sesión supervisada `88569`, `*:3001`;
- PostgreSQL `weblogros_ui_review_g3`, `127.0.0.1:55437`;
- directorio temporal `/tmp/weblogros-ui-review-g3`.

