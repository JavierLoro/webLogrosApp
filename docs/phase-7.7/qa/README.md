# QA Phase 7.7 â€” Windows local

Fecha: 2026-09-24. Evidencia funcional; este agente no concede aprobaciÃ³n visual.

## Entorno

Preflight PowerShell: `Get-CimInstance Win32_OperatingSystem` (16355 MiB libres); `Get-NetTCPConnection -State Listen` (3000/3001/55437 libres); inventario `Get-CimInstance Win32_Process`; `docker info` inicialmente sin daemon. Docker Desktop iniciado con `Start-Process 'C:\Program Files\Docker\Docker\Docker Desktop.exe' -WindowStyle Hidden`, PID 27936. `docker ps -a` confirmÃ³ Ãºnicamente el contenedor existente detenido. `docker start weblogros_ui_windows`; `docker exec weblogros_ui_windows pg_isready -U admin -d weblogros_ui` PASS. Puerto 127.0.0.1:55437, volumen `weblogros_ui_windows_data`.

No seed, reset, migraciones ni acceso a CT. Se reutiliza `.env.ui-windows` sin imprimir secretos.

Backend desde apps/backend (PATH con node_modules/.bin): `node --env-file=.env.ui-windows node_modules/nodemon/bin/nodemon.js --exec ts-node src/server.ts`. Supervisor 36568, cmd hijo 38488, listener 35896. Frontend desde apps/frontend: `node node_modules/next/dist/bin/next dev --webpack --hostname 127.0.0.1`. Supervisor 34552, listener 24428. Ambos iniciados mediante Start-Process oculto con logs `.env.ui-windows-stdout.log`/`stderr.log` dentro de cada app. URLs: http://localhost:3000/login 200; http://localhost:3001/auth/session 401 esperado sin cookie.

Para detener: volver a consultar CommandLine/ParentProcessId y listeners; detener exclusivamente Ã¡rboles verificados de supervisores 36568 y 34552, nunca todos los Node. PID histÃ³ricos dejan de ser autoridad si el proceso termina. La DB se conserva.

## Pruebas HTTP

Desde raÃ­z: `node --env-file=apps/backend/.env.ui-windows docs/phase-7.7/qa/http.cjs`.

Guard impide otro destino distinto de localhost:55437/weblogros_ui. Usuarios/equipos aleatorios `qa77-<timestamp>`; login real con contraseÃ±a temporal no registrada. Finalmente se eliminan solo IDs creados y se compara snapshot Halcones/Lobos antes/despuÃ©s. Resultados en `http-results.json` y copia por ejecuciÃ³n.

Primera ejecuciÃ³n `qa77-1790247904369`: 24 peticiones PASS. CreaciÃ³n/rechazo/aprobaciÃ³n, motivo requerido, resoluciÃ³n inmutable, aprobaciÃ³n sin concesiÃ³n ni solicitud implÃ­cita, obtenciÃ³n posterior separada. 401/403/404, autorÃ­a y aislamiento tenant. Detalle administrativo estÃ¡ndar devuelve progress/season null; progresivo usa temporada original CLOSED con valor 7, aunque la ACTIVE tenga 2; concesiÃ³n activa no cambia el estado original, concesiÃ³n original sÃ­ lo cambia a AWARDED. Fixtures existentes 14 membresÃ­as, 19 logros, 42 concesiones, 8 solicitudes y 6 propuestas (Halcones+Lobos) permanecen iguales.

## Capturas (preparadas, pendientes de ejecuciÃ³n)

`node --env-file=apps/backend/.env.ui-windows docs/phase-7.7/qa/canonical.cjs`.

Chrome headless mediante Playwright del runtime Codex. Fixture `halcones-visual`, PLAYER Ana / TEAM_ADMIN Diego, login real; solo lecturas. Viewports 1440Ã—1024 y 390Ã—844; locale es-ES, timezone Europe/Madrid, reloj 2026-09-20T12:00:00Z. Screenshots y telemetrÃ­a de rutas, encabezados, errores y scrollWidth en `screenshots/` y `canonical-results.json`. No se almacenan cookies, tokens ni contraseÃ±as.

## Browser E2E ejecutado

PowerShell: `$env:QA_BROWSER='1'; $env:QA_SIGNED_SESSION='1'; node --env-file=apps/backend/.env.ui-windows docs/phase-7.7/qa/http.cjs`.

