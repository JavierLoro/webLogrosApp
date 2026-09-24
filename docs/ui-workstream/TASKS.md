# UI Workstream Tasks

Leyenda: TODO · READY · IN_PROGRESS · BLOCKED · DONE

Conciliación documental 2026-09-22: G0–G5 cerrados; G6-T01/T02 implementados y continuación pausada en G6-T03; A1-T04 en curso y foco actual A2-T04. No se cambia ningún estado de tarea ni se cierra un gate con esta actualización. Auth Hardening se completó fuera de A1/A2; identidad y temporadas se siguen en Roadmap/BACKEND-GAPS con sus validaciones y pendientes propios.

| ID | Estado | Rol principal | Dependencias | Entregable |
| --- | --- | --- | --- | --- |
| UI-G0-T01 | DONE | Coordinator / Visual Lead | — | Inventario canónico reconciliado |
| UI-G0-T02 | DONE | Coordinator | T01 | manifest.json apuntando a archivos reales |
| UI-G0-T03 | DONE | Visual Lead | T01 | Confirmación de que no faltan refs desktop para el lote inicial |
| UI-G0-T04 | DONE | Visual Critic | T02,T03 | VISUAL_SYSTEM.md |
| UI-G1-T01 | DONE | Backend Fixture Worker | G0 gate | Matriz referencia → datos necesarios |
| UI-G1-T02 | DONE | Backend Fixture Worker | T01 | Seed visual determinista |
| UI-G1-T03 | DONE | Backend Fixture Worker | T01 | Read APIs mínimas |
| UI-G1-T04 | DONE | Backend Fixture Worker | T01 | Dominio/API mínimo de propuestas |
| UI-G1-T05 | DONE | QA Worker | T02,T03,T04 | Fixture/backend validados |
| UI-G2-T01 | DONE | Shell Frontend Worker | G1 gate | Tokens compartidos |
| UI-G2-T02 | DONE | Shell Frontend Worker | T01 | Shell y primitivas comunes |
| UI-G2-T03 | DONE | Shell Frontend Worker | T02 | Variantes PLAYER/TEAM_ADMIN |
| UI-G2-T04 | DONE | Shell Frontend Worker | T02 | Placeholders geométricos |
| UI-G2-T05 | DONE | Visual Critic + Shell Worker | T03,T04 | Shell convergido y congelado |
| UI-G3-T01 | DONE | Screen Worker | G2 gate | Análisis dashboard |
| UI-G3-T02 | DONE | Screen Worker | T01 | Implementación dashboard |
| UI-G3-T03 | DONE | QA Worker | T02 | Screenshot determinista |
| UI-G3-T04 | DONE | Visual Critic | T03 | Delta report |
| UI-G3-T05 | DONE | Screen Worker | T04 | Correcciones hasta gate |
| UI-G4-T01 | DONE | Screen Worker | G2 gate,G1 proposals | Análisis catálogo + formulario por rol |
| UI-G4-T02 | DONE | Screen Worker | T01 | Catálogo |
| UI-G4-T03 | DONE | Screen Worker | T01 | Crear/proponer logro |
| UI-G4-T04 | DONE | QA + Critic | T02,T03 | Screenshot + delta report |
| UI-G4-T05 | DONE | Screen Worker | T04 | Correcciones hasta gate |
| UI-G5-T01 | DONE | Screen Worker | G2 gate,G1 API | Análisis ranking |
| UI-G5-T02 | DONE | Screen Worker | T01 | Implementación ranking |
| UI-G5-T03 | DONE | QA Worker | T02 | Screenshot determinista |
| UI-G5-T04 | DONE | Visual Critic | T03 | Delta report |
| UI-G5-T05 | DONE | Screen Worker | T04 | Correcciones hasta gate |
| UI-G6-T01 | DONE | Screen Worker | G2 gate,G1 API | Análisis jugadores |
| UI-G6-T02 | DONE | Screen Worker | T01 | Implementación jugadores |
| UI-G6-T03 | READY | QA Worker | T02 | Screenshot determinista |
| UI-G6-T04 | TODO | Visual Critic | T03 | Delta report |
| UI-G6-T05 | TODO | Screen Worker | T04 | Correcciones hasta gate |
| UI-G7-T01 | TODO | Screen Worker | G2 gate,G1 proposals | Análisis solicitudes/propuestas |
| UI-G7-T02 | TODO | Screen Worker | T01 | Página principal |
| UI-G7-T03 | TODO | Screen Worker | T01 | Detalles según navegación aprobada |
| UI-G7-T04 | TODO | QA + Critic | T02,T03 | Screenshot + delta report |
| UI-G7-T05 | TODO | Screen Worker | T04 | Correcciones hasta gate |
| UI-G8-T01 | TODO | Shell/Admin Worker | G2 gate | Navegación admin + breadcrumbs |
| UI-G8-T02 | TODO | Admin Screen Worker | T01 | Resumen admin |
| UI-G8-T03 | TODO | Admin Screen Worker | T01 | Invitaciones |
| UI-G8-T04 | TODO | Admin Screen Worker | T01 | Jugadores |
| UI-G8-T05 | TODO | Admin Screen Worker | T01,entrega #30/#29 | Rediseñar logros/asignación integrando tipo, objetivo, alcance, secreto y controles de progreso/concesión existentes |
| UI-G8-T06 | TODO | Admin Screen Worker | T01,G1 API,entrega #30/#29 | Solicitudes + detalle: elegibilidad, objetivo obligatorio y temporada original de la solicitud |
| UI-G8-T07 | TODO | Admin Screen Worker | T01,G1 proposals,entrega #30/#29 | Propuestas + detalle: definir tipo/objetivo/alcance/secreto al incorporar al catálogo, sin conceder |
| UI-G8-T08 | TODO | QA Capture + Coordinator | T02-T07 | Regresión admin: estados reales, secretos, límites, cierre tras concesión y temporadas; comparación directa Coordinator |
| UI-G9-T01 | TODO | Visual Critic | G3-G8 gates | Cross-screen audit |
| UI-G9-T02 | TODO | Frontend Worker | T01 | Responsive base |
| UI-G9-T03 | TODO | QA Worker | T02 | Regression capture |
| UI-G9-T04 | TODO | Coordinator + Critic | T03 | Gate final |

