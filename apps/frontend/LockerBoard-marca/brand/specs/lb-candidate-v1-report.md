# LB candidate v1 — informe de comparación

Estado: **aprobado y promovido a master**. La geometría se ha propagado a las cuatro variantes del símbolo y a los cuatro lockups de producción.

## Condiciones

- Lienzo maestro: `512 × 512`.
- Silueta visible centrada: `378 × 426 u`.
- Referencia original recortada a su silueta, escalada proporcionalmente y centrada en un lienzo cuadrado de `92 × 92 px`.
- Candidato rasterizado a `92 × 92 px` sin deformación.

## Resultado medido

| Elemento | Referencia normalizada | Candidato | Resultado |
|---|---|---|---|
| Caja roja L | `x 12…55`, `y 8…63` | `x 12…55`, `y 8…63` | coincidencia exacta |
| Caja clara B | `x 32…79`, `y 24…84` | `x 31…79`, `y 24…83` | diferencia máxima: `1 px` |
| Silueta L | — | — | IoU `1,000` |
| Silueta B | — | — | IoU `0,910` |

La diferencia restante de la B se concentra en el antialias, el brillo de la referencia raster y una corrección óptica máxima de `1 px` en el lateral izquierdo y la base. Está dentro de la tolerancia establecida de `1 px` en rectas y `2 px` en curvas.

## Aplicación aprobada

Este candidato es la única fuente geométrica para mantener:

1. los cuatro símbolos;
2. los cuatro lockups;
3. las futuras aplicaciones cuadradas y tamaños ópticos pequeños.

Los lockups actuales ya contienen esta geometría y quedan sujetos a la misma fuente de verdad.
