# UI Workstream Status

workstream: ACTIVE
orchestration: ADAPTIVE_ROUTER_READY
current_phase: UI-G0
current_task: UI-G0-T04
current_iteration: 0
last_completed: reconciliación con main 372244b; inventario y manifest de referencias desktop del lote inicial
next_action: analizar las referencias canónicas y crear docs/ui-workstream/VISUAL_SYSTEM.md con tokens, shell, spacing, tipografía, superficies, patrones y elementos visuales no funcionalmente aprobados

## Decisiones vigentes

- El usuario usa un único prompt de entrada; la sesión raíz actúa como Coordinator adaptativo.
- El Coordinator selecciona automáticamente frontend_worker, backend_worker, qa_capture o visual_critic según TASKS/PLAN.
- Delegación secuencial por defecto; paralelismo solo para trabajo independiente y permitido por el gate.
- Solo el Coordinator modifica por defecto STATUS/TASKS/PLAN.
- Astra Low es el perfil lógico por defecto cuando el entorno lo ofrezca; los perfiles Codex heredan la configuración del Coordinator en lugar de fijar un model ID.
- Critic != Implementer.
- Las imágenes canónicas viven en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`.
- `docs/ui-reference/manifest.json` es un índice; no se duplican PNG.
- Referencias = autoridad visual. Architecture/Roadmap/Decisions = autoridad funcional.
- El shell común se completa y congela antes de paralelizar pantallas.
- No se integran todavía achievement images, avatars, banners ni fotografía decorativa.
- Esas zonas conservan geometría mediante placeholders y pueden declararse ignoredRegions.
- Se prefiere seed/backend real a arrays de dominio hardcodeados.
- Pixel diff sirve para localizar diferencias; no existe un porcentaje automático de aprobación.
- El primer fixture visual será Halcones.
- Phase 7.7 convierte propuestas de nuevos logros en requisito real del workstream.
- Aprobar una propuesta la incorpora al catálogo; no concede el logro ni crea solicitud de obtención.
- Landing queda aplazada.
- Las 7 subrutas administrativas acordadas se implementan en UI-G8.
- Features futuras dibujadas en mockups no entran automáticamente en alcance.

## Estado conocido del repositorio

- Seed actual: 2 equipos, 4 usuarios, 11 logros y 7 asignaciones.
- No hay `displayName` en User.
- No hay todavía modelo de propuestas.
- Ranking y jugadores siguen sin el read slice necesario.
- Solicitudes de obtención y panel admin base sí existen.
- Las subrutas admin acordadas todavía no existen en `src/app`.
- Las referencias desktop del lote inicial sí están versionadas.
- `detalles-solicitud-logro-v1.png` existe; el inventario anterior tenía texto contradictorio y se corrige en esta PR.
- Assets de marca/surface system fueron reorganizados bajo `LockerBoard-marca/otros/`.

## Bloqueos actuales

Ninguno para UI-G0-T04.

## Última validación

- capa de orquestación adaptativa versionada: contratos portables en `docs/ui-workstream/roles/` y perfiles Codex en `.codex/agents/`;
- TOML de los cuatro agentes validado sintácticamente;
- `visual_critic` configurado read-only y separado del implementador;
- `current_task` permanece en UI-G0-T04; este cambio no salta ninguna tarea del workstream;
- rama sincronizada mediante merge con main `372244b0978c86d83b654d0ddec937e905af6d55`;
- manifest reconciliado con las rutas reales;
- propuesta de logros reconciliada con Phase 7.7;
- no se ha modificado lógica de frontend/backend/schema/seed.

## Protocolo de cierre de tarea

Al terminar la tarea actual, actualizar en el mismo cambio:

1. `TASKS.md`: estado DONE.
2. `STATUS.md`: resultado, validaciones y decisiones.
3. `STATUS.md`: `current_task` = siguiente tarea READY.
4. artefactos propios de la tarea.
5. si hubo código, comandos ejecutados y resultado.

## Handoff mínimo

Otra sesión debe poder continuar leyendo:

- `AGENTS.md`
- este archivo
- `TASKS.md`
- `PLAN.md`
- `docs/ui-reference/manifest.json`

No depender de memoria de chat.
