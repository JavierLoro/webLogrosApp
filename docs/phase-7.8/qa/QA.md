# QA Phase 7.8 — perfil y alias

Fecha2026-09-24; Windows local, sin aprobación visual por QA.

## Resultado

[HTTP completo](http-results-qa78-1790259932325.json) PASS: GET/PATCH perfil401 anónimo; alias401/403/404; DTO explícito sin password/flags; nombres ambos obligatorios, trim y límites80/120; payload desconocido/email/password/role/isSuperAdmin400. Alias string|null,max80, campos desconocidos/userId/role400, vacío→null. Nombres globales conservan aliases; alias propio no cambia otro tenant/usuario; borrar recupera fallback global. TEAM_ADMIN limita cambios a sí mismo.

[Browser](browser-results.json) PASS: desde Mis equipos→Mi perfil; correo readonly; guardar nombres y alias con doble click emite1PATCH. Borrador aliasB sin guardar se conserva al guardar global/aliasA y no modifica DB. Borrar aliasA→Ir al equipo muestra nombre global recién guardado. Desde navegación móvil tenant→perfil funciona. Fallo500 inyectado solo PATCH conserva borrador; reintento explícito guarda. TEAM_ADMIN edita su nombre; estados sin equipos y401 con login visibles. Cero pageerrors.

Seis [capturas](screenshots/) con rutas/roles/viewports registradas en browser-results.json: PLAYER y TEAM_ADMIN1440×1024/390×844, sin equipos y anónimo1440×1024. Todas document scrollWidth==viewport. Locale es-ES/timezone Europe/Madrid. Fixture qa78-1790260173743 temporal (no Halcones), eliminado al terminar. Coordinator compara visualmente.

[Runner](http.cjs), [script navegador](browser.cjs), [reproducción](README.md). Para repetir solo UI: `$env:QA_BROWSER_ONLY='1'; node --env-file=apps/backend/.env.ui-windows docs/phase-7.8/qa/http.cjs`. Para HTTP solo omitir variable. El último http-results.json registra cleanup rondaUI; HTTP completo es la copia por run enlazada arriba.

## Integridad y límites

Guard exige DATABASE_URL localhost:55437/weblogros_ui. Fixtures qa78 crean únicamente equipos/usuarios propios y se eliminan por ID. Snapshot nombres Ana/Diego y membresías Halcones/Lobos intacto antes/después en cada ejecución. Sin seed/reset/migraciones/CT. Sesiones fixture firmadas; login real fuera de estas pruebas de perfil. No secretos/cookies en evidencia.

Primera ronda browser falló por selector de prueba ambiguo role=alert (coincidía anunciador Next); se acotó al mensaje del500 y ronda final PASS. Sin cambio aplicativo por QA. No prueba exhaustiva de todos los fallos de red; sí error de guardado y reintento.

## Runtime

Se reutilizaron procesos previos sin duplicados: frontend33796/40148 y backend nodemon36568; Docker weblogros_ui_windows healthy55437. Tras QA, frontend33796/40148 verificados por CommandLine/parent y detenidos para build Coordinator;3000 libre. Backend listener26116 y DB55437 conservados. Reinicio pendiente aviso de build; no reutilizar PID históricos sin verificación.


## Entrega final tras build

Coordinator reportó frontend production build PASS exit0, con /perfil incluida. Workers reportaron backend build y frontend lint dirigido/TypeScript PASS. Coordinator revisó PLAYER1440/390 y comunicó visualPASS sin deltas materiales; este agente no decide esa aprobación.

Reinicio QA:13268MiB libres y3000 libre. Frontend dev --webpack --hostname127.0.0.1 iniciado hidden supervisor34968/listener39104 (parent/CommandLine repo verificados; conhost20272). GET http://localhost:3000/perfil200. Backend listener26116/nodemon36568 y Docker DB55437 conservados. Logs locales ignorados apps/frontend/.env.ui-windows-stdout.log y stderr.log. Para parada verificar identidad otra vez y detener solo árbol34968; PID33796/40148 ya detenidos. No fixtures nuevos tras build.
