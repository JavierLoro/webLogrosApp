# UI-G5 — Visual Critic · Iteración 2

## Alcance revisado

- Referencia canónica inspeccionada en resolución original:
  - `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/ranking/ranking-desktop-v1.png`
- Evidencia inmutable de iteración 2 inspeccionada en resolución original:
  - `ranking-player-iteration-2-1440x1024.png`
  - `ranking-player-fullpage-iteration-2-1440.png`
  - `ranking-admin-iteration-2-1440x1024.png`
  - `ranking-player-iteration-2-390x844.png`
  - `ranking-player-fullpage-iteration-2-390.png`
- Telemetría consultada:
  - `runtime-ranking-iteration-2.json`
- Comparación delta:
  - `VISUAL_CRITIC_ITERATION_0.md`
  - `VISUAL_CRITIC_ITERATION_1.md`

La revisión respeta las exclusiones funcionales aprobadas: evolución, rachas, progreso, temporada y fotografía real no se exigen. Los placeholders se juzgan únicamente por geometría, alineación y contraste.

## Veredicto ejecutivo

El P1 responsive de la iteración 1 está resuelto. En 390 px, el documento mide `390/390`, el grid raíz ocupa `x=16–374` y sus paneles directos coinciden exactamente con esos `358 px`; vuelven el gutter derecho y el borde exterior completo. La tabla conserva su ancho interno de `704 px` dentro de un scroller local de `356 px`, sin trasladar overflow al documento.

Desktop permanece estable: shell `172/129`, grid `61/39`, banda superior `268.25 px`, ganador `16.7 %` más alto, tabla `733/733` y doce filas de 48 px. PLAYER y TEAM_ADMIN comparten geometría, y la captura móvil full-page confirma podio, estadísticas, tabla, strip y banner sin clipping global.

Queda únicamente un detalle tipográfico P2: dos títulos largos de sección se abrevian con elipsis en móvil. El significado continúa siendo reconocible y no bloquea el gate.

**Resultado visual:** 0 P0 · 0 P1 · 1 P2 no bloqueante.

## Reevaluación del P1 anterior

### P1-01 — Overflow global móvil de 6 px: resuelto

- `documentElement.clientWidth = 390 px`.
- `documentElement.scrollWidth = 390 px`.
- Root del ranking: `x=16`, ancho `358 px`, borde derecho `x=374`.
- Podio y estadísticas: ancho `358 px`, borde derecho `x=374`.
- Paneles internos: `clientWidth === scrollWidth === 356 px`.
- En la captura de viewport reaparecen 16 px de gutter a ambos lados y el borde derecho del podio ya no queda recortado.
- La captura full-page conserva el mismo eje para estadísticas, clasificación, últimos logros y banner.
- El scroll horizontal se limita correctamente a la tabla (`356/704 px`), que es el patrón responsive aprobado.

La corrección es local al ranking y no altera shell, PageHeader, datos ni densidad desktop.

## Hallazgo residual

### P2-01 — Dos títulos de sección se truncan en móvil

**Elemento:** cabeceras de `Clasificación completa` y `Últimos logros por miembro` en `ranking-player-fullpage-iteration-2-390.png`.

**Evidencia:** la captura muestra `CLASIFICACIÓN CO…` junto al resumen `12 miembros`, y `ÚLTIMOS LOGROS POR MIEM…` en la superficie inferior.

**Valoración:** no es material. Ambos títulos conservan suficiente contexto, sus contenidos aparecen inmediatamente debajo y no existe recorte de datos ni overflow global. La elipsis mantiene la altura compacta del panel.

**Corrección opcional:** permitir dos líneas en estos títulos a menos de 400 px o mover el resumen `12 miembros` a una línea secundaria. No reducir la tipografía ni ensanchar el panel; la geometría actual ya es correcta.

## Validación por superficie

### PLAYER · 1440 × 1024

- Composición `61/39` y gutters consistentes con la referencia.
- Podio `2–1–3`, ganador dentro del rango `15–20 %` y banda superior compacta.
- Estadísticas reales legibles, sin clipping ni paneles futuros inventados.
- Tabla visible desde el primer viewport, con densidad de 48 px por fila.

### TEAM_ADMIN · 1440 × 1024

- Misma geometría y datos que PLAYER.
- La navegación contextual del shell no altera ancho, alineación ni jerarquía.

### Full-page · 1440

- Doce filas completas, incluidos empate, roles administrativos y dos miembros `0/0`.
- Cuatro títulos de logros en dos líneas, sin rebasar sus tarjetas.
- Banner CSS alineado con la banda inferior y dentro del ratio aprobado `3:1–5:1`.

### PLAYER · 390 × 844

- H1 y copy reflowean sin pérdida de jerarquía.
- Podio en orden `1–2–3`, con tres filas amplias y gutter simétrico.
- Inicio de estadísticas alineado con el podio y completamente contenido.

### Full-page · 390

- Estadísticas en dos columnas, sin clipping de cifras o ayudas.
- Tabla contenida en su panel; el ancho mayor pertenece exclusivamente al scroller interno.
- Strip apilado en una columna, con título, miembro y fecha legibles.
- Banner inferior conserva margen y proporción sin ensanchar el documento.

## Límites de esta crítica

- Las capturas y métricas confirman la geometría; no acreditan por sí solas foco, navegación por teclado ni lectura con tecnología asistiva.
- El gesto de scroll horizontal de la tabla no se observa en un PNG, aunque la telemetría confirma `356/704 px` y overflow interno aislado.
- Loading, error, empty y casos de uno o dos miembros no se recapturaron en esta iteración; permanecen bajo la validación funcional de QA anterior.
- El cierre visual no sustituye las comprobaciones técnicas finales de QA sobre red, consola y runtime.

## Gate

No quedan discrepancias P0/P1 en jerarquía del top 3, relación `61/39`, densidad de filas, estadísticas, responsive ni placeholders. El único P2 residual no altera el uso ni la composición y puede diferirse.

VERDICT: VISUAL GATE PASSED
