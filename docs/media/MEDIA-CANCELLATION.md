# Cancelación persistente de imágenes — Phase 7.10

Entrega local del 2026-10-17, después de [recuperación](MEDIA-RECOVERY.md). Alcance: cancelar un trabajo propio que modifica la imagen de un logro existente. No incluye controles del frontal, borradores/propuestas, logos/avatares ni despliegue.

## API y permisos

`POST /equipos/:slug/media/trabajos/:id/cancelar`, sin body. Exige cookie válida, Origin configurado, membresía TEAM_ADMIN actual y que el trabajo pertenezca al usuario y equipo de la ruta. La resourceKey debe identificar una imagen de logro de ese equipo. Un segundo administrador no puede cancelar un trabajo ajeno por conocer su UUID. Estas reglas corresponden al catálogo actual; no establecen un permiso TEAM_ADMIN universal para las futuras propuestas propias de jugadores.

| Estado al resolver la petición | Respuesta | Efecto |
| --- | --- | --- |
| QUEUED | 200, `cancellation: "canceled"` | CANCELED, libera reserva de espera y deja temporal pendiente de limpieza |
| RECEIVING / PROCESSING / PUBLISHING | 202, `cancellation: "requested"` | Persiste intención; conserva reserva y puesto hasta cierre físico |
| CANCELED | 200, `cancellation: "canceled"` | Repetición idempotente, sin renovar fecha |
| SUCCEEDED / FAILED / INTERRUPTED | 409, `cancellation: "too_late"` | Conserva el resultado terminal |
| Commit/acuse incierto de DB | 503 | No afirma éxito ni rollback; repetir es seguro |

La respuesta incluye `job` con id, estado, fechas, failureCode y cancelRequestedAt. No expone rutas, tokens, manifiestos, PID ni claves S3. GET de estado conserva su DTO anterior. Respuestas sin caché (`no-store`); las peticiones POST requieren Origin también al repetir una cancelación. 400 para UUID inválido, 401 sin sesión, 403 por permiso/origen y 404 para destino ausente/ajeno.

El POST de subida entrega UUID al terminar la recepción y responder202. Antes de ese punto, el cliente puede abortar su propia transferencia mediante el mecanismo HTTP existente; este bloque no añade una sesión de subida que revele UUID anticipadamente. El backend también soporta cancelar RECEIVING si el trabajo ya se conoce internamente.

## Código y arquitectura

- `prisma/schema.prisma` y `20261017180000_media_job_cancellation`: columna nullable `MediaJob.cancelRequestedAt` e índice por owner técnico/fecha/estado. El estado sigue representando la fase real del trabajo; una intención de cancelar no finge que Sharp ya cerró.
- `mediaJobCancellation.ts`: `requestMediaJobCancellation()` valida entrada y bloquea membresía antes del advisory lock global de coordinación y la fila del job. Revalida propietario/equipo/tipo. Fecha fijada por PostgreSQL, `COALESCE` conserva la primera petición. Solo QUEUED puede pasar a CANCELED directamente. Los demás activos mantienen capacidad ocupada. Error de DB se traduce a503 con causa privada.
- `routes/media.ts`: nuevo POST autenticado y con Origin; llama al servicio, intenta limpiar terminales confirmados y hace `runtime.wake()`. El fallo de limpieza no deshace CANCELED. La ruta no mata procesos ni cambia directamente la referencia del logro.
- `mediaJobClaims.ts`: selección y CAS excluyen trabajos con cancelRequestedAt. `mediaJobAdmission.ts` impide que un recibo cancelado llegue a QUEUED y lo terminaliza después de la precondición de cierre físico. Repetir el mismo recibo cerrado no revive el trabajo. `mediaUploadIntake.ts` devuelve409 si el acuse confirmó CANCELED, en lugar de anunciar una subida aceptada.
- `mediaRuntime.ts`: cada poll consulta los RECEIVING propios ligados a leases locales y aborta sus señales. `mediaJobController.ts` añade `reconcileCancellations()` antes de llenar capacidad, aunque sus dos puestos ya estén ocupados. Convierte flags DB en AbortController sobre tareas activas; no libera puestos por su cuenta.
- `mediaJobExecution.ts`: después del CAS de inicio consulta el flag antes de llamar al ejecutor. Una cancelación entre claim y Sharp puede completarse sin crear un hijo. Si ya existe, sigue el protocolo de abort y espera su cierre. Un fallo DB no se interpreta como proceso finalizado.
- `mediaPublication.ts`: la transacción final conserva locks de membresía y logro, toma el mismo lock global de coordinación y relee cancelRequestedAt. Si cancelar comprometió primero, un error interno provoca rollback y terminalización CANCELED/retirada del STAGING propio. Si el commit de READY/referencia/SUCCEEDED ganó, cancelar devuelve409 y conserva la nueva imagen. La decisión no depende de que el poll ya haya enviado un abort local.
- `mediaJobRecovery.ts`: incorpora cancelRequestedAt a snapshot y CAS. Tras comprobar que el escritor terminó, una petición durable pendiente finaliza como CANCELED; sin ella mantiene INTERRUPTED. Un reinicio no olvida la intención ni repite el trabajo.

