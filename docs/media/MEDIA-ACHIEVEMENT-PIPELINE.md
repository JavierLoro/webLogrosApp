# 7.10 — Recorrido interno de imagen de catálogo

**Continuación posterior del mismo día:** [conexión HTTP y runtime](MEDIA-HTTP.md) entregada. Este documento conserva la fotografía del bloque interno anterior; para endpoints, polling y pendientes actuales consultar esa continuación y MEDIA-PLAN.

Entrega local del **2026-10-17**, por autorización expresa de completar el bloque incluyendo guardado y asociación. Sustituye la espera de comprensión entre las pequeñas conexiones de este bloque; el siguiente paso es revisar juntos el flujo montado. **No cierra 7.10 ni habilita uploads en la aplicación.**

## Recorrido del código

```text
receiveAchievementImage(source, headers, target, options)
  -> receiveAndQueueMediaJob -> RECEIVING -> input.tmp cerrado -> QUEUED
MediaJobController.tick()
  -> claimNextQueuedMediaJob -> PROCESSING
  -> executeClaimedMediaJob -> proceso Sharp cerrado -> PUBLISHING
  -> publishClaimedAchievementImage
       -> diario MediaAsset STAGING -> PUT / HEAD / GET + SHA-256
       -> transacción: asset READY + Logro.imageAssetId + job SUCCEEDED
       -> limpieza de asset anterior y temporales propios
```

`tick()` toma como máximo dos trabajos por llamada y los lanza sin esperar sus resultados. `idle()` espera las tareas locales; `stop()` impide nuevas tomas, solicita cancelación y espera su cierre. PostgreSQL conserva el límite global de dos puestos entre instancias, también durante S3. No hay scheduler automático por importación ni arranque en `server.ts`: el futuro composition root deberá programar los ticks y su apagado.

| Archivo / función | Responsabilidad y encaje |
| --- | --- |
| `src/lib/mediaAchievementTarget.ts` / `receiveAchievementImage` | Fachada de dominio para sustituir la imagen de un logro existente. Valida IDs, logro/equipo y TEAM_ADMIN contextual, construye resourceKey canónica y llama al intake. Cierra la fuente incluso ante rechazo previo a admisión. No es middleware ni endpoint; ownerId lo deberá resolver la futura ruta desde sesión |
| `mediaUploadIntake.ts` / `receiveAndQueueMediaJob` | Admisión compartida, recibo persistente, recepción y confirmación QUEUED con identidad/token después del cierre. Componente existente, reutilizado |
| `mediaJobController.ts` / `MediaJobController` | Carga tipo/ruta persistidos, toma, ejecuta Sharp, publica y limpia solo después de confirmar un terminal. Ticks simultáneos de una instancia comparten promesa; instancias distintas comparten los puestos DB |
| `mediaJobExecution.ts` / `executeClaimedMediaJob` | CAS de inicio único y proceso Sharp aislado. Ahora exige ruta/tipo coincidentes con recibo o ambos nulos para fixtures legacy. `MediaJobPreparationError` distingue un fallo de workspace previo al inicio: solo ese caso permite al controlador terminalizar con executorStartedAt todavía nulo |
| `mediaPublication.ts` / `publishClaimedAchievementImage` | Valida resultado, reserva publicación one-shot y diario de claves, sube/verifica variantes y confirma asociación. Usa el puerto S3 inyectado; no conoce HTTP ni entrega URL pública |
| `mediaAssetCleanup.ts` / `cleanupMediaAssetCleanup` | Borrado reintentable de versiones retiradas: verifica namespace team/logro/job, estado RETIRED, ausencia de referencia y HEAD nulo tras DELETE |
| `mediaTemporaryCleanup.ts` / `cleanupTerminalMediaJobTemporaryFiles` | Tras SUCCEEDED/FAILED/CANCELED confirmado, retira solo variantes con directorio exacto persistido, input.tmp y directorio vacío. Marcadores durables por etapa, lstat/realpath, sin borrar sobrantes desconocidos |

Todos los archivos están en `apps/backend/`; las rutas abreviadas de las filas posteriores pertenecen a `src/lib/`. Los módulos nuevos contienen notas pedagógicas `// 📚`; explicación ampliada en [apuntes](../apuntes.md).

## Datos, publicación y reemplazo

Migración aditiva `20261017120000_media_asset_publication`, aplicada **solo a 127.0.0.1:55437/weblogros_ui**. Cliente Prisma 7.5.0 generado; 23 migraciones al día.

- `Logro.imageAssetId` nullable conserva los 19 logros legacy y su `icono`. FK compuesta teamId/imageAssetId impide asociar un asset de otro equipo. La condición de imagen obligatoria al publicar se integrará con los futuros borradores/creación/propuestas; no se ha cambiado el contrato actual de esas rutas.
- `MediaAsset`: versión con job/equipo, estado STAGING/READY/RETIRED y manifiesto JSON de variantes `{key, filename, size, width, height, format, sha256}`. Los bytes viven en S3; PostgreSQL guarda sus referencias.
- `MediaJob.publisherStartedAt`: marca CAS que impide publicar dos veces la misma toma.
- `MediaAssetCleanup`: diario durable de claves concretas, PENDING/COMPLETE, intentos y código seguro. Reintentar el borrado no vuelve a ejecutar Sharp.

