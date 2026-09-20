# UI-G4-T04 — Captura técnica, iteración 1

## Resultado

**PASS técnico con un hallazgo de truncado para revisión visual.** Build correcto, siete capturas deterministas, datos/roles intactos y cero errores de consola, HTTP o red. No se repitieron seed ni POST porque no cambió la lógica.

## Evidencia

- `catalog-player-iteration-1-1440x1024.png`
- `catalog-admin-iteration-1-1440x1024.png`
- `form-player-iteration-1-1440x1024.png`
- `form-admin-iteration-1-1440x1024.png`
- `catalog-player-iteration-1-390x844.png`
- `form-player-iteration-1-390x844.png`
- `dashboard-regression-iteration-1-1440x1024.png`
- `runtime-capture-iteration-1.json`

## Métricas

- Catálogo desktop: 6 columnas de 193.17–193.19 px; mínimo superior a 178 px.
- Catálogo móvil: una columna de 358 px.
- H1 desktop: 43.2 px; H1 móvil: 36 px. Ambos dentro del rango 36–46 px.
- Formularios desktop: 70.4/29.6, compatible con objetivo 69/29.
- Formularios móvil: cuerpo y rail apilados a ancho completo.
- Overflow global: 0 en las siete vistas.
- Footers de las 14 cards: `scrollHeight === clientHeight`, sin clipping.
- Trece títulos de card no tienen overflow. `Aprender y volver a intentarlo` tiene 20 px adicionales bajo `line-clamp-2` y se muestra con elipsis (`APRENDER Y VOLVER A…`). Se entrega como hallazgo al crítico; no se oculta como PASS total de títulos.
- Dashboard regresión: bandas 328/296 px y columnas sin cambios; screenshot idéntico a la iteración aprobada.
- Consola: 0; HTTP `>=400`: 0; fallos de red no cancelados: 0.

## Entorno

Preflight PASS: 7236 MiB disponibles; swap 89 %. Solo se actualizaron `PageHeader.tsx`, `LogroCard.tsx`, catálogo y formulario. DB/backend permanecieron vivos e intactos.

Runtime: `http://100.65.11.85:3000/login`; frontend PID `665035`, sesión `25296`; backend PID `620960`, sesión `88569`; DB `weblogros_ui_review_g3`.