## Regla de iteración visual

### Ampliación explícita: acceso público

| ID | Estado | Rol principal | Dependencias | Entregable |
| --- | --- | --- | --- | --- |
| UI-A1-T01 | DONE | Coordinator / Frontend Worker | G2 gate | Análisis detallado de login/registro y contrato reusable |
| UI-A1-T02 | DONE | Frontend Worker | A1-T01 | Layout/formulario compartido y adaptación de ambas rutas |
| UI-A1-T03 | DONE | QA Capture | A1-T02 | Capturas desktop/móvil y pruebas funcionales |
| UI-A1-T04 | IN_PROGRESS | Coordinator | A1-T03 | Comparación visual directa, correcciones y gate |

G6 sigue pausado en UI-G6-T03. A1 no autoriza avanzar G6-G9. Auth Hardening se completó como trabajo separado el 2026-09-22; no es una tarea pendiente de A1 ni cierra su gate.

### Ampliación explícita: resto de onboarding

| ID | Estado | Rol principal | Dependencias | Entregable |
| --- | --- | --- | --- | --- |
| UI-A2-T01 | DONE | Frontend Worker | Petición explícita, A1 componentes | Análisis y gaps backend |
| UI-A2-T02 | DONE | Frontend Worker | A2-T01 | Mis equipos con estados reales |
| UI-A2-T03 | DONE | Frontend Worker | A2-T02 | Unirse, solicitar acceso y éxito |
| UI-A2-T04 | IN_PROGRESS | QA Capture | A2-T03 | Capturas/pruebas, regresión auth |
| UI-A2-T05 | TODO | Coordinator | A2-T04 | Comparación visual directa, correcciones y gate |

A1-T04 sigue pendiente de gate; el cambio de foco fue pedido por el usuario, no equivale a su cierre.

Por override del usuario (2026-09-21), el Coordinator asume todas las comparaciones visuales pendientes sin delegar en visual_critic. Screenshot → comparación directa → fix se repite hasta cumplir el gate. Registrar iteración y deltas en `STATUS.md`; los roles históricos de tareas cerradas no cambian.

## Planificación vinculada: imágenes y almacenamiento (Phase 7.10)

