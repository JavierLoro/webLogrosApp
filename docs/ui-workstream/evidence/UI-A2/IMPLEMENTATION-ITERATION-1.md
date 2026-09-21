# UI-A2 — Implementación visual, iteración 1

## Alcance aplicado

- La cuadrícula de **Mis equipos** reserva cuatro columnas a todo el ancho del contenido en escritorio sin crear equipos ficticios. Las tarjetas mantienen `26rem` de alto y los dos equipos reales más la acción de unirse ocupan tres de los cuatro espacios; el cuarto queda libre de forma natural.
- Cada tarjeta real incorpora una superficie de media geométrica más amplia en escritorio y conserva las iniciales como placeholder; en móvil la superficie baja a `5rem` y las iniciales a `3rem` para no alargar el recorrido. No se añadieron imágenes ni assets.
- La tarjeta para unirse mantiene la misma altura en escritorio, pero baja a una composición compacta de `9rem` en móvil.
- El título principal se normalizó a `32–40px` y peso `700`. Se usan únicamente las familias ya definidas por el proyecto; no se instala ni se simula una tipografía manuscrita o condensada.
- La banda inferior usa una relación aproximada `55/45`. El CTA de solicitud queda debajo del texto cuando el ancho es limitado y vuelve a compartir fila solo en viewport amplio.
- `AuthLayout` expone la variante opcional `asideVariant="lower"`. Esta reduce escala y peso, amplía la caja de texto y sitúa el lema en la zona inferior de los laterales A2. El valor por defecto no cambia, por lo que login y registro conservan su composición A1.
- La variante se aplica a invitación, solicitud y confirmación de solicitud, sin modificar payloads, estados ni navegación.

## Límites respetados

- Sin cambios de backend, contratos de API, datos, tokens globales, paquetes o assets.
- Sin equipos, métricas o mensajes de dominio inventados.
- La diferencia con la tipografía exacta de la referencia queda resuelta mediante escala, peso y composición con las fuentes disponibles, no mediante una afirmación de equivalencia tipográfica.

## Validación

- Lint frontend: correcto.
- TypeScript (`tsc --noEmit`): correcto.
- Inspección visual y aprobación: corresponden al Coordinator; esta implementación no se autoaprueba.