qa77-1790248313458 PASS: browser-results.json. PLAYER formulario doble click (un POST), historial y detalle. Admin incorpora progresivo objetivo3, secreto y 45 puntos (un POST); DB confirma configuración y ninguna concesión/solicitud automática. Tras hacerlo visible mediante API, PLAYER solicita por UI; admin bloquea concesión anticipada. Progreso API a3 y UI concede exactamente una vez. Rechazo de propuesta/solicitud exige motivo visible en historial. Stale real409 muestra mensaje y refresca estado final. Cero pageerrors. Limpieza fixture PASS y snapshot compartido intacto.

Primera API/captura PLAYER hicieron login real. Repetición encontró429 por limitación de login; siguientes rondas usan JWT firmados localmente exclusivamente para usuarios fixture (sin alterar seguridad). Primer intento E2E falló por selector Tipo exacto: el nombre accesible incluye opciones; corregido en script. Fixtures de intentos fallidos también limpiados.

Capturas por rol: QA_ROLE=player/admin; informes canonical-results-player.json/admin.json. Primera G7 detectó overflow móvil; segunda identificó span sr-only de acciones fuera del contenedor. Hallazgo entregado al worker y una pageerror HMR requiere repetición estable. Capturas finales completadas después de la corrección.

## Resultado final

- 26 capturas canónicas (10 PLAYER,16 TEAM_ADMIN), 1440×1024 y390×844, todas sin overflow global ni errores pageerror/HTTP. Los elementos de tablas más anchos que viewport están dentro de scroll local y no expanden documentElement. Informes finales `canonical-results-player.json` y `canonical-results-admin.json`; PNG en screenshots. No aprobación visual por QA.
- Ronda puntual `QA_STATES=1 QA_SIGNED_SESSION=1` con http.cjs: `states-results.json`, fixture qa77-1790248742991-main eliminado. UI vacío,401,403,404 PASS; navegación cliente A→lista→B limpia puntos/motivo. No se verificó navegación directa router A→B porque la UI no presenta ese enlace.
- Nueva /admin/logros: guardar progreso2→reseleccionar miembro→conceder→estado cerrado PASS; secreto persiste. El refresco desmonta controles y requiere reseleccionar miembro; es usable pero la continuidad puede mejorarse.
- Nueva /admin/invitaciones: configuración3d/2usos, creación y botón copiar ejecutados. Link contiene /unirse?token=. No se leyó clipboard, por tanto la persistencia exacta en portapapeles no está acreditada.
- La primera pasada tuvo overflow corregido por implementers y una página afectada por HMR; solo las capturas finales estables descritas aquí son evidencia vigente. Intentos fallidos de selectores QA quedaron resueltos y no indican fallos de producto.
- API completa y E2E principal: informe `http-results-qa77-1790248313458.json`, browser-results.json. Último http-results.json corresponde a la ronda puntual de estados (3 llamadas setup), no reemplaza la cobertura completa previa.
- No se probaron de forma exhaustiva todos los estados500/loading/retry ni la copia del portapapeles. Gates visuales corresponden al Coordinator.

Comandos incrementales: QA_ROLE=player y QA_ROUTES=solicitudes recaptura solo listado; QA_ROLE=admin y QA_ROUTES=admin/logros,admin/solicitudes,admin/propuestas,admin/solicitudes/1,admin/propuestas/1 recaptura solo rutas corregidas, preservando resto del informe. Configurar variables con sintaxis PowerShell `$env:VARIABLE='valor'`.

Última recaptura después del freeze visual G8: overview, solicitudes, propuestas y detalles1 de ambos tipos, en ambos viewports. Diez PNG actualizados; cero errores/overflow. Resto de capturas finales se conserva sin cambios.


## Entrega runtime final

Coordinator reporta backend build PASS, frontend lint global y TypeScript PASS, frontend production build PASS. Primer build frontend en sandbox falló al descargar Google Fonts; repetición escalada PASS sin cambiar código. Estos checks son del Coordinator, no una ejecución de este agente.

Después del build: preflight12091MiB libres y3000 libre; frontend dev --webpack --hostname127.0.0.1 iniciado oculto supervisor33796, listener40148 (hijo verificado start-server.js del repositorio), conhost40380. GET http://localhost:3000/login200. Backend permanece listener35896/supervisor36568; DB55437 propietario Docker7156. Logs frontend apps/frontend/.env.ui-windows-stdout.log y stderr.log; backend equivalentes en apps/backend.

Para parada posterior verificar CommandLine y ParentProcessId de33796/40148 y36568/35896 antes de detener esos procesos exclusivamente. Los PID anteriores34552/24428 ya están detenidos. DB se conserva. No se hicieron fixtures adicionales tras build.
