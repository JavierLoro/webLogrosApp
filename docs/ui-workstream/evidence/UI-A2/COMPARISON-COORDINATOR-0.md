# Comparación directa — Coordinator, iteración 0

Fecha: 2026-09-21. Revisión solicitada directamente al Coordinator; no delegada a visual_critic.

Referencia: `acceso-onboarding-desktop-v1.png`, paneles 3–5. Comparada simultáneamente con `teams-desktop.png`, `join-desktop.png` y `request-desktop.png`; después inspección de capturas móviles y parte inferior de equipos.

## Veredicto: necesita ajustes

- P1: cards de equipos demasiado anchas y bajas. Referencia aproximadamente 105×220; captura aproximadamente 392×294. No se comparan píxeles absolutos de la lámina con viewport: la diferencia relevante es la proporción. Mantener slots desktop estrechos aunque Ana tenga solo dos equipos; no fabricar un tercero.
- P1: títulos demasiado anchos y pesados respecto al carácter condensado de la referencia. Reducir escala/peso de Mis equipos y encabezados del alcance. Usar fuentes ya disponibles sin cambiar tokens tenant ni instalar dependencias. La escritura manual de los lemas seguirá siendo una diferencia reconocida si no existe fuente adecuada.
- P1: el lema de invitación ocupa seis líneas enormes en la parte superior. Reducir tamaño/peso y permitir variante de composición inferior para A2 sin alterar el layout aprobado de login/registro.
- P2: franja inferior 2:1 frente a referencia más equilibrada. Ajustar aproximadamente 55:45 y permitir CTA debajo del texto.
- P2: tarjeta de unión móvil excesivamente alta. Compactar sin reducir el área táctil del enlace.
- P2: rojo y superficies más planos/saturados que referencia. No cambiar tokens globales para esta iteración.

## Exclusiones y límites

Fullscreen, split 50/50 y móvil sin lateral son overrides aprobados, no defectos. Fotografía y logos de equipos se excluyen; mantener placeholders y geometría. Métricas, temporada, categoría e identidad global ausentes no justifican datos ficticios. Estado de éxito no capturado: no se aprueba ni se declara defectuoso sin evidencia.

## Siguiente comprobación

Capturar equipos desktop/móvil y formularios A2 tras cambios, comparar proporciones y wraps, verificar regresión de defaults A1. Mantener QA de estados pendientes descrita en BROWSER-QA.md; esta iteración no cierra el gate.
