# 7.7 — Contratos comprobados

Auditoría de código 2026-09-24; no confundir con QA de ejecución. Alcance: G7/G8 sin imágenes.

| Pantalla/acción | API relativa a `/equipos/:slug` | Datos y límites |
| --- | --- | --- |
| Historial de obtención | GET `/solicitudes` | Solo usuario actual, incluye estado, fechas, seasonId y rejectionReason; logro y motivo censurados si corresponde. Detalle personal deriva de la fila, sin inventar endpoint. |
| Historial y detalle de propuestas | GET `/propuestas`, `/propuestas/:id` | Solo autor actual; texto/criterios, estado, motivo y logro incorporado. Propuesta incorporada como secreto puede devolver únicamente id, isHidden y logro oculto: no asumir campos restantes. |
| Cola/detalle obtención | GET `/admin/solicitudes?status=all`, `/admin/solicitudes/:id` | TEAM_ADMIN. Sin query solo pendientes. Detalle ampliado en esta entrega con progress del periodo original y season. |
| Cola/detalle propuestas | GET `/admin/propuestas?status=all`, `/admin/propuestas/:id` | TEAM_ADMIN. Identidad contextual, definición, estado y logro. |
| Resolver propuesta | POST `/admin/propuestas/:id/aceptar` o `/rechazar` | Aceptar recibe puntos, categoría opcional, scope, kind, targetValue e isSecret. Rechazar exige reason no vacío hasta 500 caracteres. Backend protege transición concurrente. |
| Resolver obtención | POST `/admin/solicitudes/:id/aceptar` o `/rechazar` | Rechazo requiere reason. Concesión transaccional usa temporada original y comprueba objetivo si progresivo. |
| Miembros | GET `/admin/miembros` | Identidad, email, rol y joinedAt reales. No se ha encontrado mutation de rol: no crear control ficticio. Archivo/eliminación pertenece a PLAYER-LC. |
| Catálogo/asignación | GET `/logros`, POST `/admin/asignaciones` | Asignación recibe userId/logroId; comprueba miembro, tenant, duplicados y objetivo. Detalle existente mantiene controles de progreso/secretos. |
| Progreso | GET `/logros/:id/progreso?userId=…`, PATCH `/logros/:id/progreso` | Lectura ordinaria usa periodo activo; nunca sustituye progreso histórico de solicitud. PATCH requiere userId/delta entero. |
| Invitaciones | Rutas existentes `/invitaciones` | Preservar contrato real y manejo de token recuperable, caducidad y usos; sin promesas de email. |

## Ampliación mínima de lectura

GET `/admin/solicitudes/:id` añade `progress: {currentValue,targetValue,seasonId,status} | null` y `season: {id,name,status} | null`. El contador/concesión se consultan con userId/logroId/seasonId de la solicitud ya filtrada por tenant. No se cambia schema ni aceptación, y no se amplía la lectura a PLAYER. Estándar devuelve progress null. Temporada permanente devuelve season null.

## Límites preservados

Sin nuevos estados «En revisión»/«Solicitar cambios», edición de propuestas aprobadas, evidencias adjuntas ni subida de imágenes. Referencias visuales no crean esas capacidades. #11 temporadas, #27/#28 perfil/alias y PLAYER-LC conservan sus pendientes. Los endpoints existentes están comentados; la nueva lectura recibe notas pedagógicas y apuntes tras verificación.
