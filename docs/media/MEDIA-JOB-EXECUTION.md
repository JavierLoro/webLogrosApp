# 7.10 — Enlace de la toma con Sharp y registro del resultado

Fecha: 2026-10-12. **IMPLEMENTADO Y VERIFICADO LOCALMENTE.** El usuario comprendió la transacción corta y autorizó seguir, manteniendo subagentes y explicación antes de avanzar. Este bloque ejecuta una toma existente; no hay receptor HTTP, cola automática, S3 ni asociación de imagen al recurso.

## Código y datos internos

- `apps/backend/src/lib/mediaJobExecution.ts`: `executeClaimedMediaJob` enlaza asignación, ejecución y resultado persistente.
- `apps/backend/src/lib/mediaJobExecution.integration.test.ts`: integración real y fallos/calendario inyectados.
- `apps/backend/prisma/migrations/20261012170000_media_job_execution/migration.sql`: ampliación aditiva de `MediaJob`.
- `mediaJobClaims.integration.test.ts`: fixture PUBLISHING estructural actualizada para los nuevos CHECK; no es una imagen real de producto.

| Campo nuevo | Qué registra |
| --- | --- |
| `executorStartedAt` | Reserva de inicio de una sola ejecución para esta toma; no el comienzo del hilo nativo |
| `imageKind` | achievement, logo o avatar, resuelto por el futuro llamador de backend |
| `inputDirectory` | Directorio temporal interno derivado de raíz confiable + UUID del trabajo |
| `resultDirectory` | Intento de variantes generado y validado por el ejecutor |
| `resultManifest` | JSON técnico de variantes: nombres, dimensiones, formato y bytes; no imágenes/originales/metadatos personales |
| `cleanupPendingDirectory` | Referencia privada de un intento cuya limpieza necesita comprobarse/reintentarse |

La lectura propia mantiene su selección explícita: no expone ninguno de estos campos ni token/puesto. No hay endpoint que permita al navegador elegir una ruta o presentar una toma.

## Recorrido implementado

1. Validar con Zod la asignación y el tipo. Comprobar raíz/directorio/entrada existentes, regulares y sin symlinks; no crear ni recibir archivos. El job vive exactamente en `raíz-canónica/UUID/input.tmp`.
2. Actualizar condicionalmente PROCESSING con token/puesto/propietario/equipo/recurso/fecha de toma coincidentes y `executorStartedAt = NULL`. Solo una llamada consigue registrar el comienzo; las demás fallan sin arrancar Sharp.
3. Ejecutar `await executeMediaImage(...)` fuera de una transacción. Su contrato confirma cierre del proceso antes de devolver o rechazar y valida variantes reales.
4. Registrar resultado mediante otra escritura condicional que también exige la marca de inicio de esta ejecución.

El marcador `executorStartedAt` se fija antes del fork: significa «este intento ya reservó su ejecución», no prueba que el hijo haya arrancado ni autoriza reintento. La raíz temporal procede de configuración interna del llamador; su variable/ruta operativa definitiva y el receptor se completarán después. Si la preparación/configuración falla antes del CAS, no se arranca un hijo ni se libera artificialmente la reserva de la toma.

### Éxito de Sharp

Se guardan manifiesto y ruta privados y se pasa a **PUBLISHING**, conservando puesto, reserva de destino y token. `completedAt` permanece null. Nunca se escribe SUCCEEDED aquí: todavía faltan almacenamiento verificado y asociación al recurso.

La frontera de entrega local comienza al iniciar la escritura a PUBLISHING. Si esa entrega se confirma y una señal de cancelación llegó mientras tanto, el resultado devuelve `cancellation: too_late`; no se comunica CANCELED ni se borran variantes. No equivale a un protocolo de cancelación distribuida durante publicación.

### Fallo o cancelación durante ejecución

Tras el rechazo del ejecutor, con proceso cerrado o sin haber creado ninguno, se escribe FAILED o CANCELED según la causa segura. Se libera `processingSlot` y `activeResourceKey`, se fija `completedAt` y se conserva identidad histórica/entrada temporal. Si el ejecutor no pudo limpiar su intento, se registra la referencia privada pendiente.

El servicio comunica esas situaciones con AppError seguro (cancelación 409; fallo de imagen 422); el estado confirmado queda consultable en PostgreSQL. No incluye ruta ni error nativo en el mensaje entregado.

### Cancelación después de generar variantes y antes de entregar

Si la señal local ya está abortada al regresar el ejecutor, el orden es:

```text
Sharp ya cerrado
  -> CAS confirma CANCELED y registra cleanupPendingDirectory
  -> solo si el CAS confirmó: retirar el intento propio
  -> si retirada/ausencia confirmada: limpiar la referencia pendiente
```

Un CAS con cero filas o un fallo DB **no borra resultados**. El borrado recursivo comprueba la ruta absoluta, padre exacto, prefijo `variants-*`, tipo y canonicalidad. No sigue symlinks ni toca entrada/resultados anteriores. Si no puede comprobar/borrar, permanece pendiente. Si falla el segundo UPDATE que retira la referencia, no se convierte la cancelación confirmada en fallo ni se vuelve a procesar: el reconciliador futuro comprobará ese resto.

### Error al guardar el resultado

Un fallo de persistencia comunica 503 y conserva archivos/reserva; no se interpreta como fallo de Sharp ni se fuerza un terminal. Un CAS que pierde autoridad comunica 409 sin escribir sobre el intento vigente. El inicio de una sola ejecución sigue marcado, impidiendo reejecución silenciosa.

