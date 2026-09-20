# UI-G2-T05 — Capture técnico, iteración 2

## Resultado

**PASS técnico.** Se capturó el shell final de `/equipos/halcones` para `PLAYER` y `TEAM_ADMIN` a `1440 × 900`, con autenticación y fixture reales. No hubo errores de consola, respuestas HTTP de error, fallos de red no cancelados ni overflow horizontal.

El contenido de `#team-main-content` permanece en el encuadre, pero está fuera de la evaluación visual de este gate. Este informe no realiza crítica ni aprobación visual.

## Artefactos de iteración 2

| Archivo | Rol | Identidad | Tamaño | SHA-256 |
| --- | --- | --- | --- | --- |
| `player-shell-iteration-2-1440x900.png` | `PLAYER` | Ana Fernández · Jugador | 1440 × 900 | `649809EE90FB5DEAE98051B38C4A7060D6B2FC3FCB7DF729D31B89898339147B` |
| `team-admin-shell-iteration-2-1440x900.png` | `TEAM_ADMIN` | Diego Ruiz · Administrador | 1440 × 900 | `B68F89EE8BBDC8708E86892B0AEFA664D5F1C3FDEBC1C7F8C939D0994B82B4B0` |
| `runtime-capture-iteration-2.json` | Ambos | Autenticación, red, consola, geometría y orden de navegación | — | — |

No se sobrescribió evidencia de las iteraciones 0 o 1.

## Entorno reproducible

- Host: CT112 (`devbox`), sin modificar `/srv/projects/webLogrosApp`.
- Preflight: `.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build` → PASS.
- Memoria disponible: 7460 MiB de 8192 MiB; swap al 90 % produjo únicamente el warning previsto.
- La base principal `weblogros_db` permaneció detenida.
- Copia temporal exacta del código del worktree: `/tmp/weblogros-ui-g2-t05-i2.6b8doJ/repo`.
- El archivo de transporte excluyó `.env` y se comprobó antes de enviarlo; también se retiraron las configuraciones heredadas de la copia temporal. Todas las variables usadas fueron explícitas y efímeras.
- PostgreSQL temporal: `weblogros_ui_g2_t05_i2_20260920`, enlazada solo a `127.0.0.1:55435`.
- Prisma Client generado, 13 migraciones aplicadas desde cero y seed determinista completado.
- Seed: 2 equipos, 19 logros, 13 usuarios, 42 asignaciones, 8 solicitudes, 6 invitaciones y 6 propuestas.
- Backend TypeScript: build PASS; una instancia en el puerto 3001.
- Frontend Next.js: build PASS; una instancia en `127.0.0.1:3000`.
- Captura: una única instancia Chrome a la vez, CDP en `127.0.0.1:9225`, viewport `1440 × 900`, DPR 1, `es-ES`, zona `Europe/Madrid`, movimiento reducido y caché desactivada.

## Matriz técnica del shell

| Criterio | PLAYER | TEAM_ADMIN |
| --- | --- | --- |
| Login API | 200 | 200 |
| Navegación principal | Dashboard → Logros → Ranking → Jugadores → Solicitudes | Dashboard → Logros → Ranking → Jugadores → Solicitudes |
| Hijos directos del contenedor lateral | Navegación → utilidades | Navegación → Administración → utilidades |
| Bloque/hueco administrativo | ausente; no existe nodo ni placeholder | bloque presente |
| Posición de Administración | no aplica | inmediatamente después de navegación principal y antes de utilidades |
| Separación Solicitudes → Administración | no aplica | 33 px |
| Administración activa en dashboard | no aplica | no; `aria-current` ausente |
| Sidebar | 172 px | 172 px |
| Cabecera tenant | 129 px | 129 px |
| `Halcones` en cabecera e identidad compacta | completo, sin clipping | completo, sin clipping |
| Scroll inicial | 0 | 0 |
| Overflow horizontal | no | no |
| Errores de consola | 0 | 0 |
| Respuestas HTTP >= 400 | 0 | 0 |
| Fallos de red no cancelados | 0 | 0 |

PLAYER tiene exactamente dos hijos estructurales en el contenedor lateral: la navegación común y el bloque inferior de utilidades. TEAM_ADMIN tiene tres y su orden DOM coincide con el orden visual exigido.

Chrome registró en el login una recomendación informativa sobre `autocomplete=current-password`; no fue un error. Las cancelaciones RSC registradas tienen `canceled: true` y corresponden a precargas canceladas por navegación.

## Integridad de captura

Cada rol se abrió como primera página de una sesión Chrome limpia, manteniendo una sola instancia a la vez. La primera imagen TEAM_ADMIN fue descartada por un fallo de composición de Chrome aunque el DOM estuviera completo. La recaptura final utilizó la superficie nativa, fue inspeccionada y muestra todo el shell. La telemetría consolidada corresponde a las capturas finales.

No se guardaron contraseñas, JWT ni secretos en los artefactos.

## Limpieza final

- Chrome, frontend y backend iniciados para esta validación: detenidos.
- Contenedor `weblogros_ui_g2_t05_i2_20260920`: eliminado.
- Copia temporal `/tmp/weblogros-ui-g2-t05-i2.6b8doJ`: eliminada.
- Puertos `3000`, `3001`, `55435` y `9225`: libres al finalizar.
- `weblogros_db`: continúa detenida.
- Checkout principal `/srv/projects/webLogrosApp`: limpio.

