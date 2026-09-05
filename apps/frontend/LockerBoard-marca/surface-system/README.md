# Sistema de superficies

Recursos raster destinados a fondos de logros, ranking, contenedores y datos.

La carpeta `explorations/material-directions/` contiene tres direcciones preliminares:

- A — taquilla metálica: metal perforado, pintura mate, juntas, remaches y ventilación.
- B — archivo deportivo: papel oscuro, tejido, cinta, costuras, clips y bolsillos de etiqueta.
- C — marcador editorial: segmentos, carriles, retícula, halftone y pulsos gráficos.

La dirección seleccionada es **C — marcador editorial**, refinada hacia una ejecución más ligera y sencilla en `explorations/selected-direction/direction-c-editorial-scoreboard-light-v2.png`. Las rutas A y B quedan descartadas para producción.

Cada lámina contiene cuatro muestras: logro, ranking, contenedor normal y datos. No son todavía texturas finales recortadas. Tras elegir una dirección se producirán tiles, overlays transparentes y fondos en varios formatos.

La refinada C contiene seis usos: logro, primer puesto, segundo/tercer puesto, contenedor normal, datos y bloqueado/vacío. Mantiene 80–90% de superficie limpia y un único gesto gráfico por muestra.

## Producción

La biblioteca final está en `final/`:

- `backgrounds/landscape/`: seis PNG opacos de 1600 × 900 px.
- `backgrounds/square/`: seis PNG opacos de 1200 × 1200 px.
- `overlays/landscape/`: seis PNG transparentes de 1600 × 900 px.
- `overlays/square/`: seis PNG transparentes de 1200 × 1200 px.
- `lockerboard-surface-system-preview.jpg`: índice visual de producción.

Los masters se conservan en `source/` como SVG independientes para cada uso, proporción y modalidad —fondo completo u overlay—.

### Usos incluidos

- `achievement`: fondo de logro.
- `rank-first`: primer puesto.
- `rank-second-third`: segundo y tercer puesto.
- `container-default`: contenedor normal.
- `container-data`: datos y métricas.
- `state-locked`: bloqueado o vacío.

Usar los fondos completos cuando el componente no aporte color propio. Usar los overlays transparentes cuando la aplicación necesite conservar su color de superficie o aplicar estados dinámicos.

La comparación está en `explorations/material-directions/lockerboard-material-directions-comparison.jpg`.
