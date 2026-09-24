# QA Phase7.9 — temporadas

2026-09-24, Windows local. Resultado funcional final PASS; aprobación visual del Coordinator en [comparación](../COMPARISON-COORDINATOR.md), no decisión de este agente.

## Evidencia vigente

- [HTTP completo](http-results-qa79-1790269122198.json):39 peticiones más dos concurrentes de creación. Auth401/PLAYER403/tenant404; nombres y fechas ISO reales, tipos null/number/bool/fechas imposibles rechazados400; nombre duplicado409, concurrente201+409. Activar cierra anterior, activa idempotente, cerrada no reabre409, cerrar inválida409. Dos activaciones distintas simultáneas serializadas:200/200 y una sola ACTIVE. Ranking A/B conserva permanentes sin mezclar temporadas; sin activa solo permanente, solicitud estacional409.
- [Browser iteración](browser-results.json): ocho checks PASS: vacío/create dobleclick único, confirmar activar/draft conservado, BcierraA, lista500/retry, PLAYER403, selector histórico y cambios rápidos con respuesta retrasada, cerrar/noactiva, mutación500 conserva borrador/reintento. Ese informe conserva FAIL posterior por nombre120chars que causó overflow654/390; no ocultar el hallazgo.
- [Resolución dirigida](extra-results.json): nombre120sin espacios confirmado tras fix en admin y ranking390/390. Carrera activar mismo target dos veces idempotente; activar/cerrar simultáneos200/200 termina CLOSED y no reabre409. Fixtureqa79-1790269588506. Resuelve explícitamente el FAIL anterior sin repetir los ocho checks yaPASS.
- [Capturas](screenshots/): seis normales1440×1024/390×844 y dos long390×844. Rutas/roles en browser/extra JSON. Cero overflow global en finales; tabla ranking mantiene scroll local. Browser principal localees-ES/timezoneEurope/Madrid, cero pageerrors. Extra original localees-ES y timezone heredada hostMadrid; script reproductible ya fija Europe/Madrid. Longconfirm evidencia wrapping, no composición (sticky header al hacer fullpage), según Coordinator.

## Reproducción

Desde raíz PowerShell, configuración local no impresa:

`$env:QA_SIGNED_SESSION='1'; node --env-file=apps/backend/.env.ui-windows docs/phase-7.9/qa/http.cjs`

Solo UI: añadir QA_BROWSER_ONLY=1. Solo dirigido long/races: QA_EXTRA=1. Quitar ambas para HTTP completo. Scripts [http.cjs](http.cjs), [browser.cjs](browser.cjs), [extra.cjs](extra.cjs). Selecciones de ranking excluyen PLANNED; prueba long activa su temporada antes de elegirla. Inyección500 de lista se mantiene hasta retry para no consumirla en primer request abortado por StrictMode.

Fixturesqa79 nuevos, JWT locales firmados, guard destino127.0.0.1:55437/weblogros_ui. Limpieza IDpropios en finally y snapshot Halcones/Lobos igual antes/después:14membresías19logros42concesiones8solicitudes6propuestas. Sin seed/reset/CT; no cambios a identidad compartida. Último http-results.json es ronda dirigida; suite principal usa enlace inmutable arriba.

Intentos previos fallidos por selectores del harness/StrictMode se corrigieron sin cambios de producto. Overflow long sí fue defecto aplicativo y se corrigió/recapturó. No prueba exhaustiva de todos fallos de red ni stress prolongado de concurrencia.

## Legacy7.8 y runtime

[QA retirada legacy](../../phase-7.8/qa/legacy-QA.md): guard temporal3PASS, migración17/17 aplicada, preserve13usuarios14membresías, generate7.5/buildbackend/seed:checkPASS sinseed, regresiónperfilPASS. Backend final supervisor2456/cmd41988/listener2312, DBweblogros_ui_windows55437 saludable.

Para build frontend final: preflight7109MiB libres; supervisor34968/listener39104 verificados y detenidos exclusivamente. Frontend build en curso al redactar, backend/DB conservados. Actualización resultado/PID final debajo.


## Build y entrega final

`npm run build` frontend escalado PASS exit0 (Next16.2.0, compilación17.7s, TypeScript9.3s); incluye /equipos/[slug]/admin/temporadas. Sin dev concurrente. Reinicio hidden: supervisor42252, listener39900 hijo start-server.js del repositorio verificado; conhost12432. GET http://localhost:3000/equipos/halcones/admin/temporadas200 (shell; autorización ya probada browser). Backend2312/supervisor2456 y DB55437 conservados. No nuevas mutaciones tras build. Logs ignorados apps/frontend/.env.ui-windows-stdout.log y stderr.log. Para detener, revalidar CommandLine/parent/puerto y limitar al árbol42252; antiguos34968/39104 ya detenidos.