No se mantiene una transacción durante la subida, Sharp o S3. El poll normal sigue en500ms; una operación S3 ya iniciada termina o alcanza su plazo antes de dar por cerrado el trabajo. El flag impide publicar cuando la cancelación ganó, aunque el objeto remoto haya acabado de guardarse. La limpieza reutiliza su diario y los marcadores propios; no toca la imagen vigente.

La coordinación por DB permite que otra petición solicite cancelar sin poseer el AbortController original. El ejecutor continúa limitado a un runtime por base y un host, según MEDIA-RECOVERY; esto no habilita varios servidores multimedia.

## Pruebas y evidencia

Node24.14.0 Windows, base aislada `127.0.0.1:55437/weblogros_ui`, SeaweedFS4.47 privado `127.0.0.1:8333`. Migración aplicada únicamente a esa base;25 migraciones al día. Los tests se ejecutan secuencialmente con el backend de producto detenido.

`mediaJobCancellation.integration.test.ts`: **12/12 PASS**, incluidos caso padre y11 subcasos: sesión/Origin/rol/owner/team/UUID, QUEUED concurrente e idempotente, ACK perdido antes/después del commit y reintento, SUCCEEDED demasiado tarde, claim cancelado antes de Sharp sin signal, recibo cerrado antes de QUEUED, registro de worker detenido sin liberar prematuramente, S3 antes de commit sin signal y commit final ganador con cancelación esperando su lock, y RECEIVING cuyo source se cierra antes del terminal. Usa HTTP y DB/S3 reales, con gates para fijar el orden de las carreras. El caso de worker retiene su registro antes de ordenar Sharp; el abort durante transformación real conserva la evidencia de las suites de ejecutor/enlace.

`mediaJobRecovery.integration.test.ts`: **17/17 PASS**, añade caída real de backend, solicitud persistida y reinicio que completa CANCELED conservando referencia/plazas. No es un reinicio completo del sistema operativo.

Regresión: HTTP13, pipeline18, ejecución12, intake14, admisión9, toma5, ejecutor11, limpieza5, receptor14 y S31. Total del bloque **131 comprobaciones PASS**, incluidos padres. Build/seed:check/migrate status y chequeo de formato PASS. Snapshots conservados:13 usuarios/2 equipos/14 membresías/19 logros,0 jobs/assets/cleanups y1 registro histórico del runtime de producto anterior, ajeno a las fixtures. Objetos, raíces y owners propios de las pruebas retirados. Los fallos de ACK se inyectan con wrappers de transacciones reales; no simulan una caída de red completa.

Desde `apps/backend`:

```powershell
npm run build
node --env-file=../../.env.media.local --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_CANCELLATION_TEST="1"; require("./dist/lib/mediaJobCancellation.integration.test.js");'
```

Pendientes: barrido genérico de abandonados24h, recursos/corpus/carga, borradores/propuestas y publicación con imagen lista, otros destinos y controles/QA de navegador. No cierraT05/T08.01 ni7.10.

Backend compilado restaurado en3001: arranque y recuperación PASS, health200 y POST cancelar sin sesión401/no-store. Se conserva el owner histórico del proceso anterior y se crea el del runtime nuevo; no son archivos originales ni fixtures abandonadas. La raíz de producto sigue conteniendo solo el marcador. Revisión independiente sin bloqueantes; sin commit/push ni despliegue.


Continuación 2026-10-18: [barrido de abandonados](MEDIA-ABANDONED-CLEANUP.md) implementado con journal propio, umbral24h, revisión horaria/cursor y parada cooperativa. Barrido24/24 y155 comprobaciones totales PASS;26 migraciones en la base aislada. El texto anterior conserva la evidencia y pendientes de su entrega histórica.
