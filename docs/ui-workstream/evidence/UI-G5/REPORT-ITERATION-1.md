# UI-G5 — Capture/QA iteración 1

Fecha: 2026-09-20  
Ruta: `/equipos/halcones/ranking`  
Build: corrección local de `TeamRankingView.tsx` posterior a la crítica de iteración 0  
Resultado QA: **desktop PASS; móvil ITERATE por overflow global de 6 px**

Este documento no aprueba el gate visual. Entrega captura y métricas reproducibles al crítico independiente.

## Entorno supervisado

- Preflight `local build`: PASS.
- Memoria disponible: 7202 MiB de 8192 MiB.
- Swap: 89% utilizada, 54 MiB libres; warning no bloqueante.
- Frontend anterior PID `689502`, sesión `9810`: cwd y comando verificados antes de detenerlo.
- Único archivo transferido: `apps/frontend/src/app/components/ranking/TeamRankingView.tsx`.
- Hash local/remoto: `e7cadfd7b784b7d08ad9cadebfafd68f5e06235c3b6d5f18feede6142d1c1163`.
- Build Next.js 16.2.0: PASS.
- Frontend capturado: PID `704952`, sesión `91413`, `0.0.0.0:3000`.
- Backend PID `620960`, sesión `88569`: conservado, health 200.
- PostgreSQL `weblogros_ui_review_g3`: conservado y healthy.
- No se ejecutó seed, POST, migración ni mutación de datos.
- `weblogros_db` principal permaneció detenido.

## Artefactos

| Archivo | Rol | Viewport |
| --- | --- | --- |
| `ranking-player-iteration-1-1440x1024.png` | Ana / PLAYER | 1440×1024 |
| `ranking-player-fullpage-iteration-1-1440.png` | Ana / PLAYER | full page, 1440 px |
| `ranking-admin-iteration-1-1440x1024.png` | Diego / TEAM_ADMIN | 1440×1024 |
| `ranking-player-iteration-1-390x844.png` | Ana / PLAYER | 390×844 |
| `runtime-ranking-iteration-1.json` | telemetría | desktop, móvil, 768 y 1024 |

Los artefactos de iteración 0 no se sobrescribieron.

## Red, consola y fixture

- Una única GET de pantalla a `/api/equipos/halcones/ranking` por cada captura; status 200.
- Una GET a `/contexto` por captura; status 200.
- Cero errores de consola y cero excepciones JS.
- Los `net::ERR_ABORTED` con `canceled: true` de la telemetría proceden de navegación deliberada del harness; las dos lecturas API terminaron en 200.
- Datos visibles preservados: 12 miembros, 14 logros, 40 otorgamientos, 4280 puntos, 7 distintos, 10 participantes, media 3,3 y participación 83%.
- Tabla: 12 filas de 48 px, dos filas `0/0`, empate María/Carmen en posiciones 5/6 y nombre largo de Álex accesible.

## Métricas desktop — PASS

- Shell: sidebar 172 px; cabecera tenant 129 px.
- Grid: `61,0% / 39,0%`.
- Banda superior: `268,25 px`, dentro del objetivo aproximado `240–270 px`.
- Podio: DOM `1–2–3`, visual `2–1–3`.
- Cards: ganador `210 px`, segundo/tercero `180 px`; ratio `16,7%`, dentro del objetivo `15–20%`.
- Tabla desktop: `733/733 px`; sin scroll horizontal interno y sin overflow global.
- Todos los paneles principales: `scrollWidth === clientWidth` y `scrollHeight === clientHeight`.
- Strip inferior: cuatro items `169×85 px`, sin descendientes fuera del rectángulo.
- Títulos del strip: `32 px` de alto, `line-height: 16 px`, `line-clamp: 2`; dos líneas disponibles sin clipping.
- Fechas del strip: `scrollWidth === clientWidth`.
- Seis celdas estadísticas: sin overflow interno ni descendientes fuera de límites.
- PLAYER y TEAM_ADMIN comparten idéntica geometría.
- Smoke 768: sin overflow global; tabla con scroll interno esperado.
- Smoke 1024: sin overflow global; tabla sin scroll interno.

## Hallazgo móvil — ITERATE

En `390×844`:

- `documentElement.clientWidth = 390 px`;
- `documentElement.scrollWidth = 396 px`;
- overflow global horizontal: **6 px**;
- el grid nominal ocupa `x=16`, ancho `358 px`, borde derecho `374 px`;
- sus paneles directos miden `380,22 px` y terminan en `x=396,22`;
- podio, stats, tabla y strip comparten la expansión a `378 px` de ancho interno;
- la tabla conserva correctamente su scroll interno `378/704 px`, pero eso no evita el overflow del documento.

La captura móvil evidencia el recorte del borde derecho. No se corrigió código durante QA.

El resto del móvil se mantiene funcional:

- podio visual/DOM `1–2–3`;
- 12 filas y datos completos;
- strip con cuatro tarjetas y títulos de dos líneas;
- fechas y stats sin clipping interno.

## Estados deliberadamente no repetidos

Loading, error/retry, empty y podios de 1–2 miembros ya pasaron en la iteración 0 y el cambio fue exclusivamente geométrico. No se repitió la matriz completa para no retrasar la crítica.

- El copy de un miembro se comprobó de forma dirigida en código: la cabecera usa `1 miembro` y ya no concatena `ordenados por puntos y logros`.
- 401, 403 y 404 no se interceptaron en runtime.

## Limpieza y entrega

- Chrome PID `706662`: identidad/profile verificados y cerrado; `9228` quedó libre.
- Frontend `704952`, backend `620960` y PostgreSQL temporal permanecen vivos; frontend y health backend responden 200.
- No se modificaron `STATUS.md`, `TASKS.md`, `PLAN.md` ni código de producto durante QA.
