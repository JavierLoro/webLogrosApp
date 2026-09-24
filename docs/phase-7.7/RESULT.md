# Phase 7.7 — Entrega local sin imágenes

2026-09-24. Pasos 1–7 del [plan](../PHASE-7.7-PLAN.md) completados. Phase 7.7 permanece parcial exclusivamente por imágenes de propuestas (paso 8, Phase 10, dependiente de 7.10). No publicado ni desplegado.

## Qué se entrega y por qué

- Historiales personales separados, búsqueda, filtros, orden y detalles en la misma ruta mediante parámetros URL. «Añadida al catálogo» distingue una propuesta aceptada de un logro obtenido.
- Administración con resumen, navegación y subrutas de invitaciones, jugadores, logros, solicitudes y propuestas. Cada área admite enlace directo y conserva el contexto y autorización del equipo.
- Detalles de revisión con aprobación/rechazo, motivo obligatorio al rechazar, bloqueo de doble envío y actualización tras conflicto. Aprobar una propuesta configura el logro; no concede puntos, no crea progreso ni una solicitud de obtención.
- Catálogo administrativo reutiliza los controles existentes de progreso, concesión manual y secreto. Las invitaciones permiten configurar duración y usos; miembros muestra y filtra los datos reales disponibles.
- Lectura administrativa de solicitudes añade progreso y temporada originales. Evita sustituir el contador de una solicitud histórica por el de la temporada activa. Sin migración ni cambio de reglas de concesión. Explicación pedagógica en [apuntes](../apuntes.md).

## Validación

Backend build, frontend lint global, TypeScript y build de producción PASS. El primer build frontend no pudo descargar Google Fonts desde el sandbox; la repetición con acceso de red autorizado pasó sin cambiar código.

[QA reproducible](qa/QA.md): HTTP, aislamiento por equipo/autor, estados 401/403/404/vacío, seis recorridos principales de navegador y ocho checks adicionales PASS. Progreso histórico probado con temporada cerrada (7) frente a activa (2), incluida concesión por periodo. Fixtures temporales eliminados y datos Halcones/Lobos sin cambios. 26 capturas desktop/móvil sin overflow global ni errores del navegador.

[Comparación del Coordinator](COMPARISON-COORDINATOR.md): gate local G7/G8 PASS para el alcance funcional sin imágenes. No equivale a igualdad píxel a píxel ni a regresión global G9.

## Límites conservados

- Imágenes/adjuntos, cambios de rol, archivo/eliminación, revocación de invitaciones, notificaciones y administración de temporadas mantienen su alcance futuro; no se simulan acciones sin API.
- Tras mutar progreso en administración hay que reseleccionar miembro. Mejora de continuidad pendiente, sin pérdida de datos.
- Se ejecutó copiar invitación, pero no se leyó el clipboard. No se cubrieron exhaustivamente todas las combinaciones loading/500/retry.
- A1/A2 siguen aplazados; G6 provisional y G9 sin iniciar. Terminada esta reanudación acotada, el resto del workstream conserva la pausa solicitada.

Aplicación local disponible en http://localhost:3000/login. Historial: `/equipos/halcones/solicitudes`; administración: `/equipos/halcones/admin`, con el rol correspondiente. Runtime y parada segura documentados en QA.
