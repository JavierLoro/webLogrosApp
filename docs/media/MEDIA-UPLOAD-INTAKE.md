# 7.10 — Enlace de recepción y Prisma

Fecha: 2026-10-15. **IMPLEMENTADO Y VERIFICADO LOCALMENTE: 14/14 PRUEBAS DEL ENLACE PASS.** Usuario comprende await y pide explícitamente implementar el enlace con explicación de código. Alcance interno: admisión, recepción física, referencia temporal y transición durable a QUEUED. No añade endpoint, permisos de producto, disparador Sharp ni publicación.

## Responsabilidades

`mediaUploadIntake.ts` coordina el recorrido. `mediaJobReceipts.ts` contiene operaciones cortas de DB y su identidad interna. `mediaUploadReceiver.ts` conserva su responsabilidad de transporte/disco sin importar Prisma. `mediaJobAdmission.ts` confirma el paso a QUEUED con evidencia de la recepción propia.

```text
receiveAndQueueMediaJob
  -> admitReceivingMediaJob           transacción breve: reservar destino/espera
  -> startMediaJobReceipt             escritura breve: token/ruta/tipo
  -> await receiveMediaUpload         red/disco fuera de transacción
  -> markMediaJobQueuedAfterClosedReceipt
                                     escritura breve: ruta/tipo/QUEUED/fechas
```

La nueva identidad de recepción es distinta de executionToken de Sharp. Identifica qué recepción puede confirmar/finalizar este trabajo; no sustituye sesión ni permisos. El destino, propietario, equipo y tipo deben venir de un llamador servidor previamente autorizado.

## Archivos y contratos de código

| Archivo | Cambio |
| --- | --- |
| src/lib/mediaUploadIntake.ts | Nuevo: fachada receiveAndQueueMediaJob y helpers de cierre, validación y adaptación de errores |
| src/lib/mediaJobReceipts.ts | Nuevo: tipo/esquema MediaJobReceiptClaim, inicio one-shot y cierre terminal por CAS |
| src/lib/mediaJobAdmission.ts | Acuse QUEUED ahora exige claim completo; CAS y repetición idempotente comparan token/fecha/propietario/equipo/destino/ruta/tipo |
| prisma/schema.prisma | receiptToken UUID nullable y receiptStartedAt nullable |
| prisma/migrations/20261015100000_media_job_receipts/migration.sql | CHECK empareja token/fecha y exige ruta/tipo si hay recibo; permite históricos sin recibo |
| src/lib/mediaUploadIntake.integration.test.ts | Nuevo: enlace con DB/Busboy/disco reales y fallos/cancelaciones controlados |
| src/lib/mediaJobAdmission.integration.test.ts | Fixtures de recibos simulados adaptan el contrato estricto; caso adicional de inicio único |

Las rutas de la tabla son relativas a apps/backend. El receptor y su protocolo de transporte no requirieron cambios para este enlace. Se añadieron comentarios pedagógicos y [apuntes](../apuntes.md).

`receiveAndQueueMediaJob(source, headers, input, options, db?)` valida input/options con Zod (su tipo de entrada es unknown), reserva un job nuevo y devuelve `{ job: MediaJobView, cancellation: "none" | "too_late" }`. El caller no elige UUID del trabajo. El DTO sigue siendo la selección explícita de estado/fechas/código, sin token ni rutas.

`startMediaJobReceipt(identity, workspace, db?)` emite el token y la fecha desde DB solo si la fila sigue RECEIVING y aún no tiene recibo. El UPDATE es un CAS de un solo uso. Valida ruta absoluta/normalizada con basename igual al UUID; la existencia/canonicalidad de raíz la verifica la fachada antes, no el módulo de DB. El recibo autoriza una recepción, no afirma que ya exista el archivo.

`markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true }, db?)` mantiene el lock común y confirma ruta/tipo/QUEUED/queuedAt/queueExpiresAt en un UPDATE condicionado. Una repetición solo devuelve el mismo QUEUED si coincide toda la identidad y conserva el deadline. Vencido, confirma WAIT_TIMEOUT antes del 409. El booleano sigue siendo una precondición de cierre del llamador; la fachada la establece después del retorno real del receptor.

`finishMediaJobReceipt(claim, outcome, db?)` solo terminaliza RECEIVING bajo el mismo claim/lock. Libera activeResourceKey en ese cambio, conserva identidad histórica y admite únicamente un código seguro de transporte y una ruta pending igual al directorio del claim. No borra archivos.

`observeSource` instala listeners de error/close/abort antes de los awaits de DB y conecta una promesa de cierre. `stopAndWait` destruye y espera close, sin confundir destroyed con cerrado. `failKnownReceipt` devuelve Promise<never>: después de guardar el terminal siempre lanza un AppError seguro, nunca un éxito que permita seguir encolando.

## Reglas del enlace

1. Validar configuración/entrada antes de admitir cuando sea posible. El servicio debe cerrar la fuente compatible también si falla antes de iniciar la pipeline; un preflight del receptor aislado no la consume.
2. No empezar a escribir si la toma de recepción falla o su commit es incierto. No usar un booleano declarado por el navegador como prueba de propiedad/cierre.
3. Mantener separado el catch del receptor del catch que guarda QUEUED. Si Prisma falla después de recibir bien el archivo, conservarlo y conservar el estado que realmente quedó en DB. No declarar FAILED ni borrarlo por asumir rollback.
4. En fallo conocido de transporte, cerrar/esperar fuente y receptor antes de guardar FAILED/CANCELED y liberar reserva. Si no se puede comprobar propiedad/cierre, conservar RECEIVING.
5. EEXIST o espacio con propiedad dudosa no autorizan borrar ni declarar que la recepción quedó correctamente finalizada.
6. Cancelación local anterior al handoff confirmado puede guardar CANCELED con ruta pendiente. Si QUEUED gana la entrega a DB, informar too_late y mantener archivo; no inventar cancelación ni borrar un input que puede tomar Sharp.

La limpieza que quede marcada para después no es un original permanente ni un borrador de producto. El limpiador durable/presupuesto de restos siguen pendientes; este bloque no habilita subidas de la app hasta completar esos controles y HTTP/autorización.

## Validación y siguiente paso

Windows, Node24.14.0, Prisma/adapter-pg7.5.0, Busboy1.6.0 y PostgreSQL16. Docker Desktop se recuperó con ayuda del usuario; se arrancó solo el contenedor existente weblogros_ui_windows. SeaweedFS quedó detenido. Base guardada por host/puerto/nombre: **127.0.0.1:55437/weblogros_ui**. Snapshot previo13 usuarios/2 equipos/14 membresías/19 logros/0 jobs. Solo nueva migración20261015100000 pendiente; aplicada con migrate deploy, cliente generado y **22 migraciones al día**. Sin reset/seed ni escrituras en la base principal5432.

**Enlace14/14 PASS**, **admisión9/9 PASS** (ocho subcasos más contenedor), **toma5/5 PASS**, build/seed:check/diff-check PASS. Revisión estática independiente PASS en versión congelada. Los comentarios pedagógicos añadidos después no cambian semántica; build final PASS.

Casos del enlace (trece subcasos y contenedor):