**Actualizado el 2026-09-24.** Fuente única del desglose: [MEDIA-PLAN, tareas y dependencias](../MEDIA-PLAN.md#5-tareas-ejecutables-y-condiciones-de-cierre). Este índice no duplica las subtareas ni sus criterios; al ejecutar, actualizar estados allí y resumir aquí y en STATUS en el mismo cambio.

| Bloque | Estado | Entrega |
| --- | --- | --- |
| MEDIA-10A-T00 | DONE | Plan por tareas y conexión con Roadmap |
| MEDIA-10A-T01 | DONE — alcance de uso local | Decisiones acumuladas hasta compresión, cancelación, bloqueo y recuperación del aviso. Ubicaciones y backups aplazados explícitamente |
| MEDIA-10A-T02/T03 | TODO | Inventario, contrato técnico y diseño de datos/API/pruebas. Siguiente: T02.01 |
| MEDIA-10A-T04 | TODO | Almacenamiento privado y persistencia, solo tras solicitar implementación |
| MEDIA-10A-T05/T06/T07 | TODO | Entregas por tipo: logro completo → logos → avatares. Corpus y cargas por etapa; T07.01 ubicaciones APLAZADA |
| MEDIA-10A-T08/T09 | TODO | QA, consumo, evidencia/apuntes y cierre local |
| MEDIA-DEP-T01–T04 | APLAZADAS | Servidor, copias, restauración y despliegue; no bloquean piloto local |
| MEDIA-R2-T01 / MEDIA-EXT-T01 | FUTURAS | Migración R2 e imágenes de propuestas, fuera del bloque local |

**Dependencia separada de jugadores:** [PLAYER-LIFECYCLE-PLAN](../PLAYER-LIFECYCLE-PLAN.md), gap 21. PLAYER-LC-T00 DONE documental; T01–T07 TODO. Diseño de acceso/historial T01 antes de MEDIA-T03.02; archivo/reingreso T03 antes de avatar específico T05.08; eliminación T04 usa media T05.06/T05.08. No absorber sus controles administrativos ni cerrar UI-G8 por añadir avatares.

**Gate de integración:** T07.01 define nuevas pestañas/controles y la excepción de imágenes reales por pantalla/tipo. T08.01 verifica el logro completo antes de ampliar a logos. Banners/fotografía y media de propuestas siguen excluidos. Perfil/alias #27/#28 y temporadas #11 conservan su propio alcance.

**Estado operativo preservado:** current_task UI-A2-T04, gate A1 pendiente y línea G6–G9 pausada en UI-G6-T03. No se ha implementado media, arrancado contenedores ni ejecutado pruebas de aplicación por preparar este plan. Los roles indican responsabilidad futura; no agentes lanzados ni permiso para ejecutar.

## Ejecución vinculada: progreso y secretos (#30 + #29)

### Continuación visual pendiente en tareas existentes

#30/#29 ya incluyen frontend funcional; UI-G8-T05/T06/T07 integrarán esos controles en las
subrutas administrativas definitivas. UI-G8-T08 verificará su conservación junto con catálogo,
detalle y dashboard; no reimplementará el backend ni reabrirá las dos issues por este rediseño.
Contrato y criterios: [PLAN, UI-G8](PLAN.md#ui-g8--team-admin).

La administración visual de temporadas y el selector de históricos se mantienen en
[#11 / Phase 7.9](../Roadmap.md#phase-79--temporadas-por-equipo). Falta concretar su navegación
y diseño dentro de ese alcance antes de implementarlos; no se añade una ruta por inferencia.
Esta actualización documental no reanuda G6–G9 ni cambia `current_task`.

Petición explícita 2026-09-22; alcance y evidencia en [issue-30/PLAN.md](../issue-30/PLAN.md). No sustituye el estado de A1/A2 ni reanuda G6–G9.

| ID | Estado | Rol principal | Dependencias | Entregable |
| --- | --- | --- | --- | --- |
| ISSUE-30-29 | DONE | Coordinator + Backend/Frontend/QA | Reglas y tres decisiones confirmadas | Migración, avance atómico, censura y UI; 103 HTTP, 7 unitarias, builds/lint y revisión visual PASS. [Evidencia](../issue-30/RESULT.md); entrega local, sin despliegue/cierre remoto |

## Regla de cambio compartido

Después de UI-G2-T05, un Screen Worker no puede editar tokens, TeamShell, TeamNavigation ni primitivas compartidas para resolver un problema local. Debe registrar el bloqueo y devolver el cambio al Coordinator.


## Regla de control plane

Los roles de esta tabla se resuelven mediante `docs/ui-workstream/roles/README.md`.

Los workers no actualizan por defecto `TASKS.md`, `STATUS.md` ni `PLAN.md`. Devuelven evidencia al Coordinator, que verifica el gate, marca DONE y mueve `current_task`.

Los roles combinados como `QA + Critic` o `Visual Critic + Shell Worker` indican un encadenamiento de especialistas, no que una misma sesión deba implementar y aprobar su propio trabajo.
