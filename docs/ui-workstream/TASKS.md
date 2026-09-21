# UI Workstream Tasks

Leyenda: TODO · READY · IN_PROGRESS · BLOCKED · DONE

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
| UI-G8-T05 | TODO | Admin Screen Worker | T01 | Logros/asignación |
| UI-G8-T06 | TODO | Admin Screen Worker | T01,G1 API | Solicitudes + detalle |
| UI-G8-T07 | TODO | Admin Screen Worker | T01,G1 proposals | Propuestas + detalle |
| UI-G8-T08 | TODO | QA + Visual Critic | T02-T07 | Convergencia/regresión admin |
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

G6 sigue pausado en UI-G6-T03. A1 no autoriza avanzar G6-G9 ni Auth Hardening.

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

## Regla de cambio compartido

Después de UI-G2-T05, un Screen Worker no puede editar tokens, TeamShell, TeamNavigation ni primitivas compartidas para resolver un problema local. Debe registrar el bloqueo y devolver el cambio al Coordinator.


## Regla de control plane

Los roles de esta tabla se resuelven mediante `docs/ui-workstream/roles/README.md`.

Los workers no actualizan por defecto `TASKS.md`, `STATUS.md` ni `PLAN.md`. Devuelven evidencia al Coordinator, que verifica el gate, marca DONE y mueve `current_task`.

Los roles combinados como `QA + Critic` o `Visual Critic + Shell Worker` indican un encadenamiento de especialistas, no que una misma sesión deba implementar y aprobar su propio trabajo.