La prueba inyectada rechaza la escritura antes de ejecutarla y confirma que queda PROCESSING. Una pérdida real de conexión durante una escritura puede dejar resultado de commit incierto: no afirmar que siempre queda PROCESSING, no borrar archivos ni liberar una reserva de PROCESSING/PUBLISHING sin reconciliar. Recuperación durable todavía pendiente.

## Integridad y alcance de cancelación

Los CHECK exigen tipo válido, tipo/ruta cuando hay marca de inicio, resultados emparejados con JSON objeto y PUBLISHING con inicio/manifiesto/ruta. RECEIVING/QUEUED/PROCESSING no llevan resultados publicados. Los terminales pueden conservar un par histórico coherente para el ciclo futuro; este runner no transforma éxito de Sharp en SUCCEEDED.

`Prisma.DbNull` retira un valor JSON como NULL de SQL; `Prisma.JsonNull` almacenaría un JSON literal null, que no es el objeto requerido por el CHECK. No mezclar ambos al limpiar el manifiesto.

La cancelación usa **AbortSignal local del controlador que ejecuta**. No está conectada a navegación, logout, una petición HTTP ni otros procesos/instancias. No se implementó cancelación distribuida, cancelación durable solicitada en DB, permisos al asociar/publicar ni recuperación tras reinicio. Una solicitud de cancelar nunca se presenta por sí sola como cancelación confirmada.

## Validación ejecutada

Windows, Node 24.14.0, Sharp 0.35.5, Prisma/adapter-pg 7.5.0, PostgreSQL 16. Servicio de pruebas existente `weblogros_ui_windows`, base `127.0.0.1:55437/weblogros_ui`; no se creó ni arrancó otro servicio.

Solo esta nueva migración estaba pendiente y se aplicó con 0 trabajos existentes. Cliente regenerado, build/seed:check PASS y **20 migraciones al día**. Sin reset, seed ni cambios en la base principal de puerto 5432.

Comandos desde `apps/backend`:

```powershell
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate status
node --env-file=.env.ui-windows node_modules/prisma/build/index.js migrate deploy
node --env-file=.env.ui-windows node_modules/prisma/build/index.js generate
npm run build
npm run seed:check
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_EXECUTION_TEST="1"; require("./dist/lib/mediaJobExecution.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_CLAIMS_TEST="1"; require("./dist/lib/mediaJobClaims.integration.test.js");'
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_REGISTRY_TEST="1"; require("./dist/lib/mediaJobs.integration.test.js");'
```

**Enlace: 12/12 PASS** contando contenedor; **toma: 5/5 PASS** y **registro: 8/8 PASS** tras la migración. Subcasos de enlace:

1. PID muerto antes de escribir PUBLISHING, manifiesto/ruta recuperados desde otra conexión, reserva conservada.
2. Token incorrecto: ningún arranque ni alteración de marca/tipo/ruta de la toma vigente.
3. Dos llamadas simultáneas de la misma toma: un solo trabajador, éxito + 409.
4. Imagen inválida: FAILED y liberación confirmada.
5. Cancelación durante transformación: PID muerto, CANCELED y entrada/variantes anteriores conservadas.
6. Timeout: FAILED/PROCESSING_TIMEOUT después del cierre.
7. Cancelación durante entrega que gana: PUBLISHING/too_late, sin falsa cancelación.
8. Fallo inyectado de escritura PUBLISHING: 503, reserva y variantes reales conservadas.
9. Abort controlado después del cierre real de Sharp: CANCELED antes de retirar el intento; referencia pendiente vaciada tras retirada.
10. Fallo inyectado del CAS de cancelación posterior a Sharp: PROCESSING/reserva/archivos conservados.
11. UPDATE SQL que intenta PUBLISHING sin manifiesto: CHECK rechaza, fixture vuelve a PROCESSING sin inicio/tipo.

Las inyecciones usan un Proxy solo sobre `updateMany` y un wrapper temporal del export CommonJS del ejecutor que llama al Sharp **real** y aborta después de recibir su resultado. Se restauran en finally y los casos se ejecutan secuencialmente. No hay API de test añadida a producción; no son caída real de PostgreSQL, partición de red ni carrera entre controladores externos.

Revisión independiente detectó borrado antes de confirmar CAS CANCELED; corregido antes de cerrar y cubierto con los dos casos posteriores al cierre real. Gate del revisor sin bloqueos dentro de este alcance. Las pruebas afirman destino/vacío de trabajos ajenos y limpian solo IDs/carpetas propias con alcance absoluto verificado.

Snapshot antes y después: **13 usuarios, 2 equipos, 14 membresías, 19 logros, 0 trabajos**; fixtures/temporales retirados. Imágenes sintéticas, sin fotos personales ni S3. No se midió carga máxima/RSS ni se habilitaron imágenes en frontend.

## Pausa y pendientes

T02/T03/T05 siguen parciales. Falta admisión/recepción con diez esperas, FIFO completo y 180 s; disparador automático; contratos/API/permisos; almacenamiento/asociación/lectura; cancelación distribuida, reinicio y limpieza durable; corpus/carga y recorridos de producto.

Esperar comprensión de este enlace antes del siguiente bloque. Antes de abrir la subida HTTP se concretará admisión/recepción/orden; publicación debe completar referencias/permisos y S3 conforme a [MEDIA-PLAN](../MEDIA-PLAN.md). UI y despliegue conservan su pausa/alcance independiente.

Continuación 2026-10-13: usuario comprende que Sharp terminado no significa imagen lista y autoriza [admisión interna](MEDIA-JOB-ADMISSION.md), ya probada. Enlace12/12 PASS tras nueva migración/fixtures de tiempos; pausa vigente pasa a comprensión de admisión antes de receptor/controlador. HTTP/publicación/recuperación siguen pendientes.
