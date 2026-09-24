# QA Phase 7.7 — resultado funcional local

2026-09-24. Windows local; sin aprobación visual por este agente.

## Evidencia

- [HTTP/E2E principal](http-results-qa77-1790248313458.json): 30 peticiones de la suite/setup, todos los checks PASS. Autorización401/403/404, aislamiento tenant/autor, rechazo con motivo, resolución inmutable, aprobación crea catálogo sin concesión ni solicitud, obtención posterior separada.
- [Browser principal](browser-results.json): formulario PLAYER doble envío produce un POST; historial/detalle; aprobación admin configura45 puntos, progresivo objetivo3 y secreto sin otorgar puntos; solicitud posterior, bloqueo hasta objetivo, concesión única; ambos rechazos visibles en historial; stale409 muestra error real y refresca final. Cero pageerrors.
- [Estados y nuevas subrutas](states-results.json): vacío,401,403,404 UI; navegación cliente A→lista→B limpia formulario. /admin/logros progreso→reseleccionar→conceder y secreto persistido. Invitación configurable3d/2usos creada y botón copiar ejecutado. No se comprobó contenido del clipboard.
- [Capturas PLAYER](canonical-results-player.json) y [TEAM_ADMIN](canonical-results-admin.json):26 PNG finales en [screenshots](screenshots/),1440×1024 y390×844, locale es-ES, Europe/Madrid, reloj2026-09-20T12:00:00Z. Todas sin overflow global/pageerror/HTTP error. Tablas mantienen scroll local móvil. Las10 últimas capturas admin corresponden al freeze final del implementer: overview,listas2,detalles2.
- [Reproducción y cronología](README.md), [runner HTTP](http.cjs), [E2E](capture.cjs), [estados](states.cjs), [capturas](canonical.cjs).

Fixtures mutables exclusivos qa77-<timestamp>, usuarios temporales y dos equipos nuevos; cleanup por IDs propios PASS. Snapshots Halcones/Lobos antes/después iguales:14 membresías,19 logros,42 concesiones,8 solicitudes,6 propuestas. Canónicas Halcones solo lectura. Sin seed/reset/migraciones/CT.

Nuevo contrato backend detalle solicitud: estándar progress/season null; progresivo conserva temporada CLOSED original valor7 aunque ACTIVE tenga2. Concesión ACTIVE no altera estado original; concesión original devuelve AWARDED. Prueba directa HTTP PASS.

## Límites y observaciones

No prueba exhaustiva de todas las combinaciones loading/500/retry. Copia clipboard no leída. /admin/logros refresca controles tras mutación y requiere reseleccionar miembro; recorrido sigue usable. A→B se probó por navegación disponible A→lista→B, no router directo inexistente en UI. Comparación/aprobación visual corresponde al Coordinator.

Login real se probó en primera API y captura PLAYER; repetición alcanzó429 esperado del rate limiter. Siguientes rondas usan JWT locales firmados para identidad fixture, sin desactivar seguridad. Informes no contienen contraseñas ni cookies. Intentos fallidos por selector de test y overflow previo conservan trazabilidad en informes por ejecución; evidencia final sustituyó capturas afectadas. Overflow móvil real se corrigió y verificó en26 capturas finales.

## Runtime

Preflight16355MiB libres, puertos3000/3001/55437 libres. Docker Desktop iniciado oculto PID27936; PostgreSQL existente weblogros_ui_windows saludable en127.0.0.1:55437, volumen weblogros_ui_windows_data. Backend supervisor36568 listener35896 en3001, configuración local .env.ui-windows; no secretos impresos.

Frontend supervisor34552/listener24428 fueron verificados por CommandLine/ParentProcessId y detenidos únicamente ellos para permitir build del Coordinator. Backend y DB conservados. Reinicio posterior pendiente aviso del Coordinator; actualizar este apartado con nuevos PID. No reutilizar IDs sin repetir verificación.


## Entrega runtime final

Coordinator reporta backend build PASS, frontend lint global y TypeScript PASS, frontend production build PASS. Primer build frontend en sandbox falló al descargar Google Fonts; repetición escalada PASS sin cambiar código. Estos checks son del Coordinator, no una ejecución de este agente.

Después del build: preflight12091MiB libres y3000 libre; frontend dev --webpack --hostname127.0.0.1 iniciado oculto supervisor33796, listener40148 (hijo verificado start-server.js del repositorio), conhost40380. GET http://localhost:3000/login200. Backend permanece listener35896/supervisor36568; DB55437 propietario Docker7156. Logs frontend apps/frontend/.env.ui-windows-stdout.log y stderr.log; backend equivalentes en apps/backend.

Para parada posterior verificar CommandLine y ParentProcessId de33796/40148 y36568/35896 antes de detener esos procesos exclusivamente. Los PID anteriores34552/24428 ya están detenidos. DB se conserva. No se hicieron fixtures adicionales tras build.
