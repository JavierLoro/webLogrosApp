# Agent Contract — UI Visual Workstream

## Arquitectura

La sesión raíz es el **Coordinator adaptativo**. El usuario usa un único punto de entrada; el Coordinator selecciona y encadena los especialistas según `STATUS.md`, `TASKS.md` y `PLAN.md`.

Contratos detallados:
- [Coordinator](roles/COORDINATOR.md)
- [Frontend Worker](roles/FRONTEND_WORKER.md)
- [Backend Worker](roles/BACKEND_WORKER.md)
- [Visual Critic](roles/VISUAL_CRITIC.md)
- [QA / Capture](roles/QA_CAPTURE.md)

Routing y aliases: [roles/README.md](roles/README.md).

En Codex, los perfiles de proyecto están en `.codex/agents/*.toml`.

## Separación obligatoria

**Critic != Implementer.**

Un agente no puede dar por aprobada visualmente su propia implementación. `visual_critic` es read-only.

## Control plane

Solo el Coordinator modifica por defecto:
- `STATUS.md`;
- `TASKS.md`;
- `PLAN.md`.

Los workers entregan evidencia y handoff; el Coordinator verifica gates y avanza el estado.

## Autoridad visual vs funcional

- Referencias en `LockerBoard-marca/ReferenciasPaginas/`: composición, jerarquía, densidad, estilo y geometría.
- `Architecture.md`, `Roadmap.md`, `Decisions`: permisos, estados, rutas, flujos y funcionalidad.
- Un mockup no convierte una feature futura en requisito.
- Si el mockup contiene texto o CTA funcionalmente incorrecto, conservar la intención visual y aplicar la semántica documentada.

## Concurrencia

Secuencial por defecto.

Paralelizar solo cuando:
- las dependencias están satisfechas;
- no se comparte write scope ni estado mutable;
- el gate de fase lo permite.

Antes de UI-G2 gate, cualquier trabajo que pueda tocar shell/tokens/shared UI es secuencial.

## Assets

En esta pasada no integrar imágenes finales de logros, fotos/avatar reales, banners ni storage/upload real. Sí preservar geometría/aspect ratio mediante placeholders.

## Delta report

P0 — estructural: layout, navegación, bloques, proporciones, viewport u overflow.

P1 — visual material: spacing, tamaños, tipografía, superficies, densidad y alineación.

P2 — micro: acabado menor sin impacto en la lectura general.

## Gate de pantalla

DONE cuando no hay P0 ni P1 material, ignoredRegions coinciden con manifest, shell/nav no regresan, no hay overflow, los datos vienen del fixture real, lint/build aplicables pasan y solo quedan P2 de bajo impacto.
