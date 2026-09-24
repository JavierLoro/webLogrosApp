# Jugadores: conservar, archivar y eliminar del equipo

Fecha: 2026-09-24. **Plan definido; implementación pendiente y no autorizada en esta sesión.**

Este bloque nace del [gap 21](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md#21-conservación-del-jugador-y-baja-del-equipo). Es trabajo de dominio propio, relacionado con [Phase 7.10](MEDIA-PLAN.md), identidad (7.8), temporadas (7.9) y administración UI-G8. No crea una issue remota ni convierte esas fases en completadas.

## 1. Resultado y límites

Separar el derecho a entrar en un equipo de la ficha que conserva su historia. La autoridad funcional es la [matriz de Architecture](Architecture.md#conservación-del-jugador-al-salir--decisión-pendiente-de-implementación):

| Acción | Datos actuales y foto del equipo | Si vuelve | Resultados cerrados |
| --- | --- | --- | --- |
| Salir, perder acceso o archivar | Se conservan; deja de tener acceso y no cuenta como miembro activo | Recupera ficha y progreso sin duplicados | Se conservan |
| Eliminar explícitamente por TEAM_ADMIN | Se retiran los datos actuales salvo referencias históricas necesarias; se borra foto específica y variantes, se cancelan solicitudes pendientes | Empieza de nuevo | Se conservan puntos, puestos, último alias e iniciales; sin foto general como respaldo |

Archivar es reversible mediante reactivación autorizada. Eliminar requiere confirmación de pérdidas y no ofrece deshacer. Ninguna acción elimina la cuenta global, su avatar general ni datos de otros equipos. Se conservan decisiones resueltas y logros del catálogo originados en propuestas del jugador. No usar un borrado en cascada que destruya resultados cerrados.

Fuera de alcance: borrar cuentas globales, borrar equipos, nuevas reglas de corrección histórica, rehacer el ranking o completar toda la administración de temporadas. La ubicación de controles/filtros se define con las nuevas pestañas, ya aplazadas por el usuario.

## 2. Relación con imágenes

- **El diseño** de pertenencia e historial se resuelve antes del diseño final de la relación avatar/equipo: `PLAYER-LC-T01 → MEDIA-10A-T03.02`.
- **La conservación al salir y reingresar** debe funcionar antes de dar por completado el avatar específico: `PLAYER-LC-T03 → MEDIA-10A-T05.08`.
- **La eliminación explícita** usa el borrado seguro de media: `MEDIA-10A-T05.06 + T05.08 → PLAYER-LC-T04`.
- Logros, logos y la infraestructura común pueden avanzar sin esperar a la pantalla de eliminación de jugadores. La eliminación completa no bloquea la entrega local de media; su pendiente debe permanecer visible.
- Una foto retenida de un jugador archivado sigue referenciada: no es temporal ni huérfana. Si el diseño requiere ajustar la unicidad persona/equipo para un reingreso tras eliminación, conservar generaciones históricas sin volver a contarlas como progreso actual.

## 3. Tareas y dependencias

Estados: DONE acredita el entregable indicado; TODO significa trabajo futuro. Los roles son responsabilidades, no agentes lanzados. Prefijo completo de los IDs de esta tabla: `PLAYER-LC-`.

| ID | Estado | Responsable | Dependencias | Entregable y criterio de cierre |
| --- | --- | --- | --- | --- |
| T00 — Consolidar reglas | DONE | Coordinator | Decisiones del usuario | Matriz de acciones, límites y vínculos registrados aquí y en Architecture; solo definición |
| T01 — Diseñar acceso e historial | TODO | Backend / Coordinator | MEDIA-10A-T02.01 | Inventariar relaciones, consultas y permisos afectados; elegir representación de activo/archivado/eliminado, identidad histórica y nuevo comienzo tras eliminación. Resolver referencias a concesiones permanentes y temporadas cerradas sin cambiar su fórmula. Documentar transiciones y cualquier ambigüedad de solicitudes/propuestas por su tipo real |
| T02 — Persistencia compatible | TODO | Backend | T01 + MEDIA-10A-T03.03 + MEDIA-10A-T05.01 | Migración aditiva y transición compatibles con datos actuales, coordinadas con media. Preservar historial, alias, referencias y unicidad de membresía activa; recuperación de migración definida y probada en entorno aislado. No ejecutar migraciones ajenas |
| T03 — Salida, archivo y reingreso | TODO | Backend | T02 | Retirar acceso sin borrar datos; actualizar autorización, contadores y listados. Reingreso de archivado recupera ficha/progreso sin duplicados. Pruebas de permisos, aislamiento, ranking actual/histórico y ausencia de acceso por conservar relación PASS. Preparar referencia estable para avatar específico |
| T04 — Eliminación explícita | TODO | Backend | T03 + MEDIA-10A-T05.06 + MEDIA-10A-T05.08 | Operación TEAM_ADMIN del propio equipo, confirmación representada en contrato, coordinación con subidas activas y retirada segura de avatar. Retirar datos actuales, cancelar solicitudes pendientes y conservar decisiones resueltas, catálogo e históricos. Probar reingreso nuevo, carreras y fallo de limpieza; sin deshacer ni eliminación global |
| T05 — Controles administrativos | TODO | Frontend / Coordinator | T04 + definición de nuevas pestañas | Ubicación y filtros acordados antes de implementar; acciones separadas Archivar/Eliminar, consecuencias explícitas y confirmación de eliminación. Reutilizar UI-G8 cuando se retome; no crear automáticamente subrutas ni reanudar sus gates |
| T06 — Verificación conjunta | TODO | QA / Coordinator | T04 + T05 | Casos de la sección 4 PASS, capturas de estados relevantes y revisión visual por Coordinator según override vigente. Regresión de invitaciones/unión, jugadores, ranking y temporadas sin pérdidas ni mezcla entre equipos |
| T07 — Cierre | TODO | Coordinator | T06 | Evidencia, Architecture, Roadmap, gap 21 y apuntes actualizados. Registrar entorno y tareas aún pendientes; no dar por completadas 7.8/7.9/UI-G8 ni cerrar issues remotas automáticamente |

La interfaz de archivo/eliminación queda aplazada junto a las nuevas pestañas. Se puede verificar T03/T04 por API antes de T05, pero el bloque completo no se cierra sin interfaz y QA acordadas. Si se entrega solo la dependencia de avatares T01–T03, declarar expresamente T04–T07 pendientes.

## 4. Pruebas exigidas

| Caso | Resultado esperado |
| --- | --- |
| Salir o archivar | Ficha, progreso, concesiones y avatar permanecen; usuario sin acceso tenant y fuera de contadores/listado de activos |
| Reingreso tras archivo | Misma ficha, foto y progreso; no duplicar concesiones ni puntos |
| Limpieza de media tras más de 24 h | Avatar archivado sigue accesible para miembros autorizados; no eliminarlo como huérfano |
| Eliminar sin rol o desde otro equipo | Rechazo sin cambios ni exposición de datos |
| Eliminar con resultados cerrados | Misma fila histórica, puntos y puestos de todos antes/después; último alias e iniciales |
| Logros permanentes en históricos | Contribución histórica conservada según fórmula vigente; no vuelve como progreso actual al reingresar tras eliminación |
| Solicitudes y propuestas | Pendientes afectadas según contrato canceladas; decisiones ya resueltas y logros incorporados al catálogo conservados |
| Nuevo ingreso tras eliminación | Ficha actual empieza de nuevo; no muta ni reactiva los resultados cerrados anteriores |
| Avatar y cuenta global | Se elimina solo la foto específica sin referencias; general y otros equipos intactos |
| Subida concurrente o fallo de borrado | No publicar una imagen en una ficha eliminada; limpieza reintentable sin deshacer el estado confirmado ni perder archivos ajenos |
| Interfaz administrativa | Archivar/Eliminar distinguibles; confirmación, errores y estados pendientes reales; teclado y móvil |

## 5. Evidencia y aprendizaje

Al ejecutar: explicar cada concepto antes del bloque, añadir notas pedagógicas donde correspondan y documentar lo implementado en `apuntes.md`. Guardar resultados reproducibles en `docs/player-lifecycle/evidence/` (ruta prevista, no evidencia creada). Revisar migraciones antes de aplicarlas y comprobar diferencias de resultados históricos con fixtures controlados.

Este documento define tareas; no acredita schema, API, imágenes, migraciones ni pruebas ejecutadas. La próxima tarea de diseño es T01, después del inventario MEDIA-10A-T02.01.
