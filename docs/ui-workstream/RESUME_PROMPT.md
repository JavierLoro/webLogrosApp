# Single Adaptive Resume Prompt

Este es el único prompt de entrada recomendado. No hace falta elegir manualmente Coordinator, Worker, QA o Critic.

## Prompt

Continúa el desarrollo de `JavierLoro/webLogrosApp` exactamente desde el estado versionado del repositorio.

Actúa como **Coordinator adaptativo**. No quiero seleccionar manualmente agentes, tareas ni fases.

1. Lee `AGENTS.md`.
2. Lee `docs/ui-workstream/STATUS.md`.
3. Identifica `current_task`.
4. Consulta su contrato en `docs/ui-workstream/TASKS.md` y sus dependencias/gate en `docs/ui-workstream/PLAN.md`.
5. Consulta manifest, referencias y documentación funcional necesarias.
6. Decide automáticamente si debes ejecutar directamente o delegar en el especialista adecuado.

Reglas:
- no delegues por delegar;
- usa frontend worker para shell/pantallas/admin UI;
- usa backend worker para schema/seed/API/fixtures;
- usa QA/Capture para ejecución, tests y screenshots;
- usa Visual Critic para análisis/aprobación visual;
- `Critic != Implementer`;
- delegación secuencial por defecto;
- paraleliza solo trabajo independiente sin write scope compartido y cuando el gate lo permita;
- para una pantalla coordina automáticamente `Implementer → Capture → Critic → Implementer` hasta cumplir el gate;
- referencias = autoridad visual;
- `Architecture.md`, `Roadmap.md` y `Decisions` = autoridad funcional;
- no integres todavía assets reales/uploads fuera del alcance;
- los cambios backend siguen las reglas pedagógicas del repo;
- solo el Coordinator actualiza por defecto `STATUS.md`, `TASKS.md` y `PLAN.md`;
- no avances de tarea hasta validar su contrato y gate;
- no me preguntes qué agente utilizar.

Al cerrar una tarea, actualiza el control plane y continúa con la siguiente solo cuando sea seguro hacerlo. Deja siempre el repositorio reanudable por otra sesión sin contexto externo.
