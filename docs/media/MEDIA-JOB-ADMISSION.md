# 7.10 — Admisión y espera de imágenes

Fecha: 2026-10-13. **IMPLEMENTADO Y VERIFICADO LOCALMENTE EN SU ALCANCE INTERNO.** Pieza anterior a la recepción HTTP. El usuario comprende por qué Sharp no basta para anunciar una imagen lista y autoriza continuar por puntos con subagentes.

## Contrato del bloque

| Momento | Capacidad y tiempo |
| --- | --- |
| Antes de recibir bytes | Reservar destino y una de las diez plazas compartidas por RECEIVING y QUEUED |
| Durante la subida | RECEIVING ocupa plaza; todavía no puede tomar turno de Sharp |
| Recepción completa y cerrada | El receptor confirma validación/cierre; transición a QUEUED y reloj de espera de 180 s |
| Toma de un turno | Primer QUEUED por queuedAt/id, sin plazo vencido; sale de espera y ocupa puesto 1/2 |
| Asociación/publicación | PUBLISHING conserva el puesto hasta resultado confirmado |

Los **180 s son espera en cola**, desde la confirmación de la recepción completa. No se descuentan los segundos de transferencia. La explicación inicial del Coordinator que los incluía fue corregida antes de fijar el código; se conserva el contrato D06. La futura recepción necesita su propio control de duración/desconexión y cierre físico, todavía pendiente.

FIFO significa orden de archivos completos por `queuedAt`, con UUID como desempate. Una transferencia incompleta anterior no bloquea los archivos completos. `createdAt` sigue siendo fecha del registro; no representa entrada en la cola de procesamiento.

Diez transferencias simultáneas pueden ocupar todas las plazas de espera aunque Sharp tenga puestos libres. Con dos operaciones activas y diez esperas hay doce trabajos. Si ningún trabajo está activo se admiten diez esperas, no doce: las dos plazas activas no se prestan a transferencias adicionales. No se añaden cuotas por persona/equipo a estos topes globales.

## Coordinación y cierre

Admisión, confirmación de recepción y toma usan el mismo bloqueo transaccional global de PostgreSQL. Las transacciones terminan antes de recibir bytes o ejecutar Sharp. El límite de diez es una garantía del protocolo de servicios que participan en ese bloqueo; el registro de bajo nivel y una escritura SQL directa no constituyen admisión autorizada.

Solo se vencen automáticamente QUEUED, donde el contrato de recepción ya confirmó cierre. Un RECEIVING antiguo conserva plaza y reserva: una fecha antigua no demuestra que haya dejado de escribir. El receptor/reconciliador futuro deberá cerrar o confirmar ausencia del flujo antes de liberarlo.

Expirar cambia el registro a FAILED con causa segura WAIT_TIMEOUT y libera la reserva de destino. No borra archivos ni inicia otro intento. Las referencias temporales conocidas deben conservarse para limpieza posterior. Los restos siguen contando para el futuro presupuesto de disco aunque el registro ya no ocupe plaza de espera.

## Validación y límites

Destino confirmado antes del trabajo: base aislada `127.0.0.1:55437/weblogros_ui`, 13 usuarios, 2 equipos, 14 membresías, 19 logros y 0 trabajos. Docker Desktop y el contenedor PostgreSQL existente recuperados; no se arrancó SeaweedFS ni la aplicación.

Solo estaba pendiente `20261013100000_media_job_admission`; aplicada con `migrate deploy`, sin reset ni seed. Cliente Prisma 7.5 regenerado, backend build y seed:check PASS; **21 migraciones al día**. La migración empareja fechas, exige fechas en QUEUED/PROCESSING/PUBLISHING y las prohíbe en RECEIVING. El backfill conserva trabajos anteriores usando fecha de toma o creación; la aplicación real se hizo con cero trabajos, no demuestra un upgrade con trabajos en vuelo.

**Admisión 8/8 PASS** (siete subcasos más contenedor), toma 5/5, enlace Sharp 12/12 y registro 8/8 tras el cambio. Revisión independiente sin bloqueos para capacidad/FIFO/plazo/idempotencia, con límites de limpieza y disparador registrados abajo.

