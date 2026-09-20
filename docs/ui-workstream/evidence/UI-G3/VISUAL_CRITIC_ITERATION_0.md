# UI-G3-T04 — Visual critic · Iteración 0

## Alcance y evidencia

Auditoría visual independiente del dashboard PLAYER en `1440 × 1024`, comparado con la referencia canónica `dashboard-desktop-v1.png` (`1536 × 1024`) y con el contrato de sustitución funcional de `UI-G3-T01-DASHBOARD-ANALYSIS.md`.

Evidencia inspeccionada a detalle original:

1. `dashboard-player-1440x1024.png` — captura canónica de Ana Fernández / PLAYER.
2. `dashboard-desktop-v1.png` — autoridad visual.
3. `dashboard-team-admin-1440x1024.png` — smoke de geometría y shell por rol.
4. `dashboard-player-mobile-390x844.png` — smoke de reflow y overflow.
5. `REPORT.md` y `runtime-capture.json` — medidas de bandas, viewport y telemetría.

No se penalizan la ausencia de temporada, retos, progreso parcial, próximo objetivo, fotografía o accesos rápidos, ni el contenido pictórico de avatares y logros. Sí se evalúan la geometría de sus sustitutos reales y de los placeholders.

## Resultado resumido

- **P0:** 0.
- **P1:** 2.
- **P2:** 2.
- **Gate:** requiere una iteración de corrección y nueva captura.

La composición ya reconoce correctamente las dos bandas y sus anchos: `38/33/29` y `38/27/35`. El gutter, el inicio del contenido, el fondo, los bordes, los radios y el shell coinciden con el sistema congelado. El problema material está en la escala vertical de la primera banda y en la jerarquía visual del podio.

## Fortalezas confirmadas

1. **Estructura general — saludable.** El contenido comienza en `x ≈ 196 / y ≈ 153`, usa todo el ancho disponible y conserva gaps compactos. No aparece un segundo hero ni un contenedor centrado estrecho.
2. **Shell PLAYER/TEAM_ADMIN — saludable.** Sidebar de 172 px, cabecera de 129 px, identidad, sesión y posición de Administración permanecen pixel-estables frente a UI-G2. El cuerpo mantiene exactamente la misma geometría en ambos roles.
3. **Autoridad funcional — saludable.** Las seis regiones muestran datos reales y sustituyen conceptos futuros sin disfrazarlos. No aparecen temporada, retos, niveles, secretos, progreso ni CTAs indebidos.
4. **Superficies y tipografía — saludable.** Fondo negro azulado, paneles petróleo, borde fino, rojo reservado a acentos y títulos condensados forman una familia coherente con la referencia.
5. **Responsive visible — saludable con límite de evidencia.** A 390 px el shell cambia a navegación móvil, la primera banda pasa a una columna y no existe overflow horizontal. La captura solo muestra la primera región y parte de la segunda; el orden de las seis regiones restantes se apoya en la telemetría de QA, no en evidencia visual dentro de este viewport.

## P1 — Diferencias materiales

### P1-01 — Banda superior 100 px más alta y con densidad interna diluida

- **Elemento:** participación, estadísticas y actividad reciente.
- **Referencia:** primera banda en `y ≈ 153–479`, unos **327 px** de alto; actividad resuelve cinco filas compactas y los dos destacados estadísticos ocupan aproximadamente 90–100 px.
- **Implementación:** primera banda en `y = 153.47–580.86`, **427.39 px** de alto. Las cinco concesiones fuerzan filas de dos líneas y el `flex-1` reparte el exceso; como consecuencia, participación deja un vacío central grande y los destacados de estadísticas crecen hasta cerca de 187 px sin contenido que justifique esa superficie.
- **Diferencia:** +100 px / +31 % respecto a la geometría útil aprobada. Desplaza toda la segunda banda desde `y ≈ 497` a `y ≈ 595` y reduce de forma material la densidad deportiva del dashboard.
- **Corrección esperada:** compactar localmente `RecentAwardsPanel` para que cada concesión ocupe aproximadamente 48–52 px: descripción en una línea truncable con nombre completo preservado de forma accesible, fecha secundaria y sin distribuir artificialmente las filas con `flex-1`. La banda debe quedar aproximadamente en **320–335 px** a 1440, permitiendo que participación y estadísticas recuperen su densidad natural. No modificar tokens, `TeamShell`, `SectionHeader` ni primitivas congeladas.

