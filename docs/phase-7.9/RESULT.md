# Entrega de temporadas 7.9 y limpieza de identidad

Estado: COMPLETADO LOCALMENTE. Autorizada el 2026-09-24; no desplegada ni publicada.

## Cambios

- Retirada de `User.displayName` en schema y seed, con nueva migración conservadora. El guard exige que los textos anteriores estén ya conservados; no copia alias borrados ni inventa nombres. [Auditoría](../phase-7.8/LEGACY-CLEANUP.md).
- Nueva ruta `/equipos/[slug]/admin/temporadas`, accesible desde Administración. Crear, listar, activar y cerrar; confirmación del cierre previo al activar y aviso de no reactivación.
- Selector de edición en ranking, con nombre/estado recibido de la API. Actual sin activa suma permanentes; cada edición suma permanentes y sus concesiones estacionales.
- Transiciones administrativas serializadas por equipo, errores de duplicado 409 y fechas ISO validadas antes de convertir.

## Archivos principales

Backend: `prisma/schema.prisma`, `prisma/seed.ts`, nueva migración `20260924180000_remove_legacy_user_display_name`, `src/routes/seasons.ts`, `src/schemas/seasons.ts`.

Frontend: nueva `admin/temporadas/page.tsx`, navegación y acceso rápido en `admin/layout.tsx` y `admin/page.tsx`, `ranking/page.tsx`, `types/api.ts`. Contratos: [backend](BACKEND.md), [frontend](FRONTEND.md).

## Validación

Guard SQL sobre tablas temporales: casos representados, huérfano y alias de otra persona PASS. Aplicación local: 13 usuarios y 14 membresías preservados; columna retirada. Evidencia [guard](../phase-7.8/qa/legacy-guard-results.json) y [preservación](../phase-7.8/qa/legacy-preservation.json).

Backend build, Prisma generate y seed:check PASS. Frontend ESLint dirigido y TypeScript PASS. [HTTP de temporadas](qa/http-results-qa79-1790269122198.json): 39 peticiones registradas más dos creaciones concurrentes; permisos, validación, estados, aislamiento, suma histórica/permanente y una sola activa PASS. [Regresión de perfil y alias tras retirar columna](../phase-7.8/qa/legacy-profile-results-qa78legacy-1790269155343.json) PASS.

Navegador: crear/activar/cerrar con confirmación y doble envío controlado, error de lista y guardado con reintento/borrador, restricción PLAYER, históricos y cambios rápidos del selector, ausencia de activa PASS. [Recorridos](qa/browser-results.json) conserva el hallazgo de overflow con nombre120; [retest dirigido](qa/extra-results.json) demuestra su corrección y las carreras sobre el mismo periodo (activar/activar y activar/cerrar), con rechazo posterior de reapertura.

Ocho capturas de escritorio/móvil y caso largo; [revisión Coordinator](COMPARISON-COORDINATOR.md) PASS local con P2 heredados del ranking. Build de producción frontend PASS, incluida la nueva ruta de temporadas. [QA consolidada y runtime](qa/QA.md).

## Límites

- Base Windows aislada; sin seed/reset, cambios en CT112, despliegue ni cierre remoto de #11.
- Históricos calculados con datos vigentes: nuevas concesiones permanentes y aprobaciones históricas pueden cambiar resultados. La conservación ante bajas sigue en PLAYER-LC.
- Sin edición/eliminación de temporadas ni activación programada por fecha. Avatares y almacenamiento permanecen en 7.10.
- Pausa general de UI Workstream, A1/A2 aplazadas, G6 provisional y G9 sin iniciar.
