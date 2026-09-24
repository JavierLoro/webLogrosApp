# Comparación G7/G8 — Coordinator

2026-09-24. Comparación directa por el Coordinator conforme al override del usuario del 2026-09-21. Implementación frontend realizada por workers; QA y captura por qa_capture. Fuentes: [manifest](../ui-reference/manifest.json), referencias canónicas allí enlazadas y [26 capturas finales](qa/screenshots/).

## Resultado

**Gate local G7/G8 PASS en el alcance sin imágenes de Phase 7.7.** Ambos historiales se distinguen, los detalles conservan jerarquía de contenido/estado y la administración tiene navegación y recorridos operativos por área. No hay P0/P1 material abierto en las vistas revisadas. No acredita G9, A1/A2 ni igualdad píxel a píxel; el manifest excluye esta última como gate.

Inspección directa de referencias y capturas representativas: historial personal desktop/móvil y detalles propios; resumen administrativo; invitaciones; catálogo; colas de solicitudes/propuestas; detalle de propuesta desktop y solicitud móvil. La cobertura de geometría de las 26 capturas corresponde al informe automático QA, no a una afirmación de inspección manual individual de cada PNG.

| Área | Composición conservada y adaptación funcional |
| --- | --- |
| Historial personal | KPI, dos tablas distinguibles, filtros y ayuda; detalles con contenido principal y estado/historial lateral. «En revisión» no añade un estado de dominio. |
| Resumen admin | Cinco accesos, indicadores reales y bloques inferiores de ayuda/revisiones. |
| Invitaciones/miembros | Indicadores, formulario/filtros, tabla y ayuda. Sin prometer revocar, cambiar roles o eliminar miembros mediante APIs inexistentes. |
| Logros | Indicadores, catálogo a la izquierda y asignación/progreso a la derecha. Controles existentes seleccionando logro; no se inventa actividad reciente ni edición general del catálogo. |
| Colas de revisión | Tabla, filtros, estados y ayuda; revisión en detalle para comprobar criterios y elegibilidad antes de decidir. Menos columnas que el mockup cuando el contrato carece del dato. |
| Detalles admin | Datos/criterios y decisión separados; preview de propuesta, identidad del solicitante y contexto del logro. Solicitud histórica usa su periodo original. |

## Iteraciones y correcciones

1. Detectados overflow móvil en tablas/contenedores, densidad excesivamente abierta en historial, contorno de foco sobre título y estado de formulario persistente al cambiar de detalle. Corregidos contenedores posicionados/min-width, filas compactas, estilo del título no interactivo y componente de formulario con clave por recurso.
2. Ajustados resumen a cinco columnas desktop, separación de textos, tamaños de placeholders, densidad de colas, preview de propuesta y resúmenes recientes. Nueva captura tras corrección.
3. QA final: viewport 1440×1024 y 390×844, scrollWidth igual al viewport en las 26 capturas; tablas con scroll local móvil. Sin pageerrors ni errores HTTP durante captura.

## Deltas P2 y exclusiones

- Densidad, altura de cabeceras y número de filas visibles difieren de las referencias; tipografía y shell común se conservan. El catálogo muestra todos los resultados y requiere más scroll. No se declara reproducción exacta.
- En móvil, indicadores y navegación apilados ocupan más altura; los controles permanecen accesibles. Mejoras de compactación quedan para la revisión global.
- Iniciales dentro de algunos placeholders pequeños aparecen recortadas: contenido de media excluido; dimensiones del espacio se conservan. No sustituirlo por imágenes reales en esta fase.
- Banner, avatares, imágenes de logros y fotografía excluidos según manifest. Adjuntos, notificaciones, actividad ficticia, estadísticas sin contrato y controles de futuras fases no se añaden por aparecer en una referencia.
- El detalle personal de obtención adapta una referencia con acciones administrativas: el PLAYER consulta su estado y no recibe controles de resolución.

La regresión de reglas de progreso/secretos combina la evidencia previa de [#30/#29](../issue-30/RESULT.md) con los nuevos recorridos administrativos de [QA](qa/QA.md). No se afirma haber repetido toda la suite histórica en esta entrega.