### P1-02 — El Top 3 no expresa visualmente una jerarquía de podio

- **Elemento:** panel `Top 3` de la segunda banda.
- **Referencia:** título `TOP 3 JUGADORES`; posiciones resueltas con bloques grandes y claramente diferenciados oro/plata/bronce, avatares de mayor presencia y conteo de logros reforzado con icono rojo. La lectura `posición → identidad → puntos → logros` es inmediata.
- **Implementación:** las tres posiciones usan cajas oscuras idénticas de 36 px, avatares pequeños y cifras aisladas. La gran anchura del panel queda visualmente vacía y las posiciones 1, 2 y 3 tienen casi el mismo peso.
- **Diferencia:** se conserva el dato, pero se pierde el rasgo visual principal del módulo y la jerarquía del podio resulta demasiado plana para un panel que ocupa el 35 % de la banda.
- **Corrección esperada:** aplicar estilo local por posición con placas de 44–48 px y tratamientos oro/plata/bronce sobrios, aumentar el avatar a 40–44 px, recuperar el título completo `Top 3 jugadores` y reforzar el conteo con iconografía roja existente. Mantener el `<ol>`, el contenido real y el número variable de filas; no tocar `PlayerAvatar` compartido.

## P2 — Ajustes de precisión

### P2-01 — El indicador dominante pierde el ritmo segmentado de la referencia

- **Elemento:** medidor de participación.
- **Referencia:** una sucesión de segmentos rojos y apagados crea ritmo, textura y una lectura rápida del porcentaje.
- **Implementación:** barra roja continua de 12 px sobre un rail casi imperceptible.
- **Diferencia:** la semántica es correcta, pero el elemento de mayor anchura del panel se lee genérico y no reproduce el lenguaje gráfico del bitmap.
- **Corrección esperada:** conservar `role="meter"` y el porcentaje real, pero representar visualmente el relleno con segmentos regulares y separación oscura. No convertirlo en progreso de catálogo ni inventar estados.

### P2-02 — La segunda banda conserva unos 30 px de altura excedente

- **Elemento:** últimos logros, resumen personal y Top 3.
- **Referencia:** unos **290 px** de alto.
- **Implementación:** **317.48 px**.
- **Diferencia:** +27 px / +9 %. Es menor que el desajuste de la primera banda, pero las cards de logros y las filas del ranking podrían ser algo más compactas.
- **Corrección esperada:** después de resolver P1-02, ajustar paddings y alturas solo dentro de estos paneles para aproximarse a **288–300 px**, preservando media 16:9, dos líneas máximas de título/descripción y objetivos táctiles de los enlaces. No eliminar datos para ganar altura.

## Regresión del shell y variantes

- PLAYER y TEAM_ADMIN comparten exactamente las dos bandas; solo cambia el resumen personal, como exige el contrato.
- Administración permanece en un bloque propio del sidebar TEAM_ADMIN y no altera el cuerpo.
- El shell móvil no presenta recortes ni overflow visible en la evidencia aceptada.
- No se detectan P0 ni regresiones que requieran devolver trabajo al Coordinator o descongelar UI-G2.

## Límites de la auditoría

- Las capturas permiten juzgar composición, jerarquía, densidad, contraste aparente y reflow visible, pero no demuestran por sí solas foco de teclado, lectura por tecnologías de asistencia ni contraste WCAG calculado.
- Loading, error y empty states fueron validados por QA, pero no forman parte de la evidencia visual comparada en esta iteración.
- La tercera banda de la referencia está excluida funcionalmente; el espacio posterior a las dos bandas no se considera una región ausente que deba rellenarse.

VERDICT: ITERATE
