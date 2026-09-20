# UI-G2-T05 — Capture técnico, iteración 1

## Resultado

**PASS técnico.** Se capturó el shell actualizado de `/equipos/halcones` para `PLAYER` y `TEAM_ADMIN` a `1440 × 900`, con autenticación real contra el fixture determinista. No hubo errores de consola, respuestas HTTP de error, fallos de red no cancelados ni overflow horizontal.

El contenido de `#team-main-content` se conserva en el encuadre, pero queda fuera de la evaluación visual de este gate. Este informe no realiza crítica ni aprobación visual.

## Artefactos de iteración 1

| Archivo | Rol | Identidad | Tamaño | SHA-256 |
| --- | --- | --- | --- | --- |
| `player-shell-iteration-1-1440x900.png` | `PLAYER` | Ana Fernández · Jugador | 1440 × 900 | `649809EE90FB5DEAE98051B38C4A7060D6B2FC3FCB7DF729D31B89898339147B` |
| `team-admin-shell-iteration-1-1440x900.png` | `TEAM_ADMIN` | Diego Ruiz · Administrador | 1440 × 900 | `32A4A1BA67884A3354B6CE72BEFD41B67721F9FC53C987ADAACD2143B5965053` |
| `runtime-capture-iteration-1.json` | Ambos | Autenticación, red, consola y geometría | — | — |

No se sobrescribió ningún artefacto de la iteración 0.

Ruta capturada en el entorno aislado: `http://127.0.0.1:3000/equipos/halcones`.

## Entorno reproducible

- Host: CT112 (`devbox`), sin modificar `/srv/projects/webLogrosApp`.
- Preflight: `.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build` → PASS.
- Memoria disponible: 7463 MiB de 8192 MiB; swap al 90 % produjo únicamente el warning previsto por la skill.
- La base principal `weblogros_db` permaneció detenida durante toda la validación.
- Copia temporal exacta del worktree: `/tmp/weblogros-ui-g2-t05-i1.OnEKvp/repo`.
- PostgreSQL temporal: `weblogros_ui_g2_t05_i1_20260920`, enlazada solo a `127.0.0.1:55434`.
- Prisma Client generado y 13 migraciones aplicadas desde cero.
- Seed determinista: 2 equipos, 19 logros, 13 usuarios, 42 asignaciones, 8 solicitudes, 6 invitaciones y 6 propuestas.
- Backend: compilación TypeScript PASS; una instancia en el puerto 3001.
- Frontend: `next build` PASS; una instancia en `127.0.0.1:3000`.
- Navegador: una sola instancia de Chrome headless a la vez, controlada por CDP en `127.0.0.1:9224`.
- Emulación: viewport `1440 × 900`, DPR 1, `es-ES`, zona `Europe/Madrid`, movimiento reducido y caché desactivada.

La primera invocación del seed usó el nombre de variable incorrecto y terminó antes de sembrar datos. Se corrigió solo la configuración temporal a `SEED_USER_PASSWORD`; el seed y el build posteriores fueron PASS. No se modificó código de producto.

## Comprobaciones del shell

| Criterio | PLAYER | TEAM_ADMIN |
| --- | --- | --- |
| Login API | 200 | 200 |
| Identidad | Ana Fernández / Jugador | Diego Ruiz / Administrador |
| Navegación común | Dashboard, Logros, Ranking, Jugadores, Solicitudes | Dashboard, Logros, Ranking, Jugadores, Solicitudes |
| Administración | ausente | presente |
| Sidebar | 172 px | 172 px |
| Cabecera tenant | 129 px | 129 px |
| Lockup dentro de su zona | sí | sí |
| Divisor inferior de marca | 1 px | 1 px |
| `Halcones` en cabecera | completo, sin clipping | completo, sin clipping |
| `Halcones` en identidad compacta | completo, sin clipping | completo, sin clipping |
| Scroll inicial | 0 | 0 |
| Overflow horizontal | no | no |
| Errores de consola | 0 | 0 |
| Respuestas HTTP >= 400 | 0 | 0 |
| Fallos de red no cancelados | 0 | 0 |

Chrome registró una recomendación informativa sobre `autocomplete=current-password` en el login; no fue un error. Las cancelaciones RSC consignadas en la telemetría tienen `canceled: true` y corresponden a precargas canceladas por navegación.

## Integridad de la captura

La primera imagen TEAM_ADMIN de esta ejecución fue descartada porque Chrome no pintó varias capas pese a que el DOM y las métricas estaban completos. Se cerró esa instancia y se recapturó TEAM_ADMIN como primera página de una sesión limpia, manteniendo una sola instancia de navegador a la vez. El PNG final fue inspeccionado y muestra el shell completo; `runtime-capture-iteration-1.json` incorpora la telemetría de esa recaptura.

No se guardaron contraseñas, JWT ni secretos en los artefactos.

## Limpieza final

- Chrome, frontend y backend iniciados por esta validación: detenidos.
- Contenedor `weblogros_ui_g2_t05_i1_20260920`: eliminado.
- Copia temporal `/tmp/weblogros-ui-g2-t05-i1.OnEKvp`: eliminada.
- Puertos `3000`, `3001`, `55434` y `9224`: libres al finalizar.
- `weblogros_db`: continúa detenida.
- Checkout principal `/srv/projects/webLogrosApp`: limpio.

