# Mis equipos — acabado de superficies

Petición explícita del usuario: aplicar el acabado propuesto a `/equipos`, sin cambiar distribución, datos ni comportamiento.

## Criterio visual

Referencia: panel 3 de `acceso-onboarding-desktop-v1.png` (manifest `teams-join-request-onboarding`). Mantener los placeholders: no incorporar fotografía, logos de equipos, banners ni assets reales.

- Superficie carbón mate con iluminación superior suave.
- Borde fino, gris discreto, algo más claro arriba/izquierda; sin halo completo.
- Textura CSS tenue detrás del contenido, sin interceptar interacción.
- Invitación más oscura con borde discontinuo; bloque informativo de la misma familia.
- Hover sin desplazamiento vertical, conservando foco visible y movimiento reducido.
- Clases reutilizables locales al onboarding; no modificar tokens ni shell tenant congelados.

## Validación

- Implementación: `TeamsOverview.tsx` y `onboarding-surfaces.css`, variantes normal, join, info y media. Sin cambios en backend, tokens o geometría.
- TypeScript `--noEmit --incremental false`, ESLint dirigido y whitespace check: PASS.
- Coordinator, distinto del implementer, revisó capturas reales IAB a 1440×1024 y 390×844: acabado tenue, contenido legible, separación de invitación y bloque inferior conservada. Sin defectos materiales nuevos observados en este ajuste acotado.
- Evidencia: `teams-surfaces-desktop.png`, `teams-surfaces-mobile.png`, `teams-surfaces-mobile-bottom.png`.
- Móvil: ancho de contenido 375 px dentro del viewport 390 px (barra vertical); sin overflow horizontal. Vista normal restaurada y sesión conservada.
- No se ejecutó build completo ni se reprodujeron estados funcionales alternativos. Este ajuste no cierra UI-A2-T04/T05 ni sus pendientes.
