# UI-G5 — Visual Critic · Iteración 0

## Alcance revisado

- Referencia canónica, inspeccionada en resolución original:
  - `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/ranking/ranking-desktop-v1.png`
- Evidencia de implementación, inspeccionada en resolución original:
  - `ranking-player-1440x1024.png`
  - `ranking-player-fullpage-1440.png`
  - `ranking-admin-1440x1024.png`
  - `ranking-player-390x844.png`
- Contratos consultados:
  - `docs/ui-reference/manifest.json`
  - `docs/ui-workstream/VISUAL_SYSTEM.md`
  - `docs/ui-workstream/evidence/UI-G5/UI-G5-T01-ANALYSIS.md`
  - `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/ranking/README.md`

La crítica respeta la autoridad funcional: evolución, rachas, progreso, temporada y fotografía real están excluidos; su ausencia no se penaliza. El banner CSS inferior y los avatares se evalúan por geometría, alineación y contraste, no por contenido pictórico.

## Veredicto ejecutivo

La pantalla tiene una base sólida: mantiene la relación `61/39`, comunica correctamente el top 3, presenta estadísticas reales y conserva geometría idéntica entre PLAYER y TEAM_ADMIN. El responsive móvil reordena el podio de forma legible y el banner inferior conserva aproximadamente `4:1`.

Sin embargo, la densidad vertical del primer bloque se aleja materialmente de la composición aprobada. Las cabeceras, descripciones, divisores y padding locales hacen que podio y estadísticas ocupen alrededor de 350 px, frente a los aproximadamente 227–232 px de la referencia. La clasificación comienza cerca de `y=665` y solo deja visibles cuatro filas en el viewport de 1024 px, mientras la referencia empieza alrededor de `y=429` y prioriza claramente la tabla. Las 12 filas reales justifican scroll natural, pero no justifican este retraso previo a la primera fila.

**Resultado visual:** 0 P0 · 1 P1 · 2 P2.

## Fortalezas confirmadas

- Grid desktop cercano a `61/39`, con gap y gutters coherentes con el sistema congelado.
- Podio visual `2–1–3`; primer puesto central y destacado mediante altura, color y número explícito.
- Datos legibles y veraces: nombres, puntos, número de logros, seis estadísticas, media con significado y participación `10 de 12 / 83 %`.
- Tabla compacta, de lectura clara, con cinco columnas y filas visualmente próximas a 48 px.
- Nombre largo de Álex cabe completo en la tabla sin deformar las columnas.
- Variante TEAM_ADMIN conserva el mismo contenido y geometría; solo cambia el shell contextual esperado.
- En móvil, el podio pasa a orden `1–2–3`, las tarjetas se convierten en filas amplias y no se aprecia overflow global en la captura.
- Tira inferior de cuatro items y banner CSS mantienen la estructura prevista; el banner full-page conserva ratio cercano a `4:1`.
- No se han rellenado con contenido ficticio las regiones futuras excluidas.

## Hallazgos

### P1-01 — La banda superior pierde la densidad de la referencia y retrasa materialmente la tabla

**Elemento:** paneles `Podio del equipo` y `Estadísticas generales`, y su relación vertical con `Clasificación completa`.

**Referencia:** podio aproximado `y=183–410` (~227 px), estadísticas `y=179–411` (~232 px) y tabla desde `y≈429`. El análisis ejecutable fija una banda útil compacta y un podio objetivo de `13.5–15rem`.

**Implementación:** ambos paneles arrancan cerca de `y=293`; el podio termina alrededor de `y=651` (~358 px) y estadísticas alrededor de `y=637` (~344 px). La tabla empieza cerca de `y=665`, y sus datos no aparecen hasta aproximadamente `y=811` debido a una segunda cabecera local alta.

**Diferencia:** el patrón añade tres niveles de presentación antes de los datos —título de página, cabecera explicativa del panel y contenido— donde la referencia dedica casi toda la banda a la competición y las cifras. Esta suma de wrappers y copy secundario reduce de forma material la densidad deportiva de la pantalla. El efecto es visible independientemente del offset del shell congelado y del crecimiento legítimo de 10 a 12 miembros.

