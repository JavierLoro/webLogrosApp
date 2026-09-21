# UI-A1 — Visual Critic · Iteración 0

## Alcance y autoridad

- Referencia canónica: `apps/frontend/LockerBoard-marca/ReferenciasPaginas/_compartidas/acceso-onboarding-desktop-v1.png` (`1536 × 1024`).
- Regiones comparadas: interiores de los paneles `1. LOGIN` y `2. REGISTRO`, aproximadamente `476 × 431 px` cada uno.
- Evidencia principal:
  - `login-desktop.png` y `register-desktop.png` (`1440 × 1024`).
  - `login-mobile.png` y `register-mobile.png` (`390 × 844`).
  - `login-tablet.png` y `register-tablet.png` (`768 × 1024`).
- Estados complementarios:
  - `login-error-tablet.png`.
  - `register-error-mobile.png`.
- Contratos consultados: `PLAN.md`, `TASKS.md`, `manifest.json`, `ANALYSIS.md`, `IMPLEMENTATION.md` y `BROWSER-QA.md`.

Se excluyen correctamente el marco editorial, los paneles 3–6 y el contenido fotográfico lateral. No se penalizan el logo LockerBoard disponible, el placeholder CSS, la ausencia de Nombre/OAuth/recordar/recuperar/legal ni el toggle textual Mostrar/Ocultar. Sí se evalúan división, proporción, títulos, formularios, spacing, densidad y responsive.

## Normalización

La lámina no representa un viewport único de producto. La comparación desktop normaliza cada interior de referencia (`~476 × 431`) al frame implementado de `960 × 800 CSS px`, dentro de un viewport `1440 × 1024`, densidad 1:1. La escala aproximada es `2.02×` horizontal y `1.86×` vertical; por ello se juzgan relaciones y jerarquía, no coordenadas absolutas de la lámina completa.

Tablet y móvil no tienen referencia canónica propia. Se evalúan como inferencia responsive del mismo sistema: 50/50 en 768 px, una columna en 390 px, controles de al menos 44 px, gutter íntegro y cero overflow.

## Veredicto ejecutivo

La implementación acierta en la estructura central: frame `960 × 800`, división 50/50, superficie oscura, borde/radio, CTA rojo, campos de 48 px y adaptación móvil del registro. Login y registro forman una familia coherente y las exclusiones funcionales no dejan controles falsos.

Queda un P1 visual: los titulares del lateral están anclados al fondo y aparecen demasiado abajo, especialmente en registro. Esta decisión invierte la relación de la referencia: el titular corto de registro cae todavía más bajo que el de login, concentra todo el peso en la mitad inferior y deja demasiado vacío entre logo y mensaje. También queda un P2 por el H1 de login en dos líneas en desktop/tablet.

Además, dos archivos de evidencia son inválidos: `login-mobile.png` y `register-error-mobile.png` muestran un lienzo claro casi completo, no la aplicación. `BROWSER-QA.md` acredita medidas y comportamiento, pero una captura inválida no permite aprobar visualmente login móvil ni el error de registro. Este es un bloqueo de evidencia, no un P0 atribuido al producto.

**Resultado:** 0 P0 de implementación · 1 P1 · 1 P2 · 1 bloqueo de evidencia.

## Hallazgos

### P1-01 — Los titulares laterales están materialmente demasiado bajos

**Elemento:** bloque `asideTitle` + subrayado + `asideCopy` en login y registro desktop/tablet.

**Referencia:** tras normalizar, el titular lateral comienza aproximadamente a `140–205 px` del borde superior del panel. El registro sitúa `ÚNETE A LA COMUNIDAD` más arriba que el mensaje de login, dejando la zona inferior para el peso pictórico.

**Implementación:** el titular comienza aproximadamente a `326 px` en login y `393 px` en registro dentro de un panel desktop de 800 px. El bloque usa una alineación al fondo; como el titular de registro tiene una línea menos, su comienzo cae aún más abajo.

**Diferencia:** se pierde el ritmo superior→mensaje→media de la referencia. La mitad superior queda casi vacía y el lateral se vuelve bottom-heavy. La fotografía está excluida, pero el título y su posición no lo están.

