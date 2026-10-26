# 7.10 — Toma persistente de dos turnos de procesamiento

Fecha: 2026-10-12. **IMPLEMENTADO Y VERIFICADO LOCALMENTE.** El usuario comprendió que un resultado cancelado se descarta y autorizó el siguiente bloque con subagentes, conservando explicación/comprensión antes de avanzar. Esta entrega toma trabajos `QUEUED` existentes; todavía no conecta el ejecutor, la recepción, S3 ni una ruta HTTP.

## Alcance y código

- `apps/backend/prisma/schema.prisma`: campos de turno en `MediaJob`.
- `apps/backend/prisma/migrations/20261012150000_media_processing_claim/migration.sql`: migración aditiva con restricciones.
- `apps/backend/src/lib/mediaJobClaims.ts`: función interna `claimNextQueuedMediaJob`.
- `apps/backend/src/lib/mediaJobClaims.integration.test.ts`: integración optativa contra PostgreSQL aislado.

| Campo interno | Significado |
| --- | --- |
| `processingSlot` | Puesto 1 o 2 ocupado por este trabajo; `UNIQUE` impide compartirlo |
| `executionToken` | UUID del intento asignado; permitirá condicionar futuras transiciones a su identidad |
| `processingStartedAt` | Hora de toma/inicio de la fase PROCESSING, obtenida de PostgreSQL |

La fecha de toma no mide cuándo comenzó la transformación nativa. El ejecutor ya existente cuenta sus 30 s desde su mensaje `started`. El enlace de ambos relojes/protocolos sigue pendiente; no calcular el timeout nativo solo con este campo.

La reserva `activeResourceKey` ya existente y el turno no son equivalentes: una bloquea el destino concreto, el otro reserva capacidad de toda la plataforma. El token tampoco implementa por sí solo rechazo de resultados antiguos: las futuras transiciones deberán compararlo.

## Cómo funciona la toma

```text
BEGIN
  adquirir bloqueo global de decisión
  consultar puestos ocupados (PROCESSING o PUBLISHING)
  sin puesto libre -> devolver null
  elegir primero QUEUED por createdAt, id
  sin candidato -> devolver null
  actualizar solo si todavía es QUEUED:
    PROCESSING + puesto + UUID de intento + hora de toma
COMMIT
devolver asignación interna
```

Se utiliza una transacción Prisma `ReadCommitted`, máximo 5 s y espera para obtener conexión de 2 s. `pg_advisory_xact_lock(7100, 1)` coordina la decisión entre conexiones/procesos de la aplicación que comparten esta base. Se libera al terminar la transacción. No se mantiene durante Sharp; no es un contador local ni una exclusión que impida dos transformaciones posteriores simultáneas.

El servicio devuelve `{id, ownerId, teamId, resourceKey, slot, executionToken, startedAt}` para uso interno. La consulta propia existente mantiene su selección permitida y no expone puesto/token. No se han agregado endpoints ni se acepta una toma solicitada directamente por el navegador.

FIFO de este bloque significa ordenar **los trabajos QUEUED elegibles presentes** por `createdAt`, con UUID como desempate. No usa `SKIP LOCKED`. `RECEIVING` no es elegible aunque se registrase antes: no hay archivo completo confirmado. El orden de admisión/recepción, su timestamp definitivo y el cupo de diez en espera se completan en otro bloque; esta prueba no acredita FIFO del recorrido de subida completo.

La transición repite `WHERE status = QUEUED` al escribir. Si otro código cambió el candidato, falla sin tomar otro silenciosamente. `UNIQUE(processingSlot)` y los CHECK añaden defensa ante escrituras que no participen del bloqueo global; los conflictos reconocidos de puesto se traducen a un 409 seguro, sin reintento automático. El mapeo reconoce el formato de errores `adapter-pg`; su camino excepcional no se forzó desde el servicio en esta integración.

## Garantías de estructura

- Puesto nulo o número 1/2; ningún número 3.
- `PROCESSING` y `PUBLISHING` exigen puesto, token y fecha.
- `RECEIVING`/`QUEUED` no tienen puesto ni identidad de ejecución.
- Los terminales no ocupan puesto; pueden conservar token/fecha coherentes como historial.
- Un puesto no puede pertenecer a dos filas simultáneamente.

`PUBLISHING` mantiene el puesto como reserva de la operación activa, aunque Sharp ya haya cerrado. La futura publicación/fin deberá decidir y liberar correctamente; aquí no hay función para finalizar o cancelar. Las pruebas simulan terminales solo en sus filas, sin procesos nativos asociados.