Las claves son privadas y únicas por versión: `media/teams/{teamId}/achievements/{achievementId}/jobs/{jobUUID}/{filename}`. No reutilizar una clave entre reemplazos: sobrescribir antes del commit o borrar la anterior después destruiría la nueva imagen. La resourceKey, en cambio, identifica el destino estable y reserva una sola sustitución activa por logro.

Antes del primer PUT se registra el conjunto completo de claves. Se suben variantes secuencialmente y se verifica tamaño/tipo por HEAD y tamaño/hash por GET acotado; ETag se trata como opaco. Lecturas locales acotadas, archivos regulares/canónicos y GET cerrado ante fallo. El adaptador S3 original se reutiliza sin cambios de API ni credenciales públicas.

La transacción final bloquea membresía y logro, revalida TEAM_ADMIN y equipo/destino, cambia asset a READY, cambia la referencia del logro y confirma SUCCEEDED liberando puesto/reserva. La retirada de la anterior y su diario se confirman en esa misma transacción; los DELETE ocurren después. Fallo de borrado posterior no revierte la imagen nueva ni convierte SUCCEEDED en fallo. El original de entrada no se almacena en S3; el temporal se retira tras terminal confirmado.

## Fallos y fronteras

Validación fallida antes de S3 termina FAILED; cancelación confirmada termina CANCELED. Un fallo de PUT/verificación deja la anterior vigente, termina el trabajo y registra/limpia el intento parcial. Revocación del permiso durante la subida se comprueba al asociar: rollback conocido, terminal y limpieza del intento.

**Commit incierto:** ante error no confirmado de DB no se inventa un terminal ni se borran objetos. Si se confirmó SUCCEEDED antes de perder el acuse, el controlador consulta el terminal real y puede limpiar temporales; el diario de la anterior queda retomable. Si hizo rollback, conserva PUBLISHING, puesto, STAGING y objetos. **Falta un reconciliador** que determine y resuelva ese caso y los estados interrumpidos al reiniciar; no hay reintento automático del procesado/publicación. Se registra como pendiente de T02.03/T05.03/T05.06, no como recuperación completa.

La señal es local al controlador; cancelación entre instancias y endpoint aún pendientes. La fuente de recepción debe emitir `close` (contrato heredado del intake). La futura ruta deberá coordinar cierre del body/socket y respuesta; conectar directamente un IncomingMessage sin esa adaptación podría impedir contestar un error.

## Verificación realizada

Node 24.14.0 Windows; PostgreSQL y SeaweedFS 4.47 locales, con los contenedores y volúmenes existentes. Sin nuevos servicios ni cambios de producción.

- Pipeline: **18/18 PASS** (17 subpruebas y caso padre): PNG con tres variantes/transparencia/sin EXIF; JPEG real pese a nombre/MIME cliente PNG; rechazo anónimo 403; original temporal retirado; reemplazo con claves distintas y versión nueva legible; PLAYER/cross-tenant rechazados sin reserva; temporal perdido antes de Sharp; limpieza conserva archivo ajeno y se retoma; fallo tras PUT parcial; metadatos remotos incorrectos; cancelación durante S3 y antes del primer PUT; permiso revocado; PNG corrupto; manifiesto inválido; limpieza remota retomable; dos controladores con límite global; fallos antes/después del commit final.
- Regresiones secuenciales: ejecución **12/12**, intake **14/14**, admisión **9/9**, toma **5/5**. Total reportado **58/58**, incluidos los cinco casos padre.
- Backend build y seed:check PASS; Prisma generate/deploy/status y diff-check PASS.
- La primera corrida obtuvo 13/15: la prueba anónima construía una URL con doble `/` (405). Se corrigió con `new URL`; la siguiente corrida obtuvo 15/15 y 403 en la ruta correcta. Se añadieron tres casos de JPEG/temporales y la corrida final obtiene 18/18. No fue un fallo de privacidad del flujo.
- Snapshots antes/después: 13 usuarios, 2 equipos, 14 membresías, 19 logros y 0 jobs/assets/cleanups. Fixture y temporales propios retirados; claves escritas por la prueba eliminadas. No se borró ni listó el bucket completo. Las pruebas pueden avanzar secuencias de IDs de la base aislada.

Fallos de persistencia y almacén se inyectan mediante Proxy/wrappers alrededor de operaciones reales; no acreditan cortes reales de red, reinicio del servidor, carga o recuperación automática. Imágenes sintéticas: falta corpus real y medición de recursos, límites de disco y RAM aplicados, y verificación en Linux/Node de producción.

## Pendientes que conserva el roadmap

HTTP autenticado, protección de escrituras y contrato del body/socket; lectura privada/caché con revalidación; programación/cierre del controlador y reconciliación; presupuesto físico/recepción/abandono; borradores/propuestas/creación solo con imagen lista; logos, avatares y ciclo de vida; controles aplazados, corpus/carga y QA de recorrido completo. UI permanece pausada y con placeholders. Este bloque entrega **asociación real interna a catálogo**, no el gate T08.01 ni una fase completa.


Continuación 2026-10-17: [recuperación de reinicios y commit incierto](MEDIA-RECOVERY.md) implementada después de esta entrega. Owners/lock, protección de escritores vivos, reconciliación y limpieza programada de trabajos conocidos verificadas; el barrido genérico de abandonados24h continúa pendiente. La evidencia anterior conserva su alcance histórico.