1. Doce clientes concurrentes admiten diez RECEIVING y rechazan dos con 503.
2. Doce nuevas admisiones compiten con dos tomas de trabajos QUEUED previos: máximo diez esperas, dos puestos distintos y doce trabajos entre ambos grupos. El orden de adquisición puede admitir entre ocho y diez nuevos trabajos.
3. Destino duplicado produce uno admitido y un 409. Confirmación exige propietario y acuse literal de cierre en runtime; CHECK rechaza fechas incoherentes. Repetir el acuse no renueva el plazo; repetirlo vencido confirma FAILED antes de responder 409.
4. FIFO sigue recepción completa aunque createdAt esté invertido; la fixture fija dos fechas queuedAt sintéticas separadas por un segundo para evitar empate y comprueba que ambos órdenes son opuestos. Los 180 s entre queuedAt/deadline reales se comprueban en el caso de confirmación.
5. Dos activos más diez esperando rechazan otra admisión; las recepciones siguen reservadas.
6. Barrido de un QUEUED vencido se confirma aunque la nueva admisión resulte llena. Este caso usa una escritura de fixture de bajo nivel para provocar un exceso excepcional; esa escritura no es el camino de admisión del producto.
7. La toma termina un QUEUED cuyo plazo ya se alcanzó y devuelve null, sin iniciar Sharp. La fixture fija la fecha con reloj DB y después invoca el servicio; no congela el reloj para demostrar igualdad temporal exacta. La comparación `<=` define la frontera en código.

Primer ensayo encontró una comilla incorrecta en la consulta de toma; se corrigió. La revisión encontró un acuse repetido que devolvía QUEUED vencido; se añadió barrido antes del resultado idempotente y cobertura. Coordinator reforzó la fixture FIFO para que distinguiera realmente ambos órdenes; su siguiente ensayo detectó inferencia ambigua timestamp/intervalo en un parámetro de test, corregida con cast explícito. No se debilitaron restricciones para pasar las pruebas.

Las pruebas guardan host/puerto/base, rechazan trabajos ajenos que pudiesen consumir, usan IDs/propietarios propios y retiran sus fixtures. Recuentos finales idénticos: **13/2/14/19/0**. El ensayo de enlace retiró también sus temporales propios. Sin fotos personales ni escrituras S3.

Comandos desde `apps/backend`:

```powershell
node --env-file=.env.ui-windows node_modules/prisma/build/index.js generate
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy
npm run build
npm run seed:check
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_ADMISSION_TEST="1"; require("./dist/lib/mediaJobAdmission.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_CLAIMS_TEST="1"; require("./dist/lib/mediaJobClaims.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_EXECUTION_TEST="1"; require("./dist/lib/mediaJobExecution.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_REGISTRY_TEST="1"; require("./dist/lib/mediaJobs.integration.test.js");'
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate status
```

Código: `mediaJobAdmission.ts` admite y confirma recepción; `mediaJobCoordination.ts` comparte lock/conteo/barrido; `mediaJobClaims.ts` toma por queuedAt sin aceptar vencidos. Schema/migración y fixtures previas adaptados. Se conservan notas pedagógicas `// 📚` y [apuntes](../apuntes.md).

Este bloque no recibe archivos, comprueba cierre físico ni aplica la cota temporal de 1 GiB/margen libre. No hay ruta HTTP, disparador automático, temporizador permanente de expiración, permisos del destino, S3/asociación, cancelación distribuida ni recuperación tras reinicio. El servicio consulta/vence la cola cuando se invoca; falta el controlador que lo invoque a tiempo. T02/T03/T05 siguen parciales y el workstream UI permanece pausado.

El barrido conserva `inputDirectory` como cleanupPendingDirectory **si ya existe**. Actualmente esa ruta se registra al arrancar PROCESSING: el receptor futuro debe persistirla al confirmar recepción, o el limpiador derivarla desde raíz confiable + UUID. Por tanto este PASS no garantiza limpieza de una entrada QUEUED vencida ni prueba el presupuesto de disco. Una carpeta retenida nunca se borra solo por conocer una ruta: exige alcance y cierre comprobados.

Siguiente acción: explicar esta pieza y esperar comprensión antes de montar el receptor/controlador. El acuse interno `receiverConfirmedClosed: true` expresa una precondición; no es un comprobador físico ni una afirmación del navegador.

Continuación 2026-10-15: usuario comprende las diez reservas y autoriza continuar con explicación centrada en código. [Receptor aislado](MEDIA-UPLOAD-RECEIVER.md) implementado/probado14/14 sin Prisma. Antes de enlazarlo, esperar comprensión de sus archivos/funciones. La ruta temporal y el estado QUEUED todavía no se guardan automáticamente a partir de su retorno; los límites anteriores de este documento siguen aplicando al enlace pendiente.

Continuación posterior 2026-10-15: [enlace recepción/Prisma](MEDIA-UPLOAD-INTAKE.md)14/14 PASS y admisión adaptada9/9. `markMediaJobQueuedAfterClosedReceipt` exige ahora `{ claim, receiverConfirmedClosed: true }` con token/fecha/ruta/tipo/identidad completa; el contrato anterior id/owner/booleano describe el prototipo histórico y ya no debe usarse. La fachada nueva guarda ruta/tipo y confirma QUEUED tras el retorno cerrado del receptor. Las fixtures de este documento siguen siendo simuladas para DB; el enlace comprueba transporte/disco reales. Controlador, expiración periódica, presupuesto y limpieza durable/recuperación pendientes. Esperar comprensión del código del enlace.
