# Entrega #30 y #29 — progreso individual y secretos

## Resultado

Implementación conjunta con objetivo obligatorio, contadores enteros y contador cerrado tras
concesión, según confirmación del usuario. La concesión permanece manual y separada del avance.

- Migración aditiva `20260922150000_achievement_progress_and_secrets`: STANDARD/no secreto/sin
  objetivo para registros existentes; tabla de avance por persona y contexto permanente/estacional.
- Deltas atómicos y limitados al rango cero–objetivo; comprobación de elegibilidad y concesión
  coordinadas por bloqueo transaccional. La suma intermedia usa bigint para evitar desbordamiento.
- Permisos TEAM_ADMIN para cambios; lectura propia para miembros y aislamiento tenant.
- DTO censurado de secretos sin primera concesión; cubre catálogo, detalle, progreso, textos
  duplicados de propuestas/solicitudes y agregados. Revelado global e histórico por equipo.
- Creación con tipo/objetivo/alcance/secreto, configuración de secreto, controles de avance y
  concesión, estados reales en catálogo/detalle/dashboard. Contador cerrado visible en UI.
- La edición de tipo/objetivo, media real y el resto de G6–G9 quedan fuera del alcance.

## Comprobaciones

- Prisma generate, build backend y seed:check PASS; 7 pruebas unitarias PASS.
- TypeScript y lint frontend PASS; build de producción PASS. El primer intento dentro del
  sandbox no pudo descargar las fuentes existentes de Google; ejecución con red autorizada PASS.
- Migración 16/16 aplicada exclusivamente a `127.0.0.1:55437/weblogros_ui`; sin reset ni seed.
- QA HTTP: permisos, validación, concurrencia, corrección, elegibilidad, concesión, cierre,
  secretos y temporadas PASS. Navegador: creación real, validación, doble envío, avance,
  concesión, cierre y revelado PASS. Detalle y artefactos en [qa/RESULT.md](qa/RESULT.md).
- Limpieza por IDs exclusivos de QA PASS. Halcones/Lobos conservan 19 logros, 42 concesiones,
  14 membresías, 8 solicitudes y 6 propuestas; base original de 2 equipos y 13 usuarios.

## Revisión visual y límites

Comparación directa del Coordinator en [VISUAL.md](VISUAL.md). La evidencia corresponde a fixtures
de QA exclusivos para este bloque; no sustituye la convergencia visual pendiente de A1/A2 o G6–G9.
No hay despliegue en producción ni cierre remoto de issues como consecuencia de las pruebas locales.

El backend existente se recuperó mediante su supervisor nodemon, sin iniciar duplicados. Frontend
en `http://localhost:3000` y backend en `http://localhost:3001`; comprobar salud de nuevo antes de
operar. Los datos temporales de capturas se eliminan, por lo que sus rutas no quedan disponibles.
