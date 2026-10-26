# 7.10 — Conexión HTTP y runtime del backend

Entrega local **2026-10-17**, continuación autorizada con «conéctalo, y luego me explicas el flujo». Conecta el [recorrido interno de catálogo](MEDIA-ACHIEVEMENT-PIPELINE.md) a Express y al arranque/apagado. **API de imágenes de logros existentes**, no cierre de 7.10 ni de la interfaz.

## Contrato de API

Las rutas siguientes pertenecen al backend (`:3001`). Desde el proxy de desarrollo de Next se antepone `/api`; no se han añadido controles de subida ni imágenes al frontal.

| Método / ruta | Entrada y permisos | Respuesta |
| --- | --- | --- |
| POST `/equipos/:slug/logros/:id/imagen` | Cookie de sesión, TEAM_ADMIN del equipo, Origin incluido en allowlist. Multipart con un único archivo `image`; PNG estático/JPEG ≤10.000.000 bytes. Identidad/destino vienen de sesión/ruta, nunca del body | `202 {job, cancellation}` cuando la entrada cerrada está QUEUED. Procesamiento continúa en segundo plano. El permiso se revalida de nuevo al asociar |
| GET `/equipos/:slug/media/trabajos/:id` | Cookie, membresía vigente, mismo ownerId y teamId del trabajo | DTO directo `{id,status,createdAt,updatedAt,completedAt,failureCode}`. No keys/rutas/tokens. Ajeno/inexistente404, UUID inválido400 |
| GET `/equipos/:slug/logros/:id/imagen?size=320` | Cookie y membresía actual. TEAM_ADMIN ve secretos; PLAYER solo si ya existe alguna concesión del secreto en el equipo, igual que el catálogo | Variante con lado mayor ≥size, o mayor disponible sin ampliar. size permitido320/640/1280, default1280. Bytes privados o304 tras autorización/versión/existencia; sin imagen404 |

Los errores usan `Cache-Control: no-store`. La imagen y304 usan `private, no-cache`, `Vary: Cookie` y ETag formado por assetUUID y SHA-256 de la variante. Cambiar la versión del logro cambia ETag aunque los píxeles coincidan. HEAD comprueba tipo/tamaño/existencia del objeto **antes** de304; no se usa el ETag de S3 como hash ni se expone una URL de bucket.

Los GET también revalidan el permiso antes de leer: tener el UUID de un asset o un ETag antiguo no autoriza acceso. No hay optimizador público de imágenes ni uso offline aprobado de copias privadas. Las comprobaciones de esta entrega son HTTP; el navegador/UI/cambio de cuenta con caché real siguen requiriendo QA al integrar las pantallas.

## Archivos y llamadas

```text
server.ts / main()
  -> startMediaRuntimeFromEnv()
  -> escucha HTTP con un runtime preparado

POST -> resolveTeam -> createMediaRouter -> cookie / Origin / TEAM_ADMIN
  -> acquireReceipt -> createMediaHttpUploadBridge (req -> PassThrough)
  -> receiveAchievementImage -> receiveAndQueueMediaJob -> QUEUED
  -> release del lease -> wake -> respuesta202

runtime (wake o poll500ms) -> MediaJobController.tick()
  -> claim -> Sharp -> diario / S3 -> referencia Logro / SUCCEEDED

GET estado -> sesión / equipo / propietario -> DTO seguro
GET imagen -> sesión / membresía / secreto / versión -> HEAD
  -> ETag coincide:304
  -> GET -> primer fragmento -> cabeceras -> stream privado
```

`routes/equipos.ts` monta `createMediaRouter({getRuntime})` después de `resolveTeam`. El getter evita capturar null al importar rutas antes del bootstrap. El guard/auth del router solo afecta sus paths, no cambia el permiso de otras rutas tenant.

`mediaHttpUpload.ts` contiene `createMediaHttpUploadBridge`. `PassThrough` con highWaterMark64KiB separa el body HTTP del receptor: `pipe` propaga contrapresión sin destruir el socket cuando el receptor rechaza un archivo. Se esperan los cierres del intake antes del error JSON; en POST se cierra la conexión después de la respuesta. Límite adicional del multipart:10MB+64KiB de envoltura; plazo120s. El servidor tiene requestTimeout125s. Aborted/error/cierre incompleto/respuesta cerrada y el signal de shutdown cancelan la recepción. También se comprueban los estados iniciales por si el cliente se desconectó esperando DB o lease. Desconectar después de aceptar QUEUED no cancela el trabajo persistido.

`mediaRuntime.ts` contiene `MediaRuntime`, `createMediaRuntime`, `startMediaRuntimeFromEnv` y `getMediaRuntime`. Mantiene un solo cliente S3/controlador por servidor. Poll500ms y wake inmediato comparten el guard de tick; PostgreSQL conserva dos puestos globales y diez reservas. La creación comprueba DB, bucket mediante objeto aleatorio propio retirado con HEAD nulo y directorio dedicado. No inicia migraciones ni interrumpe/reintenta jobs antiguos al arrancar.

Un lease de recepción registra que esa petición usa el runtime. `stop()` deja de aceptar, cancela sus señales, espera release y cierre de los workers/poll. En `server.ts`, `server.close()` detiene nuevas conexiones y `stop(() => closed)` conserva S3 hasta que terminen las peticiones HTTP abiertas. Prisma se desconecta al final. SIGINT/SIGTERM conectan ese cierre. La prueba demuestra orden de leases/callback; señales de proceso en Linux y reinicio real siguen pendientes de despliegue.

