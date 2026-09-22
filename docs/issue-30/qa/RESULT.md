# QA de #30 y #29 — 2026-09-22

Resultado funcional PASS. No constituye aprobación visual.

## Entorno y comandos

Windows; backend existente `http://localhost:3001`, frontend existente `http://localhost:3000`; PostgreSQL aislado `127.0.0.1:55437/weblogros_ui`. El Coordinator confirmó migraciones16/16 y autorizó ejecución. QA no arrancó/reinició servidores ni ejecutó migración/seed.

Desde la raíz:

```powershell
node --check docs/issue-30/qa/http.cjs
node --check docs/issue-30/qa/capture.cjs
node --env-file=apps/backend/.env.ui-windows docs/issue-30/qa/http.cjs
```

Primer run `qa30-1790084860020`:93 peticiones PASS, autenticación mediante login real de tres usuarios temporales. Salida conservada en historial de ejecución; el JSON resumido inicial fue sobrescrito por el intento siguiente antes de incorporar nombres por run.

La repetición inmediata alcanzó el límite legítimo de login429. Coordinator autorizó cookies de fixture firmadas solo en memoria para siguientes ejecuciones, sin alterar el limiter. No se guarda contraseña, cookie, token ni storageState.

```powershell
$env:QA_BROWSER = '1'
$env:QA_SIGNED_SESSION = '1'
node --env-file=apps/backend/.env.ui-windows docs/issue-30/qa/http.cjs
```

Run final `qa30-1790085148618`:96 peticiones del script HTTP PASS y flujo interactivo de navegador PASS. Evidencia: `http-results-qa30-1790085148618.json`, `http-results.json`, `browser-results.json`, `screenshots/*.png`. Ejecución elevada autorizada tras bloqueo spawn EPERM; Chrome del sistema, sin paquetes nuevos.

Ampliación HTTP posterior `qa30-1790085254204`:103 peticiones PASS, sin repetir capturas. `http-results.json` refleja esta última ejecución; `http-results-qa30-1790085254204.json` la preserva. Añade solicitud SEASONAL elegible en S1, cambio a S2 y aprobación posterior: concesión se guarda en S1, ninguna en S2 y progreso actual0. Añade aprobación exitosa permanente y confirma delta posterior409. Cleanup y baseline PASS.

## Cobertura comprobada

- Migración conservadora:14 logros Halcones STANDARD, no secretos y objetivo null.
- Auth401; PLAYER escritura403; ajeno403; otro tenant404; usuario objetivo de otro tenant404; lectura del progreso de otro miembro403.
-12 incrementos concurrentes conservados; límites0/objetivo; enteros y delta distinto de0; frontera2147483647 sin overflow.
- Concesión anticipada directa y por solicitud409; solicitud conserva PENDING. Objetivo alcanzado ELIGIBLE sin concesión automática; otorgamiento manual AWARDED y deltas posteriores409.
- Carrera corrección/concesión mantiene estado serializable; dos concesiones concurrentes producen201+409 y un registro.
- Secreto oculto mínimo; censura en catálogo, detalle, consulta búsqueda, progreso, dashboard, ranking, jugadores, solicitudes, propuestas y mis-equipos. Admin conserva detalle. ELIGIBLE sigue oculto.
- Concesión de secreto revela a otro PLAYER. Secreto estándar también probado. Configuración de visibilidad real.
- Temporal sin activa409; progreso independiente por temporada; secreto otorgado en primera temporada sigue revelado en la segunda con progreso inicial0. Una concesión por temporada, duplicado409; permanente conserva20.
- Navegador real: crea progresivo secreto; decimal objetivo bloqueado sin POST; doble click genera un POST; selecciona miembro; decimal delta y concesión prematura disabled; alcanza objetivo; concede; contador cerrado; cambia visibilidad; PLAYER ve detalle revelado.

## Capturas

26 PNG:24 de matriz y2 del flujo. PLAYER/TEAM_ADMIN;1440×1024 y390×844; es-ES/Europe-Madrid. Rutas exactas y IDs en `browser-results.json`; fixture tenant `qa30-1790085148618-main`. Matriz: catálogo, parcial, otorgado, oculto, dashboard; administración añade creación y panel.24 rutas sin overflow global, errores de consola, pageerror ni respuestas HTTP>=400. El flujo interactivo se verifica mediante aserciones; su consola no fue instrumentada.

Recaptura final tras detectar que networkidle había permitido un skeleton en secreto móvil. Todas las capturas finales esperan el h1 exacto visible; catálogo además espera el logro frontera y detalle parcial su progressbar. Se comprueba DOM de todos los contadores: scrollWidth<=clientWidth+1 y spans numéricos dentro de su contenedor. PASS desktop/móvil después del ajuste frontend de wrap. El flujo real también verifica delta-10 permitido/clamp0 y delta10/clamp3 antes de conceder.

No se congeló reloj: este fixture contiene fechas generadas durante la prueba, no el fixture visual canónico. Las capturas son evidencia funcional/responsive para comparación del Coordinator.

## Limpieza y regresión

Cada ejecución elimina exclusivamente IDs propios mediante transacción en finally. Run final cleanup PASS. Halcones/Lobos antes/después idénticos:14 membresías,19 logros,42 concesiones,8 solicitudes,6 propuestas. No se borraron fixtures existentes. La prueba de búsqueda comprueba que el payload HTTP nunca contiene el nombre secreto; no verifica un filtro de búsqueda nuevo del servidor.
