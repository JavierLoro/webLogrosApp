# Issues #30 y #29 — progreso y secretos

Petición de ejecución: 2026-09-22. Entrega conjunta; #30 no se cierra dejando #29 pendiente.

## Alcance autorizado

- Dimensiones independientes: tipo STANDARD/PROGRESSIVE, secreto y alcance PERMANENT/SEASONAL.
- Objetivo en el catálogo; avance por persona y contexto de temporada; concesión final en UserLogro.
- TEAM_ADMIN registra deltas positivos/negativos atómicos, limitados al rango válido.
- Alcanzar el objetivo no concede automáticamente el logro.
- Secretos censurados en servidor hasta la primera concesión histórica del equipo; el avance no los revela.
- El revelado sobrevive al cambio de temporada; los secretos ocultos quedan fuera del denominador personal.
- UI de creación, consulta, configuración secreta y gestión del avance integrada con flujos existentes.
- Migración conservadora, pruebas HTTP/concurrencia/aislamiento y revisión desktop/móvil.

## Decisiones confirmadas por el usuario

1. Exigir alcanzar el objetivo antes de conceder, tanto directamente como al aceptar una solicitud.
2. Contadores y objetivos enteros.
3. Cerrar el contador tras la concesión; cualquier ajuste posterior se rechaza.

La edición del tipo y objetivo tras crear un logro no forma parte de esta V1; la edición solicitada es la propiedad de secreto.

## Ejecución

| Bloque | Responsable | Estado |
| --- | --- | --- |
| Persistencia, contratos, permisos y censura | backend_worker | DONE |
| Formularios, estados y controles | frontend_worker | DONE |
| Pruebas reproducibles y captura | qa_capture | DONE |
| Decisiones, integración, comparación visual y documentación | Coordinator | DONE |

Se conservan los cambios documentales previos del usuario. No se reanudan G6–G9, no se cierra A1/A2 y no se integra media real. Las referencias canónicas existentes gobiernan la adaptación funcional; shell y tokens permanecen congelados.

## Validación prevista

Entrega local completada: migración aplicada 16/16, generate/build/seed:check backend PASS,
7/7 unitarias PASS, TypeScript/lint/build frontend PASS, 103 peticiones HTTP PASS, flujo de
navegador y 26 capturas PASS. Comparación directa del Coordinator sin P0/P1 abiertos en este
alcance. No se ejecutó seed; fixtures propios de QA eliminados y datos existentes conservados.
Resultados y límites: [RESULT.md](RESULT.md), [QA](qa/RESULT.md) y [visual](VISUAL.md).

- Migración sobre PostgreSQL local de revisión, previa comprobación del destino; sin reset ni seed rutinario.
- Fixtures exclusivos de QA separados de Halcones y limpieza por identificadores exactos.
- Sin iniciar, avance parcial, corrección, límites, elegibilidad y concesión confirmada.
- Incrementos concurrentes sin pérdidas; concesiones duplicadas rechazadas.
- Secretos en catálogo, detalle, búsquedas, solicitudes/propuestas y agregados; cambio de propiedad y revelado global.
- Permanente, temporada activa, cambio/cierre de temporada e historial.
- Autenticación, permisos de administrador, lectura propia y aislamiento entre equipos.
- Build/TypeScript/lint, navegador desktop/móvil y evidencia de regresión.

## Entorno observado

Windows local; preflight 2026-09-22: 12457 MiB libres. Único contenedor activo: PostgreSQL `weblogros_ui_windows`, healthy, puerto 55437. Frontend y backend existentes en 3000/3001; no se inician instancias duplicadas. Los PID son observaciones temporales y deben verificarse de nuevo antes de operar.

Lectura de `_prisma_migrations`: 15 migraciones ya aplicadas, incluida `20260921170000_add_seasons`. Esto corrige el pendiente documental de aplicación local, pero no acredita por sí solo sus pruebas HTTP ni el frontend de gestión/históricos.

Al terminar: nueva migración de progreso/secretos aplicada (16/16), salud backend confirmada y
frontend compilado. Temporadas tiene cobertura de integración para este bloque, sin completar
por ello su administración visual ni selector histórico.