**Corrección esperada:** en `AuthLayout`, sustituir el anclaje inferior del bloque de mensaje por una posición vertical estable independiente de su número de líneas. Objetivo desktop: comienzo aproximado a `150–210 px` del borde superior del lateral, preservando logo arriba y metadata abajo; en tablet, escalar esa relación sin acercar el titular al borde. Mantener la división 50/50, el placeholder CSS y el mismo componente reusable.

### P2-01 — `Bienvenido de nuevo` rompe en dos líneas en desktop y tablet

**Elemento:** H1 del formulario de login.

**Referencia:** el título aparece en una sola línea dentro de una columna proporcionalmente equivalente.

**Implementación:** el H1 ocupa dos líneas y `BROWSER-QA.md` mide `73.44 px` de alto en desktop. Registro permanece en una sola línea.

**Diferencia:** login adquiere una jerarquía más pesada y una densidad distinta de registro, aunque ambos deben compartir patrón.

**Corrección esperada:** permitir una sola línea desde tablet/desktop mediante una escala máxima algo menor o un ancho útil ligeramente mayor, conservando el peso display. Una solución local sería limitar el H1 a ~32 px en desktop/tablet; móvil puede envolver cuando lo necesite.

## Bloqueo de evidencia

### Capturas móvil/error inválidas

- `login-mobile.png` (`390 × 844`, 4 KB) no contiene logo, título, formulario ni superficies: solo un lienzo claro con una franja oscura lateral.
- `register-error-mobile.png` (`375 × 899`, 4 KB) presenta el mismo fallo y tampoco muestra la alerta.
- Las capturas válidas de registro móvil y ambas tablet demuestran que el patrón existe, pero no sustituyen los estados ausentes.

**Acción requerida:** recapturar login móvil vacío y registro móvil con error a viewport estable, esperar pintura/fuentes y abrir los PNG resultantes antes de entregarlos. Si vuelven a salir blancos, diagnosticar el mecanismo de captura; no modificar la UI basándose solo en este artefacto.

## Superficies de fidelidad

### Tipografía

- Buena separación entre display y body; pesos y contraste encajan con LockerBoard.
- Titulares laterales conservan contundencia, aunque su colocación requiere el P1 anterior.
- H1 de login requiere el ajuste P2 para igualar el patrón de registro.
- Texto secundario, labels y controles permanecen legibles; no se observa truncado en evidencia válida.

### Spacing y layout

- Desktop: frame centrado `960 × 800`, dos columnas iguales y paddings de formulario cercanos a la normalización aprobada.
- Tablet: 50/50 estable, controles sin compresión y gutters suficientes.
- Registro móvil: apilado correcto, lateral corto arriba y formulario completo abajo, sin overflow visible.
- El problema material se concentra en el eje vertical del titular lateral, no en el frame ni en los formularios.

### Colores y superficies

- Negro azulado, petróleo, borde frío y rojo único reproducen la referencia y los tokens del producto.
- El gradiente/superficie del formulario separa niveles sin glow ni glassmorphism excesivo.
- Alertas rojas visibles en tablet mantienen contraste y no deforman el frame.

### Media y assets

- La fotografía lateral está excluida explícitamente; el placeholder CSS conserva la mitad del frame, contraste y peso cromático.
- El logo horizontal LockerBoard disponible es una sustitución aprobada, no un mismatch.
- No se han introducido assets, SVGs o iconos falsos para imitar la foto.

### Copy y comportamiento visible

- Títulos, subtítulos, labels, CTA y cambio de ruta son coherentes con el contrato.
- Omisiones de Nombre, OAuth, recordar, recuperar y legal son intencionales y correctas.
- Mostrar/Ocultar textual mantiene affordance clara y objetivos táctiles adecuados.

## Responsive y accesibilidad visible

- Registro móvil conserva 12 px de gutter exterior, controles de 48 px y CTA ancho.
- Tablet preserva la división y no muestra colisión o clipping.
- Labels, estados de error y enlaces tienen contraste suficiente en las capturas válidas.
- Foco, teclado, nombres accesibles y comportamiento del toggle pertenecen a la evidencia funcional de QA; los PNG no prueban conformidad completa.

## Gate

El P1 de composición lateral exige una iteración visual. El P2 puede resolverse en el mismo cambio. Aunque esos deltas se corrigieran, el gate necesita dos recapturas móviles válidas antes de poder aprobarse.

VERDICT: ITERATE
