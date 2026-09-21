# Iteración 1 — comprobación del Coordinator

2026-09-21. Cambios autorizados tras comparación directa, sin agente crítico.

## Resultado de la pasada

- Equipos desktop: cuatro columnas a ancho completo; tarjetas visibles aproximadamente 291×416 frente a 392×294 anteriores. Dos equipos reales y enlace de unión; cuarto espacio libre, sin inventar datos. Se corrigió un primer intento demasiado estrecho antes de guardar la captura definitiva.
- H1 reducido de 60/900 a máximo 40/700; nombres de equipo y lema inferior con menor peso visual.
- Banda inferior 55/45, alineada con el ancho del contenido.
- Móvil: media 80 px, tarjetas alrededor de 288 px y unión compacta. Se corrigió un aumento inicial de altura. Capturas superior e inferior verificadas.
- Invitación y solicitud: variante inferior con lema más pequeño, cuatro y tres líneas respectivamente en 1440×1024. Los defaults A1 y formularios no cambian.
- Ancho documento no supera viewport en equipos: desktop 1440/1440; móvil 375/390 con barra vertical.
- ESLint dirigido, TypeScript y diff-check PASS según IMPLEMENTATION-ITERATION-1.md. No se repitió build completo en esta pasada de clases/prop; el anterior sigue registrado como evidencia histórica, no nueva.

## Capturas vigentes

`teams-desktop-iteration-1.png`, `teams-mobile-iteration-1.png`, `teams-mobile-bottom-iteration-1.png`, `join-desktop-iteration-1.png`, `request-desktop-iteration-1.png`.

## Límites

Mejora de geometría y jerarquía comprobada; no equivalencia 1:1. Sigue pendiente tipografía condensada/manuscrita exacta, acabado de superficies y pruebas de estados descritas en BROWSER-QA.md. No se añadieron fuentes, fotografías ni backend. Éxito sigue sin captura real. Gate no cerrado. Navegador devuelto a equipos con tamaño normal y sesión conservada.