1. Archivo real recibido/cerrado, claim privado, ruta/tipo/QUEUED y plazo180s persistidos; DTO sin rutas. Token incorrecto rechaza; repetición propia no renueva el reloj.
2. Destino ocupado: segundo source cerrado, sin carpeta adicional.
3. Cola llena: source no leído y cierre confirmado; no admite otro trabajo.
4. Multipart incompleto: FAILED tras cerrar; libera destino.
5. Firma inválida: FAILED y causa segura, sin filtrar detalles del sistema.
6. Abort durante transferencia con _destroy demorado: hook del terminalizador comprueba source.closed antes de guardar CANCELED.
7. EEXIST inyectado después de tomar recibo: conserva archivo anterior y RECEIVING/reserva, sin limpiar.
8. Pre-abort: cierre de fuente sin crear job.
9. Fallo después del commit de ACK: 503, QUEUED y archivo conservados.
10. Fallo antes del commit de ACK: 503, RECEIVING y archivo conservados.
11. Abort durante ACK que confirma: devuelve QUEUED/too_late, no cancelación ficticia.
12. Fallo de inicio de recibo: RECEIVING sin token, transferencia no iniciada y sin directorio.
13. Abort al volver del receptor ya cerrado antes del handoff: CANCELED y cleanupPending con archivo conservado para limpieza posterior.

La admisión adaptada comprueba inicio one-shot, propiedad/ruta del recibo, idempotencia/expiración, carreras10+2 y FIFO. Usa claims simulados sin crear archivos; el enlace es la prueba con transporte/disco reales. La migración se aplicó con cero jobs existentes; compatibilidad de filas sin recibo se verifica con las fixtures de toma, no con un upgrade real de recepciones en vuelo.

Las inyecciones de fallos usan Proxy de Prisma antes/después de transacciones reales. Los casos de EEXIST/cancelación al retorno y cierre terminal usan wrappers temporales de exports CommonJS que llaman a las funciones reales, restaurados en finally, sin una API de test en producción. No son una partición real de red ni una caída real de PostgreSQL.

Al acabar cada suite, mismos recuentos **13/2/14/19/0**; fixtures y temporales propios retirados tras verificar raíz/prefijo/realpath. Sin fotos personales ni escrituras S3. No hubo un endpoint HTTP real ni decodificación de esas entradas en Sharp.

Comandos desde apps/backend:

```powershell
node --env-file=.env.ui-windows node_modules/prisma/build/index.js generate
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy
npm run build
node --env-file=.env.ui-windows -e 'process.env.MEDIA_UPLOAD_INTAKE_TEST="1"; require("./dist/lib/mediaUploadIntake.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_ADMISSION_TEST="1"; require("./dist/lib/mediaJobAdmission.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_CLAIMS_TEST="1"; require("./dist/lib/mediaJobClaims.integration.test.js");'
npm run seed:check
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate status
```

## Límites conservados

- Sigue siendo obligatorio que el source emita close; un Readable arbitrario con emitClose:false puede dejar la espera bloqueada. La fachada es dueña de su fuente tras validar el tipo y la cierra incluso ante rechazo. El adaptador HTTP deberá coordinar cuerpo/socket/respuesta; no conectar la fachada a req sin verificar cómo se entrega un error HTTP cuando se cierra el cuerpo.
- Si la admisión inicial confirma pero Prisma pierde su respuesta, el servicio todavía no conoce el UUID generado. Puede quedar RECEIVING/reserva sin token/directorio ni ID devuelto. No se reintenta ni se finge éxito: recuperación por propietario/destino o identidad conocida antes de tx se completará en otro bloque.
- Un commit incierto al iniciar recibo o confirmar QUEUED deja el estado que DB haya confirmado. No borrar ni liberar por inferencia; reconciliación sigue pendiente.
- Cancelar al volver del receptor conserva el input con pending: no hay limpiador durable ni presupuesto de restos aplicado. EEXIST retiene reserva porque cerrar esta fuente no demuestra ausencia de otro escritor.
- Autorización de sesión/destino, plazo de recepción, presupuesto de disco, controlador automático/expiración periódica, HTTP, recuperación, permisos al publicar y S3/asociación siguen pendientes. Los campos ownerId/resourceKey/imageKind son entradas internas, no facultades del navegador.

Tras comprobar este bloque, explicar firma, claim, transacciones cortas, CAS y límites de los catch; esperar comprensión antes de controlador/HTTP o siguiente conexión de ejecución. UI conserva su pausa.
