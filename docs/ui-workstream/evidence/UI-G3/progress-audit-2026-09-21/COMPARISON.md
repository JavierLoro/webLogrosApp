# Comparación del panel de progreso / participación

Fecha: 2026-09-21. Coordinator, petición explícita del usuario. Solo análisis; sin modificaciones de implementación ni cierre/reapertura de gates.

## Evidencia

- Referencia: `apps/frontend/LockerBoard-marca/ReferenciasPaginas/equipos/[slug]/dashboard-desktop-v1.png`, 1536 × 1024.
- Captura actual: `01-dashboard.png`, misma resolución, Halcones, Ana Fernández, estado poblado. Captura guardada y abierta para inspección. Override de viewport restaurado al terminar.
- DOM y estilos computados del panel actual; código `TeamDashboardPanels.tsx`, `TeamParticipationPanel`.
- Las medidas de referencia son aproximaciones visuales; las actuales proceden del DOM. No se afirma pixel diff automatizado.

## Hallazgos

| Área | Referencia | Actual | Evaluación |
| --- | --- | --- | --- |
| Marco | Aproximadamente x194/y153, 492 × 326 px | x198/y155, 487 × 328 px | Muy cercano; no necesita rehacer el grid |
| Superficie | Casi negra, irregular, trazos rojos diagonales, textura desgastada | Azul petróleo uniforme con borde e iluminación interior regulares | Diferencia fuerte de carácter; decoración está excluida del gate funcional vigente |
| Cabecera | Condensada y vertical; primera palabra roja; sin icono ni regla inmediatamente debajo | Anybody 16px/18.4px, peso800; toda crema, icono rojo, divisor inferior | Jerarquía y ritmo distintos |
| Porcentaje | Glifos altos, compactos, gruesos, crema y desgastados; altura visible aproximada105px | Texto configurado96px, caja de línea81.6px; glifos anchos, limpios y menos dominantes | Principal diferencia tipográfica |
| Composición | Porcentaje a izquierda y mensaje manuscrito a derecha | Porcentaje arriba y explicación debajo; mitad derecha vacía | Falta el equilibrio de dos masas |
| Mensaje | «El esfuerzo de hoy es la victoria del mañana», inclinado y subrayado rojo | Explicación factual de dos líneas,14px/20px | Mantener explicación real aunque se reorganice; el lema no es dato backend |
| Barra | Aproximadamente430 × 33px; decenas de segmentos verticales estrechos, con esquinas suaves y relieve | 446 × 12px,20 segmentos anchos e inclinados, gap4px, relleno plano | Demasiado fina y distinta silueta; aproximadamente2.75veces menos alta |
| Tramo pendiente | Segmentos gris oscuro claramente visibles | Últimos3 segmentos computados transparentes | P1 local: impide percibir el total visual |
| Precisión | 58% ilustrativo, no objetivo para datos reales | 83% textual;17/20 segmentos encendidos equivale a85% | Aproximación visual de2puntos; no copiar58% |
| Posición barra | Aproximadamente y326–359 | y368–380 | Está unos42px más abajo pese al marco equivalente |
| Resumen | Cifras altas cercanas30px; etiquetas normales, algunas a dos líneas | Cifras20px; etiquetas11px, uppercase y tracking0.08em | Pie con menor jerarquía y carácter más técnico |
| Color resumen | Blanco,verde,naranja,violeta asociados a estados | Cuatro cifras crema | No asignar colores de estados inexistentes a métricas distintas |
| Separadores | Verticales finos, separaciones abiertas | Verticales y horizontal superior; cuatro columnas iguales | Base correcta, acabado más cuadriculado |
| Semántica | Progreso y estados de logros | Participación de miembros; catálogo/otorgados/conseguidos/puntos | Diferencia funcional deliberada, no bug visual |

## Datos y alcance

83% = round(10/12 ×100). Los cuatro datos son catálogo14, concesiones40, logros distintos conseguidos7 y puntos4280. «Conseguidos» puede confundirse con logros personales o concesiones; conviene aclarar «Logros distintos conseguidos». No son cuatro partes de un mismo total.

El plan UI-G3 excluye progreso parcial, temporadas y retos no aprobados. No reemplazar participación por progreso ni añadir En progreso/Secretos sin definición funcional. Esta auditoría no acredita que falten endpoints: la métrica deseada todavía necesita una definición. El lema y el acabado visual no requieren backend.

## Orden propuesto de corrección

1. Hacer visible el tramo inactivo y aumentar la barra a unos30–33px, con segmentos verticales más numerosos.
2. Ajustar tipografía y proporción del porcentaje y título; conservar marco y grid.
3. Reorganizar porcentaje/mensaje lateral manteniendo explicación accesible de participación.
4. Aumentar cifras inferiores, relajar etiquetas y aclarar «Conseguidos».
5. Refinar superficie/borde dentro de las restricciones actuales de assets; no incorporar fotografía ni alterar tokens globales sin revisar su alcance.

## Límites

Un único estado poblado desktop. No se probaron móvil, zoom, teclado, lector de pantalla ni estados vacío/carga/error. El medidor tiene role=meter, rango0–100, valor83 y descripción10 de12, pero esto no acredita accesibilidad completa. No se midió contraste WCAG. Sin veredicto global nuevo: para fidelidad estricta del componente se recomienda ITERAR, no considerarlo1:1.
