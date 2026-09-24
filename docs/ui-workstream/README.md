# LockerBoard UI Visual Convergence Workstream

Este directorio es la fuente operativa del rediseño visual de LockerBoard. Permite retomar el trabajo desde CLI, Work, Codex u otra sesión sin depender del historial de conversación.

Estado conciliado al 2026-09-22: G0–G5 cerrados; jugadores implementado con continuación pausada en G6-T03; acceso/onboarding en revisión, foco A2-T04 y gate A1-T04 pendiente. G7–G9 pendientes. Confirmar siempre el punto de continuación en STATUS. Por override del usuario del 2026-09-21, las comparaciones pendientes se realizan directamente por Coordinator; las referencias al crítico independiente más abajo describen el flujo estándar anterior.

## Orden de lectura

1. `AGENTS.md`
2. `docs/ui-workstream/STATUS.md`
3. `docs/ui-workstream/TASKS.md`
4. `docs/ui-workstream/PLAN.md`
5. `docs/ui-reference/manifest.json`
6. README de la ruta bajo `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`
7. `.agents/skills/image-to-code/SKILL.md`
8. `docs/ui-workstream/roles/README.md` para routing/delegación
9. `docs/ui-workstream/AGENT_CONTRACT.md` para reglas multi-agente/gates

## Fuentes de verdad

En caso de contradicción:

1. `STATUS.md` indica dónde continuar.
2. `TASKS.md` define el contrato de la tarea activa.
3. `PLAN.md` define dependencias, gates y alcance.
4. `docs/ui-reference/manifest.json` indexa las referencias vigentes.
5. Las imágenes canónicas viven en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`.
6. `Architecture.md`, `Roadmap.md` y `Decisions` mandan sobre comportamiento y alcance funcional.

La imagen es la fuente de composición/estilo. No es una autorización para implementar cualquier feature futura que aparezca dibujada.

## Estado de referencias

El nuevo `main` ya incluye el inventario de referencias. Para el alcance inicial hay referencias de escritorio suficientes para dashboard, catálogo, ranking, jugadores, solicitudes/propuestas y administración del equipo, además de detalles administrativos y formularios.

No duplicar esos PNG bajo `docs/ui-reference/`. Ese directorio solo mantiene el índice machine-readable.

La landing está aplazada y queda fuera del workstream actual.

## Alcance de la primera pasada

Orden previsto:

1. shell y navegación común;
2. dashboard;
3. catálogo de logros + creación/propuesta según rol;
4. ranking;
5. jugadores;
6. solicitudes de obtención + propuestas personales;
7. administración del equipo y sus subrutas acordadas;
8. pasada de consistencia.

No se integran todavía imágenes reales de logros, avatares, banners ni fotografía decorativa. Sí se implementan sus dimensiones, relación de aspecto y espacio visual mediante placeholders.

El [plan de Phase 7.10](../MEDIA-PLAN.md#5-tareas-ejecutables-y-condiciones-de-cierre), consolidado el 2026-09-24 y enlazado en Roadmap, separa decisiones ya acordadas de diseño/implementación pendientes. Su T07.01 definirá controles y excepción de media por pantalla antes de sustituir placeholders; no cambia el foco/gates actuales. [Archivo y eliminación de jugadores](../PLAYER-LIFECYCLE-PLAN.md) tiene tareas propias, con conservación/reingreso como dependencia de avatares específicos.

## Punto de entrada adaptativo

El usuario puede iniciar cualquier sesión con el único prompt de `RESUME_PROMPT.md`.

La sesión raíz actúa como Coordinator, resuelve `current_task` y selecciona automáticamente el rol adecuado. En Codex usa los perfiles de `.codex/agents/`; en otros entornos usa los contratos portables de `docs/ui-workstream/roles/`.

Delegar no implica paralelizar. El flujo es secuencial por defecto y el Coordinator conserva el control de `STATUS.md`, `TASKS.md` y `PLAN.md`.

## Regla de reanudación

Nunca empezar una tarea nueva por intuición. Leer `STATUS.md`, localizar `current_task` y ejecutar solo esa tarea y sus dependencias pendientes.

Al terminar:

- marcar la tarea en `TASKS.md`;
- registrar validaciones y decisiones;
- mover `current_task` en `STATUS.md`;
- dejar `next_action` suficientemente concreta para otra sesión sin contexto.

## Flujo visual estándar

reference → analysis → implementation → deterministic screenshot → visual critic → prioritized deltas → fix → repeat → gate

La comparación de píxeles es diagnóstico, no un porcentaje automático de aprobación.

## Perfil de modelos

Astra Low es el perfil por defecto para coordinación, implementación, captura y crítica visual. El crítico debe ser un agente o sesión distinta del implementador, aunque ambos usen Astra Low.

No escalar a modelos high de forma preventiva. Si una tarea queda realmente bloqueada, documentar el motivo en `STATUS.md`.
