# UI-G3-T03 — Captura técnica del dashboard

## Resultado

**PASS técnico.** El dashboard de `/equipos/halcones` se capturó con fixture real y reloj de navegador determinista. La vista canónica PLAYER, el smoke TEAM_ADMIN y el smoke móvil cargaron sus seis paneles sin overflow global, errores de consola, respuestas HTTP de error ni fallos de red no cancelados.

Este informe no realiza crítica ni aprobación visual. Su función es entregar evidencia reproducible a `visual_critic`.

## Artefactos

| Archivo | Escenario | Tamaño | SHA-256 |
| --- | --- | --- | --- |
| `dashboard-player-1440x1024.png` | Ana Fernández · PLAYER · canónico | 1440 × 1024 | `B79C3B242842D81210CB4BC353F267D52F3D61B1EB65E835E7A594943783BDC2` |
| `dashboard-team-admin-1440x1024.png` | Diego Ruiz · TEAM_ADMIN · smoke | 1440 × 1024 | `99936BE73BDAD757577E1E5A4E63AE15229C11278F803E10D7871B096C23845B` |
| `dashboard-player-mobile-390x844.png` | Ana Fernández · PLAYER · smoke móvil | 390 × 844 | `C8DF5E0DC2E8AFEE2216BA742A8B6ED306C3D31308EB1C7B958008EE99109E55` |
| `runtime-capture.json` | Telemetría, payload público y aserciones de las tres vistas | — | — |

Ruta capturada: `http://127.0.0.1:3000/equipos/halcones`.

## Entorno reproducible

- Host: CT112 (`devbox`), sin modificar `/srv/projects/webLogrosApp`.
- Preflight: `.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build` → PASS.
- Memoria disponible: 7456 MiB de 8192 MiB; swap al 89 % generó únicamente el warning previsto.
- La base principal `weblogros_db` permaneció detenida.
- Copia temporal exacta: `/tmp/weblogros-ui-g3-t03.QMRQMQ/repo`.
- El transporte excluyó `.env` y se verificó antes de enviarlo; también se retiraron configuraciones heredadas de la copia temporal.
- PostgreSQL temporal: `weblogros_ui_g3_t03_20260920`, enlazada solo a `127.0.0.1:55436`.
- Prisma Client generado, 13 migraciones aplicadas desde cero y seed determinista completado.
- Seed: 2 equipos, 19 logros, 13 usuarios, 42 asignaciones, 8 solicitudes, 6 invitaciones y 6 propuestas.
- Backend TypeScript: build PASS; una única instancia activa a la vez en el puerto 3001.
- Frontend Next.js: build PASS; una única instancia en `127.0.0.1:3000`.
- Chrome headless: una única instancia activa a la vez, CDP en `127.0.0.1:9226`.
- Locale/timezone: `es-ES` / `Europe/Madrid`.
- Reloj inyectado antes de cargar la aplicación: `2026-09-20T12:00:00.000Z`; `Date.now()` y `new Date()` confirmados desde cada target.

El backend temporal se reinició de forma supervisada, después de detener el PID exacto, para limpiar el limitador de login en memoria tras las pasadas de instrumentación. Nunca coexistieron dos instancias.

## Datos del fixture

El payload real de `/api/equipos/halcones/dashboard` y su representación visible confirmaron:

| Dato | Valor |
| --- | --- |
| Miembros | 12 |
| Catálogo | 14 |
| Concesiones | 40 |
| Puntos acumulados | 4280 |
| Logros distintos conseguidos | 7 |
| Participantes | 10 |
| Participación | 83 % |
| Ana | 790 puntos · 7 logros · posición 1 |
| Top 3 | Ana Fernández 790/7; Marcos del Río 700/6; Laura Sánchez 550/5 |
| Más conseguido | Primer vuelo · 10 miembros |
| Más raro | Racha impecable · 2 miembros |
| Últimos añadidos | Guía para el siguiente vuelo; Organización compartida; Una victoria compartida |
| Actividad reciente | incluye Álex Moreno de la Fuente y Carlos Torres |

No se hardcodearon estos datos en la captura: las aserciones se hicieron contra la respuesta autenticada y contra el texto renderizado.

## Layout, responsive y shell

| Comprobación | PLAYER desktop | TEAM_ADMIN desktop | PLAYER móvil |
| --- | --- | --- | --- |
| Viewport | 1440 × 1024 | 1440 × 1024 | 390 × 844 |
| Sidebar / cabecera | 172 / 129 px | 172 / 129 px | navegación móvil / cabecera 129 px |
| Banda superior | 3 columnas, una fila | 3 columnas, una fila | 1 columna |
| Banda inferior | 3 columnas, una fila | 3 columnas, una fila | 1 columna |
| Orden de lectura | correcto | correcto | seis paneles apilados |
| `scrollWidth` / viewport | 1440 / 1440 | 1440 / 1440 | 390 / 390 |
| Overflow horizontal | no | no | no |
| Administración | ausente | presente en shell | ausente |

Geometría desktop:

- banda superior: `y 153.47`, alto `427.39`;
- banda inferior: `y 595.25`, alto `317.48`;
- altura total del documento: 1024 px.

La vista móvil tiene altura natural de 2986 px y conserva una sola columna sin overflow horizontal.

## Red, consola y alcance

- `/api/equipos/halcones/contexto`: 200.
- `/api/equipos/halcones/dashboard`: 200; una petición de pantalla y una petición adicional de validación por escenario.
- `/api/equipos/halcones/logros`: 0 peticiones.
- Errores de consola: 0.
- Respuestas HTTP `>= 400`: 0.
- Fallos de red no cancelados: 0.
- El dashboard no contiene imágenes reales: `img` dentro de `#team-main-content` = 0.
- No aparecen enlaces a Comunidad ni conceptos de temporada, reto, progreso, nivel, secreto, ajustes o creación directa.
- Chrome emitió una recomendación informativa sobre `autocomplete=current-password` en login; no es error.
- Las cancelaciones RSC registradas tienen `canceled: true` y corresponden a precargas canceladas por navegación.

## Integridad de captura

La captura inicial TEAM_ADMIN fue descartada porque Chrome no compuso varias capas pese a que DOM, datos y geometría eran correctos. Se recapturó como primera vista de una sesión Chrome limpia; el PNG final fue inspeccionado y la telemetría consolidada incorpora esa pasada. Solo hubo una instancia Chrome activa a la vez.

No se guardaron contraseñas, JWT ni secretos en los artefactos.

## Limpieza final

- Chrome, frontend y backend iniciados para esta validación: detenidos.
- Contenedor `weblogros_ui_g3_t03_20260920`: eliminado.
- Copia temporal `/tmp/weblogros-ui-g3-t03.QMRQMQ`: eliminada.
- Puertos `3000`, `3001`, `55436` y `9226`: libres al finalizar.
- `weblogros_db`: continúa detenida.
- Checkout principal `/srv/projects/webLogrosApp`: limpio.

