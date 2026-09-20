# UI-G5 — Visual Critic · Iteración 1

## Alcance revisado

- Referencia canónica inspeccionada en resolución original:
  - `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/ranking/ranking-desktop-v1.png`
- Evidencia inmutable de iteración 1 inspeccionada en resolución original:
  - `ranking-player-iteration-1-1440x1024.png`
  - `ranking-player-fullpage-iteration-1-1440.png`
  - `ranking-admin-iteration-1-1440x1024.png`
  - `ranking-player-iteration-1-390x844.png`
- Telemetría consultada:
  - `runtime-ranking-iteration-1.json`
  - `REPORT-ITERATION-1.md`
- Contratos aplicados:
  - `docs/ui-reference/manifest.json`
  - `docs/ui-workstream/VISUAL_SYSTEM.md`
  - `docs/ui-workstream/evidence/UI-G5/UI-G5-T01-ANALYSIS.md`
  - `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/ranking/README.md`

La crítica mantiene las exclusiones funcionales aprobadas: evolución, rachas, progreso, temporada y fotografía real no son requisitos. El interior pictórico de placeholders tampoco se juzga; sí su geometría.

## Veredicto ejecutivo

La iteración corrige los tres hallazgos anteriores. La banda superior desktop queda en `268.25 px`, el ganador es un `16.7 %` más alto que las tarjetas laterales y el strip usa dos líneas completas para los títulos. La tabla recupera protagonismo en el primer viewport, conserva 12 filas de 48 px y no necesita scroll horizontal en 1440 px.

El gate todavía no puede aprobarse: la captura móvil de 390 px presenta overflow horizontal global de 6 px. Podio y estadísticas miden aproximadamente `380.22 px` dentro de un contenedor útil de `358 px`, alcanzando `x≈396.22`. El borde exterior derecho queda fuera de la captura y desaparece el gutter simétrico. Aunque el exceso sea pequeño, es material porque afecta al documento completo y contradice expresamente el contrato responsive de cero overflow global.

**Resultado visual:** 0 P0 · 1 P1 · 0 P2.

## Reevaluación de hallazgos anteriores

### P1-01 — Densidad vertical de la banda superior: resuelto

- La banda completa mide `268.25 px`, dentro del objetivo útil de `240–270 px` fijado en la iteración anterior.
- Las descripciones redundantes y el exceso de wrapper desaparecen; podio y estadísticas entran en una banda compacta común.
- `Clasificación completa` comienza cerca de `y=575` y sus datos alrededor de `y=665`, aproximadamente 90–145 px antes que en iteración 0.
- El viewport inicial muestra ocho posiciones completas en lugar de cuatro, sin forzar las 12 filas reales dentro de 1024 px.
- El PageHeader y el shell congelado permanecen intactos.

### P2-01 — Diferencia de altura del ganador: resuelto

- Primer puesto: `210 px`.
- Segundo y tercero: `180 px`.
- Relación medida: `16.7 %`, dentro del objetivo `15–20 %`.
- La jerarquía se percibe clara sin volver a inflar la banda superior.

### P2-02 — Truncado del strip inferior: resuelto

- Los cuatro títulos usan dos líneas de 16 px y se leen completos en la captura full-page.
- No hay descendientes que rebasen la tarjeta ni clipping inferior.
- El nombre excepcionalmente largo de Álex puede conservar elipsis; el contrato permite truncarlo cuando el nombre completo permanece accesible.

## Hallazgo actual

### P1-01 — Podio y estadísticas desbordan globalmente 6 px en móvil

**Elemento:** primera banda del ranking en `ranking-player-iteration-1-390x844.png`.

**Referencia/contrato:** no existe bitmap móvil canónico, por lo que rige la inferencia aprobada de UI-G5-T01: una columna, podio `1–2–3`, paneles al ancho disponible y `document.documentElement.scrollWidth === window.innerWidth`; el sistema exige cero overflow global.

**Implementación:** el contenedor general empieza en `x=16` y tiene `358 px` de ancho, terminando en `x=374`. Sus hijos de podio y estadísticas conservan aproximadamente `380.22 px`, terminando en `x=396.22`. La telemetría registra `scrollWidth=396` frente a `clientWidth=390`.

**Evidencia visual:** el gutter izquierdo de 16 px está presente, pero el panel del podio llega hasta el borde derecho de la captura y su borde exterior derecho no se ve. El mismo ancho se propaga al panel de estadísticas. Las tarjetas internas todavía caben visualmente, por lo que el fallo es del wrapper de banda, no de su contenido.

**Diferencia:** la pantalla puede desplazarse horizontalmente y pierde la alineación de gutters del shell. Esto afecta al viewport completo, no a un scroller deliberado como el de la tabla.

**Corrección esperada:** permitir que ambos hijos de la primera banda en móvil encojan al ancho real del contenedor (`358 px`) y conservar el gutter de 16 px a ambos lados. Eliminar el mínimo heredado de desktop o aplicar `min-width: 0`, `width: 100%` y `max-width: 100%` en la composición local equivalente, sin tocar shell ni primitivas compartidas. La tabla puede mantener su ancho interno de `704 px`, pero solo dentro de su scroller local. Recapturar a 390 px y exigir `scrollWidth === clientWidth === 390`.

## Revisión por superficie

### PLAYER · 1440 × 1024

- Relación `61/39`, top band, podio, estadísticas y tabla convergen con la autoridad visual.
- Tabla de 733 px sin scroll horizontal; 12 filas a 48 px.
- Stats sin clipping y con las seis cifras reales claramente jerarquizadas.

### TEAM_ADMIN · 1440 × 1024

- Misma geometría y datos que PLAYER.
- El shell contextual añade Administración sin mover ni estrechar el ranking.

### Full page · 1440

- Las 12 filas, los cuatro items del strip y el banner CSS están completos.
- El banner conserva proporción cercana a `4:1` y se alinea con la banda inferior.
- El vacío del rail entre estadísticas y banner sigue siendo una consecuencia aceptable de omitir paneles futuros no respaldados.

### PLAYER · 390 × 844

- H1, copy y orden de podio `1–2–3` son correctos.
- Las tres filas del podio conservan legibilidad y jerarquía.
- El overflow global de 6 px impide aprobar el responsive, aunque no produzca clipping interno de las tarjetas.

## Límites de esta crítica

- Esta revisión aprueba visualmente las capturas y usa la telemetría suministrada para medir geometría; no sustituye la validación técnica completa de QA.
- El PNG móvil solo muestra PageHeader, podio y el inicio de estadísticas. Tabla, strip y banner móvil no cuentan con evidencia visual directa en esta iteración.
- El orden semántico, foco, estados loading/error/empty y comportamiento del scroller interno no pueden aprobarse solo desde PNG.
- Los abortos de recursos cancelados, número de peticiones y estados HTTP pertenecen al cierre de QA, no al veredicto visual.

## Gate

Los tres deltas de iteración 0 están resueltos sin regresión desktop. Falta una corrección local y acotada del ancho móvil; después debe repetirse la captura de 390 px y comprobarse cero overflow global antes de aprobar UI-G5.

VERDICT: ITERATE
