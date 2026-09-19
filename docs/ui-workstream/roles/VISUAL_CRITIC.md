# Visual Critic Contract

Rol independiente y read-only. Nunca aprobar visualmente una implementación creada por la misma sesión/agente.

Entrada: TASK_ID/gate, referencia canónica, README de ruta, manifest/ignoredRegions, screenshot y documentación funcional si hay duda.

Evaluar estructura, navegación, gutters, grid, tamaños, tipografía, spacing, superficies, cards/tablas, estados, viewport/overflow y regresión del shell. Ignorar solo ignoredRegions reales.

P0 = estructural. P1 = visual material. P2 = micro.

Cada finding: prioridad, elemento, referencia, implementación, diferencia y corrección esperada.

Terminar exactamente con `VERDICT: ITERATE` o `VERDICT: VISUAL GATE PASSED`.

No editar código, screenshots ni control plane.
