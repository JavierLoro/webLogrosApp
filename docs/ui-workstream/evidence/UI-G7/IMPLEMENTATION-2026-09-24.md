# G7 — Análisis e implementación, 2026-09-24

## Alcance autorizado

Coordinator delega historial y detalles personales de Phase 7.7 en `/equipos/[slug]/solicitudes`. Reanudación limitada G7/G8 por petición «montalo y ves explicando». No reabre A1/A2/G9. No se modifican shell, tokens, APIs ni control plane.

## Referencias inspeccionadas antes de implementar

Manifest y README de solicitudes; imágenes originales:
- `solicitudes-desktop-v3.png`: título condensado grande; cinco métricas; columna principal dominante con dos tablas y barra de búsqueda/estado/orden; aside de explicación/acciones/estados. Superficies oscuras, bordes azul grisáceo, acento rojo y estados amarillo/verde/rojo.
- `detalles-propuesta-propia.png`: contenido descriptivo/criterios a izquierda; resolución e historial a derecha; imagen 4:3 de sustitución y CTA al catálogo.
- `detalles-solicitud-logro-v1.png`: datos y criterios con panel lateral. El mockup incluye contexto administrativo y evidencias no autorizadas para vista personal: no se trasladan acciones de resolución, adjuntos ni notificaciones.

Inspección mediante node_repl/fs/emitImage; view_image falló por helper sandbox Windows. No se generaron/duplicaron referencias.

## Matriz funcional

| Pantalla | Lectura real | Datos usados | Límites |
| --- | --- | --- | --- |
| Historial solicitudes | GET /api/equipos/:slug/solicitudes | Estado, fechas, logro, motivo y seasonId | API personal autorizada; no filtrado de usuarios en cliente |
| Historial propuestas | GET /api/equipos/:slug/propuestas | Nombre, descripción, criterios, estado, fechas, motivo y logro asociado | Sin categoría/puntos/temporada sugeridos porque no existen en propuesta |
| Detalle solicitud | Fila autorizada del listado + query tipo/ detalle | Criterios, contexto original, resolución | No API de detalle personal inventada |
| Detalle propuesta | Fila autorizada del listado + query tipo/ detalle | Datos enviados, rechazo, incorporación y enlace real | No edición de propuesta aprobada ni concesión implícita |

Coordinator confirmó contratos backend. DTO locales G7 para no editar tipos compartidos. Estados PENDING/ACCEPTED/REJECTED. Propuesta censurada solo contiene id/isHidden/logro oculto: no se infiere estado ni nombre; KPIs explicitan la exclusión de sus estados ocultos.

## Implementación

- Dos tablas, KPIs calculados, búsquedas/estado/orden reales sobre el historial recibido.
- Filtros y selección guardados en query; detalle/retorno conservan búsqueda. Enlaces reales admiten recarga y navegación atrás.
- Foco al título de detalle, tablas etiquetadas y scroll horizontal local, controles con labels y focus visible.
- Estados carga, vacío, filtros sin resultados, ID no autorizado/inexistente, error recuperable, 401/403/404.
- Propuestas aceptadas: «Añadida al catálogo»; texto explícito de que no concede puntos. PLAYER conserva CTA proponer, TEAM_ADMIN no recibe ese CTA porque su formulario crea directamente.
- Fechas reales, sin personas ni números del mockup. Sin imágenes reales ni subida.
- Estilo CSS local usando tokens existentes; aside baja bajo tablas cuando no cabe y detalles pasan a una columna en móvil.

## Validaciones del implementador

- `npx tsc --noEmit`: PASS.
- ESLint dirigido a solicitudes/page.tsx: PASS.
- `git diff --check`: PASS (solo aviso CRLF).
- No servicios iniciados, no seed/reset, no backend editado.

## Pendiente para Coordinator/QA

Capturas desktop/móvil; filtros, recarga y retorno; estados aceptada/rechazada/pendiente, censura, enlaces al logro, teclado y overflow. Comparación visual por Coordinator; no autoaprobación del implementador. El contrato no aporta progreso histórico a la solicitud personal: no se sustituye por progreso actual ni se inventa. Imágenes de propuestas permanecen Phase 10.

## Primera revisión y correcciones

Coordinator solicita cuerpo esencial >=14px, filas compactas, acciones sin salto y KPI más visible: aplicado. Anchors neutrales porque ambas tablas están visibles. JSX expandido y formateado. QA detecta scrollWidth móvil718: causa etiqueta sr-only en TH fuera del containing block; tableWrap position:relative contiene la etiqueta. Foco de cabecera conserva anuncio sin marco de control; links mantienen focus visible. TypeScript y ESLint repetidos PASS después de correcciones. Recaptura y veredicto pendientes del Coordinator/QA.

Segunda corrección de densidad solicitada por Coordinator: nombre truncado a una línea con title, descripción a una línea; categoría conservada en detalle. Resultado/rechazo limitado a dos líneas en tabla, title y motivo completo en detalle. Anchors desktop >1250px width:auto para compartir fila con filtros si cabe. Texto esencial 14px conservado. ESLint dirigido PASS; recaptura de listado desktop/móvil solicitada a QA.
