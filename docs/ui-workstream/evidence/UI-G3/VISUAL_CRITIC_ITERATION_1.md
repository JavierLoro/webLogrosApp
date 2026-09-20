# UI-G3-T04 — Visual critic · Iteración 1

## Alcance y evidencia

Revisión visual independiente de la primera corrección del dashboard, usando:

1. `dashboard-player-iteration-1-1440x1024.png` como captura canónica.
2. `dashboard-desktop-v1.png` como autoridad visual.
3. `dashboard-team-admin-iteration-1-1440x1024.png` como smoke de rol y shell.
4. `dashboard-player-mobile-iteration-1-390x844.png` como smoke responsive.
5. `REPORT-ITERATION-1.md` y `runtime-capture-iteration-1.json` únicamente para medidas y overflow que no pueden confirmarse por inspección del bitmap.

Se mantiene la autoridad funcional: no se penaliza la exclusión de temporada, retos, progreso, próximo objetivo, accesos rápidos o media real.

## Resultado resumido

- **P0:** 0.
- **P1:** 1 residual.
- **P2:** 1.
- **Gate:** todavía no se cierra; requiere una corrección local mínima y nueva medición/captura.

Los dos P1 de la iteración 0 están resueltos visualmente. El único P1 actual no es un regreso de composición, sino un exceso interno de 14 px dentro del panel de participación provocado por la nueva altura fija. El PNG no muestra texto cortado, pero `overflow-hidden` y `scrollHeight > clientHeight` impiden considerar robusta la corrección.

## Deltas de la iteración 0

### P1-01 anterior — Resuelto en composición, pendiente de robustez interna

- La banda superior pasa de **427.39 px** a **328 px**, dentro del objetivo de 320–335 px y prácticamente igual a los ~327 px de la referencia.
- La segunda banda comienza en `y ≈ 496`, frente a `y ≈ 497` en la referencia.
- Actividad reciente contiene cinco filas de 48 px; estadísticas recupera destacados compactos y participación elimina el gran vacío central.
- No se observan colisiones ni recortes en actividad o estadísticas.
- Queda el P1 nuevo documentado abajo en participación.

### P1-02 anterior — Resuelto

- El título completo `Top 3 jugadores` recupera la jerarquía del módulo.
- Las placas de 48 px diferencian oro, plata y bronce con contraste sobrio.
- Avatares de 40 px y trofeo rojo devuelven la secuencia visual `posición → identidad → puntos → logros`.
- Las tres filas de 64 px caben completas dentro del panel y mantienen el dato real.

### P2-01 anterior — Resuelto

- El medidor conserva semántica de participación y ahora usa 20 segmentos con estados activos/apagados.
- El patrón reproduce el ritmo gráfico de la referencia sin convertirlo en progreso de catálogo.

### P2-02 anterior — Resuelto

- La segunda banda baja de **317.48 px** a **296 px**, dentro del objetivo de 288–300 px.
- Las tres cards, el resumen y el ranking conservan sus datos, media y separaciones sin clipping visible.

## P1 — Diferencia material residual

### P1-03 — Participación conserva 14 px de overflow vertical oculto

- **Elemento:** panel `Participación del equipo` en desktop PLAYER y TEAM_ADMIN.
- **Referencia/contrato:** contenido completamente contenido en la banda de ~327 px, sin scroll ni recorte interno.
- **Implementación:** panel visible de 326 px de alto interior con `scrollHeight = 340 px`; el contenedor usa `overflow-hidden`.
- **Evidencia:** no hay descendientes cuyo rectángulo rebase el panel y la captura muestra las cuatro cifras y sus labels, pero QA no confirma ausencia estricta de overflow interno. La diferencia puede manifestarse con otro render de fuente, zoom o texto localizado más alto.
- **Diferencia:** la geometría exterior ya converge, pero se ha conseguido mediante una altura fija menor que el contenido real. Ocultar el exceso no equivale a resolverlo.
- **Corrección esperada:** recuperar al menos 14 px dentro del panel reduciendo de forma local los márgenes verticales entre métrica, helper, segmentos y resumen, o el padding vertical del resumen. Mantener la banda en 320–335 px, el tamaño dominante de `83 %`, los cuatro KPI y la semántica del meter. No eliminar contenido ni tocar `TeamSurface`, tokens o shell. Repetir la medición hasta `scrollHeight <= clientHeight` en PLAYER y TEAM_ADMIN.

## P2 — Ajuste no bloqueante

### P2-03 — La actividad truncada pierde parte del logro visible

- **Elemento:** cinco filas de `Actividad reciente`.
- **Referencia:** la frase principal deja identificar jugador y logro de un vistazo.
- **Implementación:** los nombres reales largos hacen que varias filas terminen en `consiguió T…`, `consiguió C…` o `consiguió P…`. El texto completo existe en `title`, pero no está disponible por hover en móvil.
- **Corrección esperada:** si puede resolverse sin volver a crecer la banda, reservar visualmente algo más de ancho al nombre del logro o separar nombre y logro en dos fragmentos truncables. Mantener las cinco filas de 48 px y la fecha secundaria. No abreviar ni hardcodear nombres del fixture.

## Regresiones y límites

- Shell PLAYER y TEAM_ADMIN permanecen idénticos a UI-G2: sidebar 172 px y cabecera 129 px.
- La geometría del cuerpo es idéntica entre roles; solo cambia el resumen personal.
- El smoke móvil conserva una columna, segmentos legibles y cero overflow visible en el viewport aportado.
- No aparecen features futuras, media real ni CTAs de permisos incorrectos.
- La auditoría no atribuye un PASS técnico completo: QA informa cero errores y cero overflow global, pero falla expresamente la comprobación interna de participación.
- Loading, error, empty, 401, 403 y 404 no fueron capturados en esta iteración y no se aprueban visualmente desde estas imágenes.

VERDICT: ITERATE
