# Adaptive Agent Roles

Estos contratos permiten que una única sesión de entrada actúe como Coordinator y seleccione automáticamente el especialista adecuado. El usuario no tiene que elegir agentes manualmente.

## Punto de entrada

La sesión raíz lee `AGENTS.md`, `STATUS.md`, `TASKS.md` y `PLAN.md`. Esa sesión es el **Coordinator**.

Cuando el entorno soporta subagentes, el Coordinator delega. En Codex, los perfiles específicos del proyecto están en `.codex/agents/*.toml`. En otros entornos, estos contratos siguen siendo la fuente portable.

## Routing

| Rol indicado por TASKS.md / naturaleza de tarea | Contrato | Codex agent |
| --- | --- | --- |
| Coordinator | `COORDINATOR.md` | sesión raíz |
| Shell Frontend Worker / Screen Worker / Admin Screen Worker / Frontend Worker | `FRONTEND_WORKER.md` | `frontend_worker` |
| Backend Fixture Worker | `BACKEND_WORKER.md` | `backend_worker` |
| Visual Lead / Visual Critic / Critic | `VISUAL_CRITIC.md` | `visual_critic` |
| QA Worker / Capture / QA | `QA_CAPTURE.md` | `qa_capture` |

Los aliases del plan no crean agentes nuevos: convergen en estos cuatro especialistas.

## Secuencial por defecto

Delegar no significa paralelizar.

Flujo habitual: `Coordinator → frontend_worker → qa_capture → visual_critic → frontend_worker → ... → Coordinator`.

Solo paralelizar cuando dependencias estén satisfechas, no haya write scope/estado compartido y el gate lo permita. Antes de UI-G2, el trabajo que pueda tocar shell/tokens/shared UI es secuencial.

## Control plane

Solo el Coordinator modifica por defecto `STATUS.md`, `TASKS.md` y `PLAN.md`. Workers devuelven evidencia/handoff; no marcan DONE ni avanzan `current_task`.

## Independencia visual

`visual_critic` nunca puede ser el mismo agente/sesión que implementó la pantalla. Si no existe subagente independiente, el implementador prepara evidencia pero no autoaprueba; la revisión queda como handoff.