**Corrección esperada:** compactar únicamente la composición local del ranking, sin tocar `PageHeader`, shell ni primitivas compartidas. Mantener `h2` y significado accesible, pero reducir o retirar descripciones redundantes, divisores, gaps y padding vertical dentro de los paneles. Objetivo útil: banda superior completa cercana a `240–270 px`, ganador todavía legible y tabla desplazada aproximadamente 90–120 px hacia arriba. Compactar también la cabecera local de `Clasificación completa` para que la primera fila aparezca antes, conservando las 12 filas de 48 px y el scroll natural de la página.

### P2-01 — La ventaja de altura del ganador queda ligeramente corta

**Elemento:** tarjetas del podio desktop.

**Referencia/contrato:** el primer puesto debe ser entre un 15 % y un 20 % más alto que segundo y tercero.

**Implementación:** visualmente, la tarjeta central mide aproximadamente 250 px frente a unos 220 px de las laterales, una ventaja cercana al 14 %. El color oro y la posición central aseguran la jerarquía, por lo que no es un fallo material aislado.

**Corrección esperada:** al compactar la banda superior, conservar una relación medida dentro de `1.15–1.20`, preferiblemente alrededor de `1.17`, sin agrandar de nuevo el panel completo.

### P2-02 — El strip inferior trunca demasiado pronto títulos y nombres

**Elemento:** `Últimos logros por miembro` en desktop full-page.

**Referencia:** cuatro items compactos, pero con nombre del logro y miembro reconocibles.

**Implementación:** los cuatro títulos aparecen recortados (`Trabajo en e…`, `Vuelo en pic…`) y varios nombres también pierden una parte significativa, aunque exista espacio vertical dentro de las tarjetas.

**Diferencia:** la geometría general es correcta, pero la utilidad visual del strip disminuye porque casi ningún item puede identificarse por completo a simple vista.

**Corrección esperada:** mantener cuatro columnas y miniatura cuadrada, pero dedicar una segunda línea controlada al título o redistribuir el ancho interno entre miniatura y texto. El nombre del miembro puede seguir con elipsis para casos largos si permanece accesible; evitar reducir la tipografía por debajo del sistema.

## Revisión por superficie

### PLAYER · 1440 × 1024

- Jerarquía de página, relación de columnas y contenido real correctos.
- P1 visible en densidad vertical: la clasificación, que es el contenido principal, llega demasiado tarde al viewport inicial.
- Cuatro filas visibles no son un problema por sí solas; lo material es que el exceso proviene del preámbulo local, no de las 12 filas reales.

### TEAM_ADMIN · 1440 × 1024

- Reproduce la misma geometría y el mismo P1, sin controles administrativos inventados.
- El bloque Administración del shell no altera el área útil ni el ranking.

### PLAYER · 390 × 844

- H1, descripción y podio reflowean correctamente.
- Orden visual `1–2–3`, tarjetas amplias y jerarquía clara.
- La captura solo acredita la parte superior; tabla, scroll horizontal interno, strip y banner móvil quedan fuera de evidencia visual directa.

### Full page · 1440

- Las 12 filas, actividad y banner están presentes y no muestran recortes verticales visibles.
- El rail vacío bajo estadísticas es consecuencia aceptable de excluir evolución/rachas/progreso; no se exige rellenarlo.
- El banner queda alineado con la banda inferior y conserva la geometría aprobada.

## Límites de esta crítica

- Las coordenadas anteriores son medidas visuales aproximadas sobre PNG, no telemetría DOM.
- Las capturas no prueban orden semántico del DOM, `title`/nombre accesible, foco, estados loading/error/empty, número de peticiones ni overflow interno de la tabla.
- Esas comprobaciones pertenecen al informe de QA aún independiente y no se dan por aprobadas aquí.
- La ausencia de fotografía, evolución, rachas y progreso es una decisión funcional correcta, no una carencia visual.

## Gate

El P1 de densidad vertical afecta la jerarquía principal y el número de filas que el usuario puede comparar en el primer viewport. Requiere una iteración local antes del gate; los dos P2 pueden resolverse en el mismo ajuste sin cambiar shell, datos ni alcance funcional.

VERDICT: ITERATE
