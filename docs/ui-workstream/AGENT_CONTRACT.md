# Agent Contract — UI Visual Workstream

## Perfiles

### Coordinator — Astra Low
Responsable de dependencias, alcance, TASKS.md y STATUS.md.

### Visual Lead / Critic — Astra Low con visión
Analiza las referencias canónicas y screenshots. Durante la revisión es read-only respecto a la implementación que evalúa. Devuelve deltas priorizados, no un rediseño alternativo.

### Backend Fixture Worker — Astra Low
Trabaja seed, schema mínimo, propuestas y read APIs. Debe cumplir AGENTS.md, progressive-tutor, learning-comments y docs/apuntes.md.

### Shell Frontend Worker — Astra Low
Propietario inicial de tokens, navegación y primitivas compartidas. Usa image-to-code.

### Screen Worker — Astra Low
Trabaja una ruta delimitada y reutiliza el shell congelado.

### Capture / QA Worker — Astra Low
Arranca el fixture acordado, captura screenshots deterministas y ejecuta validaciones.

## Separación obligatoria

Critic != Implementer.

Un agente no puede cerrar visualmente su propia implementación. Si el entorno solo permite un modelo, usar otra sesión/agente con contexto limpio para la crítica.

## Autoridad visual vs funcional

- Referencias en `LockerBoard-marca/ReferenciasPaginas/`: composición, jerarquía, densidad, estilo y geometría.
- `Architecture.md`, `Roadmap.md`, `Decisions`: permisos, estados, rutas, flujos y funcionalidad.
- Si un mockup muestra una idea futura no aprobada, no se implementa por defecto.
- Si el mockup contiene texto o CTA funcionalmente incorrecto, conservar la geometría pero corregir semántica según documentación.

## Delta report

P0 — estructural:
- jerarquía/layout incorrectos;
- bloques ausentes;
- navegación/viewport rotos;
- proporciones generales claramente distintas.

P1 — visual material:
- spacing, tamaños, tipografía, alineación, superficies o densidad perceptiblemente distintas.

P2 — micro:
- detalles pequeños que no cambian la lectura general.

Cada delta indica elemento, diferencia observable, corrección esperada y referencia.

No usar “hazlo más bonito” o “acércalo más”.

## Assets

En esta pasada:
- no integrar imágenes finales de logros;
- no integrar fotos/avatar reales;
- no integrar banners;
- no implementar storage/upload real.

Sí:
- reservar espacio correcto;
- respetar aspect ratio;
- usar placeholders consistentes;
- excluir solo esas regiones cuando manifest las marque.

## Concurrencia

Antes de UI-G2 gate:
- trabajo secuencial sobre shell;
- un solo propietario para tokens/componentes comunes.

Después:
- pantallas pueden paralelizarse;
- cada worker toca su ruta/componentes específicos;
- cambios shared vuelven al Coordinator.

## Escalado

Astra Low por defecto. Escalar solo cuando:
1. la tarea esté realmente bloqueada;
2. se registren intentos/bloqueo;
3. el Coordinator limite el escalado a esa tarea.

## Gate de pantalla

DONE cuando:
- no hay P0;
- no hay P1 material;
- ignoredRegions coinciden con manifest;
- shell/nav no regresan;
- no hay overflow;
- datos de dominio vienen del fixture real;
- lint/build aplicables pasan;
- solo quedan P2 de bajo impacto.
