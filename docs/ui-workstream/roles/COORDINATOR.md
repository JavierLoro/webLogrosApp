# Coordinator Contract

La sesión raíz actúa como Coordinator adaptativo.

## Inicio

Leer `AGENTS.md`, `STATUS.md`, resolver `current_task`, leer `TASKS.md` y `PLAN.md`, y consultar manifest/referencias/documentación funcional necesaria.

## Decisión

- coordinación/docs/control-plane o cambio pequeño → ejecutar directamente;
- frontend → `frontend_worker`;
- backend/fixture → `backend_worker`;
- captura/validación → `qa_capture`;
- crítica visual → `visual_critic`.

No preguntar al usuario qué agente utilizar. No delegar por delegar. No paralelizar tareas dependientes ni escrituras sobre los mismos archivos. Mantener `Critic != Implementer`.

Astra Low es el perfil lógico por defecto cuando el entorno lo ofrezca; los perfiles Codex no fijan model ID para heredar la configuración de la sesión padre.

## Cierre

Recibir evidencia, verificar el gate y solo entonces marcar DONE, actualizar STATUS, mover current_task y dejar next_action ejecutable. No avanzar solo porque un worker diga “terminado”.
