# Phase 7.8 QA

Entorno Windows local reutilizado: frontend supervisor33796/listener40148, backend nodemon36568 (listener cambia al editar), PostgreSQL weblogros_ui_windows healthy puerto127.0.0.1:55437. Preflight Coordinator13750MiB; agente confirmó procesos,puertos,Docker y no inició duplicados. CT y base principal fuera del alcance. Sin migración/seed/reset.

## Reproducción

Desde raíz PowerShell: `node --env-file=apps/backend/.env.ui-windows docs/phase-7.8/qa/http.cjs`.

Para browser cuando esté listo: `$env:QA_BROWSER='1'; node --env-file=apps/backend/.env.ui-windows docs/phase-7.8/qa/http.cjs`.

Guard DATABASE_URL limita destino a localhost:55437/weblogros_ui. Cada ronda crea equipos/usuarios qa78 propios con sesiones fixture firmadas, limpia por IDs y compara identidades Ana/Diego y todas membresías Halcones/Lobos antes/después. No credenciales/tokens en informes. Sesión firmada significa que login real no se vuelve a evaluar en estas pruebas de perfil.

## HTTP ejecutado

Primera ronda qa78-1790259932325 PASS en [http-results-qa78-1790259932325.json](http-results-qa78-1790259932325.json). Último [http-results.json](http-results.json) registra exclusivamente cleanup de ronda browser-only, no la suite HTTP. Auth401/no miembro403/tenant404; DTO sin password/flags; perfil exige nombres, límites80/120, strict desconocidos/email/password/roles400; alias string|null límite80 y strict; trim/vacío null; nombres conservan aliases independientes, alias solo propio en tenant, eliminación devuelve fallback global; TEAM_ADMIN también edita solo identidad propia. Cleanup y snapshot PASS.

UI y seis capturas PASS; consultar QA.md y browser-results.json. Para soloUI usar QA_BROWSER_ONLY=1, evitando repetir HTTP. Este agente no concede aprobación visual ni edita código de aplicación/control plane.


## Entrega final tras build

Coordinator reportó frontend production build PASS exit0, con /perfil incluida. Workers reportaron backend build y frontend lint dirigido/TypeScript PASS. Coordinator revisó PLAYER1440/390 y comunicó visualPASS sin deltas materiales; este agente no decide esa aprobación.

Reinicio QA:13268MiB libres y3000 libre. Frontend dev --webpack --hostname127.0.0.1 iniciado hidden supervisor34968/listener39104 (parent/CommandLine repo verificados; conhost20272). GET http://localhost:3000/perfil200. Backend listener26116/nodemon36568 y Docker DB55437 conservados. Logs locales ignorados apps/frontend/.env.ui-windows-stdout.log y stderr.log. Para parada verificar identidad otra vez y detener solo árbol34968; PID33796/40148 ya detenidos. No fixtures nuevos tras build.