`mediaImageRead.ts` separa HEAD, lectura acotada/hash y `primePrivateMediaImage`: espera el primer fragmento antes de fijar cabeceras binarias. Un fallo S3 temprano puede responder JSON503; después de enviar bytes, un fallo cierra el stream, sin intentar un segundo JSON. Un plazo total30s cubre HEAD/GET/primado/stream. `objectStore.ts` limita conexiones a5s y operaciones/cuerpo GET a30s, sin reintentos automáticos del SDK. Un timeout de PUT puede dejar un objeto remoto: el diario previo permite su limpieza; no se infiere inexistencia por el error.

`errorHandler.ts` evita escribir JSON si la respuesta ya empezó/fue destruida; para errores anteriores retira cabeceras binarias y fija no-store. `server.ts` permite/exhibe los encabezados de revalidación en CORS para desarrollo.

## Activación y capacidad local

`.env.example` documenta `MEDIA_ENABLED` (defaultfalse), `MEDIA_TEMP_ROOT` absoluto y `MEDIA_ALLOWED_ORIGINS` (lista exacta separada por comas; requerida en producción). Desactivado permite arrancar sin S3. Activado con configuración/preflight fallidos no abre el listener HTTP. No se imprimen credenciales.

Para el piloto Windows se añadió configuración en `.env.ui-windows` ignorado y raíz `apps/backend/.media-tmp`, también ignorada. El script `npm run dev:media:windows` carga `.env.media.local` y `.env.ui-windows` y arranca el servidor TypeScript. No arrancar una segunda instancia sobre3001: en esta entrega ya quedó el backend compilado local escuchando en ese puerto, con los contenedores existentes.

La raíz temporal se valida como canónica, dedicada, sin symlinks ni archivos desconocidos y con marcador propio. Se usa modo0700/0600 donde el sistema admite permisos POSIX; esto no configura ACLs de Windows ni sustituye los permisos del usuario/volumen en destino. Antes de recibir se suma uso presente y una reserva conservadora de360.000.000 bytes para12 trabajos de10MB de entrada+20MB máximos de salida. Debe caber en1GiB temporal y quedar además1GiB libre fuera de esa reserva. `statfs` usa espacio disponible. ENOENT por limpieza concurrente permite repetir una vez la medición; otros casos fallan cerrados y no borran archivos.

Esto es un guard de admisión local, no una cuota del sistema operativo ni una medición de RAM/carga. Múltiples hosts requerirían almacenamiento temporal compartido, coordinación/fencing y revisión del presupuesto; no se declara esa topología compatible. El futuro despliegue aún debe configurar proxy (incluido límite de body de Nginx, cuyo default no acepta estas subidas), volumen, límites y credenciales privadas; no se ha modificado ni ejecutado Compose de producción.

## Evidencia y límites

Node24.14.0 Windows, base exclusiva `127.0.0.1:55437/weblogros_ui`, SeaweedFS4.47 privado `127.0.0.1:8333/lockerboard-media-dev`.

- **HTTP13/13 PASS**:202 y procesamiento automático; lectura PNG320 y304; sin sesión/caducada/no miembro nunca304; error GET antes del primer byte JSON503; PLAYER/Origin ajeno sin reserva; estado porowner/team/UUID; multipart incorrecto y>10MB devuelvenJSON; reemplazo cambia ETag; secreto oculto/revelado; desconexión durante body y esperandolease; stop espera lease y cierre HTTP antes de destruirS3 una sola vez.
- **Pipeline18/18 PASS** repetido tras límites S3, **adaptador1/1 PASS**. Total de esta verificación final32/32, incluidos los dos casos padre; regresiones anteriores40/40 conservan su evidencia del bloque previo.
- Backend build y seed:check PASS. Sin migración nueva:23 al día de la entrega anterior. Snapshot antes/después13usuarios/2equipos/14membresías/19logros y0jobs/assets/cleanups; fixtures/temporales/claves propias retiradas, HEAD nulo comprobado.
- Arranque real de `dist/server.js` con media habilitado PASS; `/health`200 y ruta montada de imagen sin sesión401/no-store. Backend quedó escuchando3001. El objeto de preflight se retiró; no se han insertado imágenes en logros existentes.
- Revisión estática independiente sin bloqueantes en el alcance. Los fallos de backend/almacén de algunos casos se fuerzan mediante wrappers alrededor de operaciones reales; no son caídas reales de red o reinicios.

Pendientes de 7.10: recuperación de reinicio/commit incierto y limpieza programada/abandono; cancelación distribuida por API; corpus/carga/RAM y presupuesto en destino; borradores/propuestas/creación con imagen lista; logos, avatares, controles/UI/caché de navegador y QA completa T08.01. El escalado y producción/backups/R2 permanecen fuera de esta entrega. HTTP privado no equivale a cerrar fase ni a publicar el frontal con imágenes.


Continuación 2026-10-17: [recuperación de reinicios y commit incierto](MEDIA-RECOVERY.md) implementada después de esta entrega. Owners/lock, protección de escritores vivos, reconciliación y limpieza programada de trabajos conocidos verificadas; el barrido genérico de abandonados24h continúa pendiente. La evidencia anterior conserva su alcance histórico.


Continuación del 2026-10-17: [cancelación persistente por API](MEDIA-CANCELLATION.md) implementada; incorpora intención a recuperación tras reinicio y guard final de publicación. Cancelación12/12 y recuperación ampliada17/17 PASS;25 migraciones en base aislada. La evidencia anterior describe su entrega histórica.
