# UI-G4-T04 — Visual critic · Iteración 0

## Alcance y evidencia

Auditoría visual independiente de catálogo y formulario por rol.

Referencias:

1. `catalogo-desktop-v2.png`, 1672 × 941 — catálogo vigente.
2. `nuevo-logro-desktop-v1.png`, 1672 × 941 — propuesta PLAYER.
3. `UI-G4-T01-ANALYSIS.md` — sustituciones funcionales, geometría y responsive aprobados.

Implementación inspeccionada:

1. `catalog-player-1440x1024.png`.
2. `catalog-admin-1440x1024.png`.
3. `catalog-player-390x844.png`.
4. `form-player-1440x1024.png`.
5. `form-admin-1440x1024.png`.
6. `form-player-390x844.png`.
7. `runtime-capture.json` y `REPORT.md` para medidas, overflow y roles.

No se penaliza la ausencia de media real, temporada, secretos, progreso, toggle grid/lista, paginación, upload, puntos/categoría sugeridos por PLAYER ni otros campos excluidos. PLAYER debe proponer; TEAM_ADMIN debe crear directamente.

## Resultado resumido

- **P0:** 0.
- **P1:** 2.
- **P2:** 2.
- **Gate:** requiere iteración y nueva captura de las seis vistas.

La base es sólida: shell estable, datos y CTAs por rol correctos, formularios con proporción 69/29, toolbar funcional y cero overflow global. Los deltas materiales están concentrados en la densidad del grid y la jerarquía del título de página.

## Fortalezas confirmadas

1. **Roles — saludable.** PLAYER ve `Proponer logro` y `Enviar propuesta`; TEAM_ADMIN ve `Crear logro`. No aparece creación directa en PLAYER ni campos administrativos en su formulario.
2. **Composición del formulario — saludable.** La rejilla desktop reproduce aproximadamente `69/29`; dentro del cuerpo, texto/criterios o texto/metadatos mantienen el reparto `59/39`. Preview y ayuda forman un rail claro.
3. **Semántica visual de propuesta — saludable.** Notice ámbar, badge `Propuesta` y copy dejan claro que aprobar incorpora al catálogo pero no concede el logro.
4. **Catálogo real — saludable.** Resumen, categorías, búsqueda, conteo, puntos, holders y `Conseguido` proceden del fixture. No hay estados ficticios de secreto o progreso.
5. **Superficies — saludables.** Fondo, bordes, radios, controles y placeholders conservan el sistema LockerBoard. El interior pictórico no se evalúa; la media sí mantiene 16:9.
6. **Responsive visible — saludable.** Catálogo y formulario apilan correctamente a 390 px, los filtros tienen scroll interno y no existe overflow global.
7. **Shell — saludable.** Sidebar de 172 px, cabecera de 129 px, navegación activa y bloque de Administración mantienen la geometría congelada.

## P1 — Diferencias materiales

### P1-01 — El catálogo muestra cinco columnas en lugar de seis a 1440 px

- **Elemento:** grid de cards en PLAYER y TEAM_ADMIN.
- **Referencia/contrato:** seis columnas desktop; `UI-G4-T01` exige a 1440 seis cards siempre que cada una conserve al menos 178 px.
- **Implementación:** cinco columnas de aproximadamente **234 px** dentro de 1219 px útiles. Las métricas confirman `grid-template-columns` con cinco tracks.
- **Diferencia:** el catálogo pierde un 16,7 % de densidad horizontal. Solo cinco logros forman cada fila, las cards crecen en exceso y el documento necesita tres filas para 14 elementos, alejándose de la composición compacta de la referencia.
- **Corrección esperada:** hacer que el breakpoint de seis columnas prevalezca realmente a 1440. Con 1219 px, seis columnas y gaps de 12 px producen cards de aproximadamente **193 px**, por encima del mínimo de 178 px. Aplicar la misma regla al skeleton; mantener cinco columnas únicamente por debajo del umbral real. Verificar PLAYER y TEAM_ADMIN con seis tracks medidos, sin overflow ni recorte de títulos/pies.

### P1-02 — El título principal no establece jerarquía de página

- **Elemento:** `Logros del equipo`, `Proponer logro` y `Crear logro` en `PageHeader`.
- **Referencia:** título display dominante de aproximadamente 36–46 px, claramente separado de breadcrumbs, descripción, toolbar y títulos de panel.
- **Implementación:** el `h1` se percibe en una escala próxima a 16–18 px, equivalente a encabezados de card/panel. En catálogo queda subordinado al strip de métricas y al CTA; en formularios no crea el ancla visual de entrada.
- **Diferencia:** se pierde la jerarquía tipográfica principal en las dos pantallas y en ambos roles. No es un problema de copy ni de features excluidas.
- **Corrección esperada:** comprobar que el token `--lb-text-page-title` se aplique realmente como `font-size` y recuperar el rango 36–46 px con la display condensada. Preservar descripción y breadcrumbs compactos. `PageHeader` está congelado desde UI-G2: cualquier cambio en la primitiva compartida debe volver al Coordinator; no resolverlo con una variante divergente por pantalla sin su autorización.

## P2 — Ajustes de precisión

### P2-01 — La categoría ocupa la cabecera de todas las cards

- **Elemento:** jerarquía interna de card.
- **Referencia/contrato:** nombre y descripción dominan; puntos, categoría y holders forman la zona inferior.
- **Implementación:** la categoría aparece como eyebrow rojo encima del título, mientras el pie solo contiene puntos y holders.
- **Diferencia:** catorce etiquetas rojas compiten con los títulos y convierten la categoría en el primer dato leído.
- **Corrección esperada:** devolver la categoría al pie como badge compacto o reducir su peso visual para que el título sea la primera lectura. Mantener puntos y holders legibles en las cards de ~193 px resultantes.

### P2-02 — El enlace de retorno rompe la secuencia de entrada del formulario

- **Elemento:** breadcrumbs, título y `Volver al catálogo`.
- **Referencia:** breadcrumb → volver → título → explicación → formulario.
- **Implementación:** breadcrumb → título/explicación → divisor → volver → formulario.
- **Diferencia:** la acción secundaria queda aislada entre la cabecera ya cerrada y el panel, añadiendo una pausa visual innecesaria.
- **Corrección esperada:** integrar `Volver al catálogo` antes del título o dentro de la zona de breadcrumbs/acciones del encabezado, sin crear otra cabecera ni perder el objetivo táctil.

## Regresiones, funcionalidad y límites

- PLAYER y TEAM_ADMIN comparten geometría de catálogo; solo cambian métricas personales, CTA y formulario autorizado.
- El formulario PLAYER no muestra puntos, categoría, temporada, secretos, upload ni evidencia; TEAM_ADMIN no muestra notice de revisión.
- Preview y ayuda usan únicamente los campos permitidos y placeholders.
- Las capturas y métricas no muestran errores, clipping ni overflow global.
- `REPORT.md` documenta POST controlados y limpieza del fixture; este informe no revalida ni sustituye ese PASS técnico.
- Loading, error, vacío y cero resultados no tienen captura visual en este lote y no se aprueban desde los PNG poblados.

VERDICT: ITERATE
