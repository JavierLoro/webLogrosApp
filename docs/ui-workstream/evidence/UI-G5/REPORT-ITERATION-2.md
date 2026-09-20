# UI-G5 — Capture/QA iteración 2

Fecha: 2026-09-20  
Ruta: `/equipos/halcones/ranking`  
Alcance: corrección del overflow móvil detectado en iteración 1  
Resultado QA: **PASS**

Este informe aporta evidencia técnica. El gate visual corresponde al crítico independiente.

## Entorno supervisado

- Preflight `local build`: PASS.
- Memoria disponible: 7214 MiB de 8192 MiB.
- Swap: 89% utilizada, 54 MiB libres; warning no bloqueante.
- Frontend anterior PID `704952`, sesión `91413`: cwd y comando verificados antes de detenerlo.
- Únicos archivos transferidos:
  - `apps/frontend/src/app/equipos/[slug]/ranking/page.tsx` — SHA-256 `bf17c1c1a61ac5a9f54259f11a56ef343085d82724c4fa9c2d39606e85100f30`;
  - `apps/frontend/src/app/components/ranking/TeamRankingView.tsx` — SHA-256 `94a2a9c916969e0f147b403e8b664dbf0d86a0cd8c0c5b3d3236253b444b9fe2`.
- Build Next.js 16.2.0: PASS.
- Frontend capturado: PID `712719`, sesión `56528`, `0.0.0.0:3000`.
- Backend PID `620960`, sesión `88569`: conservado, health 200.
- PostgreSQL `weblogros_ui_review_g3`: conservado y healthy.
- Sin seed, POST, migraciones ni mutaciones.
- La base principal `weblogros_db` permaneció detenida.

## Artefactos

| Archivo | Rol | Viewport |
| --- | --- | --- |
| `ranking-player-iteration-2-390x844.png` | Ana / PLAYER | 390×844 |
| `ranking-player-fullpage-iteration-2-390.png` | Ana / PLAYER | full page, 390 px |
| `ranking-player-iteration-2-1440x1024.png` | Ana / PLAYER | 1440×1024 |
| `ranking-player-fullpage-iteration-2-1440.png` | Ana / PLAYER | full page, 1440 px |
| `ranking-admin-iteration-2-1440x1024.png` | Diego / TEAM_ADMIN | smoke 1440×1024 |
| `runtime-ranking-iteration-2.json` | telemetría | 390, 768, 1024 y 1440 |

Las iteraciones 0 y 1 permanecen intactas.

## Validación móvil — PASS

Viewport `390×844`:

- `documentElement.clientWidth = 390 px`;
- `documentElement.scrollWidth = 390 px`;
- cero overflow global horizontal;
- grid: `x=16`, ancho `358 px`, borde derecho `374 px`;
- podio y stats: ancho externo `358 px`, borde derecho `374 px`;
- paneles: ancho interno `356 px`, `scrollWidth === clientWidth`;
- tabla: `356/704 px`, scroll horizontal exclusivamente interno;
- podio DOM/visual `1–2–3`;
- 12 filas de 48 px;
- documento completo: 2361 px de alto;
- strip: cuatro items de 330×85 px, títulos con `line-clamp: 2`, sin clipping de descendientes;
- fechas: `scrollWidth === clientWidth`;
- stats: seis celdas sin overflow interno ni descendientes fuera de límites.

La captura full-page de 390 px conserva ambos márgenes, todos los paneles y el final de la página sin recorte lateral.

## Regresión desktop — PASS

- Documento: `1440/1440 px`, sin overflow global.
- Shell: sidebar 172 px, cabecera tenant 129 px.
- Grid: `61/39`.
- Banda superior: `268,25 px`.
- Podio: DOM `1–2–3`, visual `2–1–3`.
- Cards: 210/180 px, ratio `16,7%`.
- Tabla: 12 filas × 48 px, `733/733 px`, sin scroll horizontal.
- Strip y stats conservan `scrollWidth === clientWidth` y `scrollHeight === clientHeight`.
- TEAM_ADMIN mantiene la misma geometría y ancho de documento.

Smoke responsive:

- 768: documento `768/768`; tabla con scroll interno esperado.
- 1024: documento `1024/1024`; tabla sin scroll interno.

## Red y consola

- Una única GET a `/api/equipos/halcones/ranking` por captura; status 200.
- Una única GET a `/contexto` por captura; status 200.
- Cero errores de consola y cero excepciones JS.
- Los aborts cancelados asociados a cambios de navegación del harness no afectaron ninguna lectura API.
- Fixture, posiciones, empate, ceros, totales y nombre largo permanecen correctos.

## Estados no repetidos

No se repitieron loading, error/retry, empty ni los casos de 1–2 miembros porque ya disponen de evidencia funcional en la iteración 0 y la corrección estaba limitada a la contención intrínseca del grid. Las variantes HTTP 401, 403 y 404 no cuentan todavía con prueba QA en runtime y quedan pendientes para la regresión UI-G9.

## Limpieza y entrega

- Chrome PID `713556`: identidad/profile verificados y cerrado; `9229` quedó libre.
- Frontend `712719`, backend `620960` y PostgreSQL temporal permanecen vivos; frontend y health backend responden 200.
- No se modificaron `STATUS.md`, `TASKS.md`, `PLAN.md` ni código de producto durante QA.
