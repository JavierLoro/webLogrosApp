# UI-G2-T05 — Capture técnico del shell

## Resultado

**PASS técnico.** Se capturó el shell compartido de `/equipos/halcones` para `PLAYER` y `TEAM_ADMIN` a `1440 × 900`, con autenticación real sobre el fixture determinista. No hubo errores de consola, respuestas HTTP de error, fallos de red no cancelados ni overflow horizontal.

El contenido de `#team-main-content` aparece en las capturas para conservar el encuadre completo, pero queda expresamente fuera de la evaluación visual de este gate. Este informe no emite crítica ni aprobación visual.

## Artefactos

| Archivo | Rol | Identidad | Tamaño | SHA-256 |
| --- | --- | --- | --- | --- |
| `player-shell-1440x900.png` | `PLAYER` | Ana Fernández · Jugador | 1440 × 900 | `A54DA528846BEAF47F58830DE3348100D6EBD837ACD38B5EC41671ED2536317D` |
| `team-admin-shell-1440x900.png` | `TEAM_ADMIN` | Diego Ruiz · Administrador | 1440 × 900 | `0A0A42B4287C064A14BB6289585F939FBEA8656DFB00F05EF2D0F788EEE053D8` |
| `runtime-capture.json` | Ambos | Telemetría de autenticación, red, consola y geometría | — | — |

Ruta capturada en el entorno aislado: `http://127.0.0.1:3000/equipos/halcones`.

## Entorno reproducible

- Host de pruebas: CT112 (`devbox`), sin modificar `/srv/projects/webLogrosApp`.
- Preflight propio: `.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local build` → PASS.
- Memoria disponible: 7466 MiB de 8192 MiB; swap al 90 % generó únicamente el warning previsto por la skill.
- La base principal `weblogros_db` permaneció detenida durante toda la ejecución.
- Copia temporal exacta del worktree: `/tmp/weblogros-ui-g2-t05.1W4vIx/repo`.
- PostgreSQL temporal: `weblogros_ui_g2_t05_20260920`, publicado solo en `127.0.0.1:55433`.
- Se ejecutaron las 13 migraciones desde cero y el seed determinista.
- Conteos declarados por el seed: 2 equipos, 19 logros globales, 13 usuarios, 42 asignaciones, 8 solicitudes, 6 invitaciones y 6 propuestas.
- Backend: compilación TypeScript PASS; servicio único en `127.0.0.1:3001`.
- Frontend: `next build` PASS; servicio único en `127.0.0.1:3000`.
- Navegador de captura: una instancia de Chrome headless ya disponible en CT112, controlada por CDP en `127.0.0.1:9223`.
- Emulación: viewport `1440 × 900`, DPR 1, `es-ES`, zona `Europe/Madrid`, movimiento reducido y caché desactivada.

La primera copia temporal heredó un árbol de assets antiguo del checkout principal de CT112. Antes de compilar se reemplazó ese árbol temporal por el árbol exacto del worktree. La compilación posterior fue PASS; no se modificó código de producto.

## Matriz técnica

| Criterio | PLAYER | TEAM_ADMIN |
| --- | --- | --- |
| Login API | 200 | 200 |
| Contexto Halcones | cargado | cargado |
| Identidad de sesión | Ana Fernández / Jugador | Diego Ruiz / Administrador |
| Navegación común | Dashboard, Logros, Ranking, Jugadores, Solicitudes | Dashboard, Logros, Ranking, Jugadores, Solicitudes |
| Administración | ausente | presente |
| Sidebar | x 0, y 0, ancho 172, alto 900 | x 0, y 0, ancho 172, alto 900 |
| Header | x 172, y 0, ancho 1253, alto 97 | x 172, y 0, ancho 1253, alto 97 |
| Scroll inicial | x 0, y 0 | x 0, y 0 |
| Overflow horizontal | no | no |
| Errores de consola | 0 | 0 |
| Respuestas HTTP >= 400 | 0 | 0 |
| Fallos de red no cancelados | 0 | 0 |

Chrome emitió en la página de login una recomendación informativa sobre `autocomplete=current-password`; no fue un error de consola. Las cancelaciones `net::ERR_ABORTED` registradas en `runtime-capture.json` corresponden a precargas RSC canceladas por navegación y todas tienen `canceled: true`.

## Procedimiento de captura

1. Ejecutar el preflight `local build` antes de iniciar servicios.
2. Preparar una copia temporal exacta del worktree y una PostgreSQL efímera con nombre y puerto exclusivos.
3. Ejecutar `prisma generate`, `prisma migrate deploy`, el seed determinista y las compilaciones de backend y frontend.
4. Iniciar una sola instancia de backend y frontend enlazadas a loopback.
5. Autenticar cada identidad mediante la API del frontend, navegar a `/equipos/halcones`, esperar nombre de usuario y fin del estado de carga, fijar `scrollY = 0` y capturar mediante CDP.
6. Registrar navegación, geometría, red y consola en `runtime-capture.json`.

No se guardaron contraseñas, JWT ni secretos en los artefactos.

## Limpieza final

- Chrome, frontend y backend iniciados por esta validación: detenidos.
- Contenedor `weblogros_ui_g2_t05_20260920`: eliminado.
- Copia temporal `/tmp/weblogros-ui-g2-t05.1W4vIx`: eliminada.
- Puertos `3000`, `3001`, `55433` y `9223`: libres al finalizar.
- `weblogros_db`: continúa detenida.
- Checkout principal `/srv/projects/webLogrosApp`: limpio.