Estos CHECK no conocen si Sharp está vivo. La integración futura debe confirmar el cierre antes de liberar reserva/turno, tal como garantiza el [ejecutor](MEDIA-IMAGE-EXECUTOR.md). Si una toma queda confirmada y después cae el controlador, la reserva permanece: reconciliación/reinicio todavía pendientes, sin fingir liberación o reejecución automática.

## Validación real

Windows, Node 24.14.0, Prisma/adapter-pg 7.5.0 y PostgreSQL 16. Base de pruebas existente `127.0.0.1:55437/weblogros_ui`, contenedor `weblogros_ui_windows`. No se creó ni arrancó otro servicio.

Destino confirmado y snapshot previo: 13 usuarios, 2 equipos, 14 membresías, 19 logros, 0 trabajos. Solo esta nueva migración estaba pendiente; aplicada con `migrate deploy`, cliente generado y 19 migraciones al día. No reset/seed, ni escritura en la base principal de puerto 5432.

Comandos desde `apps/backend`:

```powershell
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate status
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.ui-windows node_modules/prisma/build/index.js generate
npm run build
npm run seed:check
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_CLAIMS_TEST="1"; require("./dist/lib/mediaJobClaims.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_REGISTRY_TEST="1"; require("./dist/lib/mediaJobs.integration.test.js");'
```

Build y `seed:check` PASS. **Toma: 5/5 PASS** contando la prueba contenedora; **registro anterior: 8/8 PASS**. Subcasos de toma:

1. Orden, exclusión de un `RECEIVING` más antiguo y DTO propio sin datos internos.
2. `PUBLISHING` retiene capacidad; una liberación simulada permite tomar al siguiente y conserva el token histórico.
3. Ocho clientes Prisma independientes: exactamente dos trabajos distintos, puestos 1/2 y seis respuestas null; IDs son los siguientes de la cola.
4. CHECK de rango, transición incompleta y UNIQUE real entre dos filas distintas; rollback deja el candidato QUEUED sin puesto/token. Dos candidatos con misma fecha se toman por UUID ascendente.

Una revisión independiente detectó una fixture que actualizaba el puesto sobre su propia fila: se corrigió para provocar una colisión real entre dos filas antes de la prueba final. El primer ensayo ejecutado detectó que el caso de puesto 3 violaba dos CHECK y PostgreSQL notificaba el de coherencia: se ajustó con estado/token/fecha válidos, aislando el CHECK de rango. No se debilitó ninguna restricción de producción para pasar las pruebas.

Ambas integraciones afirman host/puerto/base y limpian solo sus fixtures. La de toma aborta si hay trabajos ajenos elegibles/ocupando puestos que pudiese consumir. Snapshot final idéntico al inicial, 0 trabajos restantes. Sin fotos personales, temporales de imagen ni S3.

## Pendientes y pausa guiada

No se cierra T02.03 ni T05.03. Faltan admisión/recepción y diez esperas, FIFO del recorrido completo, 180 s, referencia temporal/tipo de imagen, ejecutar la asignación, transiciones condicionadas por token, cancelación/publicación, recuperación y limpieza durable. No hay disparador automático de la cola.

Continuación posterior del 2026-10-12: usuario comprende transacción corta y autoriza [el enlace con Sharp/resultados](MEDIA-JOB-EXECUTION.md), ya probado. La pausa vigente pasa a comprensión del enlace antes del siguiente bloque. Admisión completa, disparador, publicación y recuperación siguen pendientes; UI pausada.

Actualización 2026-10-13: [admisión interna](MEDIA-JOB-ADMISSION.md) probada, toma ordena ahora por queuedAt/id y rechaza plazos vencidos. Esperas RECEIVING/QUEUED limitadas a diez bajo el mismo lock; 180 s solo desde QUEUED. Fixtures anteriores usan fechas explícitas para aislar sus pruebas de turnos del vencimiento. Toma5/5 PASS tras el cambio. Receptor/controlador/presupuesto físico y publicación pendientes; pausa de comprensión de admisión. Los apartados anteriores con createdAt representan la primera entrega histórica.

Fuentes primarias para los mecanismos empleados: [bloqueos de PostgreSQL 16](https://www.postgresql.org/docs/16/explicit-locking.html#ADVISORY-LOCKS) y [transacciones Prisma](https://www.prisma.io/docs/orm/fundamentals/transactions). El algoritmo de dos puestos y sus límites son decisiones propias verificadas en los casos indicados.
