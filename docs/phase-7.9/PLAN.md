# Temporadas — entrega funcional 7.9

Autorización 2026-09-24: «vamos con ello», tras proponer limpieza de identidad y temporadas. Primero retirada compatible del legado 7.8; después completar gestión e históricos de #11. La pausa general A1/A2/G9 se mantiene.

## Alcance y ubicación

- `/equipos/[slug]/admin/temporadas`: nueva sección de la administración existente, lista y formulario de nombre/inicio/fin. Crear produce PLANNED; activar y cerrar son acciones manuales explícitas. Las fechas no programan tareas automáticas.
- Activar una planificada cierra la activa anterior: explicar el efecto y pedir confirmación en la interfaz. Cerradas no se reactivan. No se añade eliminación ni edición de periodos.
- Ranking existente: selector Actual y ediciones activas/cerradas. Endpoint actual cuando no se elige edición; endpoint histórico al elegirla. Sin activa, actual suma solo permanentes.
- El histórico suma permanentes y concesiones de la edición seleccionada según el contrato existente. No es una instantánea inmutable: aprobaciones históricas y logros permanentes pueden modificarlo. Conservación ante bajas de jugadores pertenece a PLAYER-LC.
- Permisos: miembros consultan; TEAM_ADMIN del equipo gestiona. No se amplía SUPER_ADMIN a gestión ajena.

## Ejecución y diseño

Backend existente como base; corregir únicamente fallos de validación/transición/concurrencia encontrados en este alcance. Sin reemplazar contratos ni resetear fixtures.

Extensión funcional de las referencias canónicas de ranking y administración del manifest, usando shell, tokens y primitivas actuales. No existe referencia específica de temporadas: se revisará coherencia visual y usabilidad; no se declarará réplica de una captura inexistente. Coordinator compara directamente según override vigente. Sin media real.

Trabajo independiente del backend de identidad y frontend de temporadas en paralelo, sin archivos compartidos. QA de runtime/migración secuencial; Coordinator controla documentación de estado.

## Criterios de cierre

- Limpieza legacy con auditoría previa, guard SQL, regeneración, compilación y preservación de identidad/alias; sin seed ni reset.
- Crear/listar/activar/cerrar, confirmaciones, fechas inválidas, nombre repetido, autenticación y aislamiento. Concurrencia conserva una única activa y no reabre cerradas.
- Histórico distingue temporadas con datos de prueba controlados y conserva suma permanente; actual sin temporada funciona.
- Navegador desktop/móvil: administración, selector, error/reintento, vacíos, permisos, borradores y prevención de doble envío. Sin respuestas atrasadas mezcladas.
- Build/lint/TypeScript pertinentes, capturas y revisión Coordinator; evidencia y roadmap reconciliados al acabar. No despliegue ni cierre remoto de issue.


## Resultado

COMPLETADO LOCALMENTE el 2026-09-24. [Entrega](RESULT.md), [QA](qa/QA.md), [revisión visual Coordinator](COMPARISON-COORDINATOR.md). No despliegue ni cierre remoto; otros gates conservan su pausa.
