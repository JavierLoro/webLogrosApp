# UI-A2 — Navegador Windows, 2026-09-21

## Evidencia observada

- IAB del usuario, sesión Ana conservada. `/equipos` muestra Halcones/Lobos reales y estadísticas no disponibles.
- Capturas viewport válidas y abiertas para inspección: `teams-desktop.png` (1440×1024), `teams-mobile.png` y `teams-mobile-bottom.png` (390×844).
- `/unirse`: `join-desktop.png` y `join-error-mobile.png`. Consulta con token deliberadamente inválido devuelve «La invitación no es válida o ha caducado». No se consumió invitación.
- `/solicitar-acceso`: `request-desktop.png` y `request-mobile.png`. Envío vacío bloqueado por validación nativa «Completa este campo». Ancho móvil DOM = viewport = 390 px.
- Regresión compartida: `login-regression-desktop.png` y `register-regression-mobile.png`. Login conserva fullscreen; registro móvil muestra logo/formulario sin decoración lateral. Login capturado con autofill del navegador, contraseña enmascarada; no representa estado vacío.
- Navegador devuelto a `/equipos`, tamaño normal restaurado y sesión preservada.

## Límites de esta ejecución

- No se crearon cuentas, solicitudes ni membresías. Éxito posterior a POST y preview válido no tienen nueva evidencia runtime; solo revisión estática. No se simuló éxito dentro del producto.
- Error/empty/401/retry de equipos, error de envío de solicitud y carreras/doble POST no fueron reproducidos en navegador. No confundir implementación revisada con prueba ejecutada.
- No hay API de interceptación anunciada en el navegador disponible. No se usó Playwright externo/CDP ni se modificó DOM/estado de React para fabricar escenarios.
- Las capturas son viewport, no fullPage (este último produjo imágenes inválidas en A1). La parte inferior de equipos móvil se capturó mediante scroll real.
- Gate visual y QA integral pendientes; estos resultados no cierran A2 ni A1.
