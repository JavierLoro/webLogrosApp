# Limpieza de temporales abandonados — Phase 7.10

Entrega local del 2026-10-18. Continuación de [recuperación](MEDIA-RECOVERY.md) y [cancelación](MEDIA-CANCELLATION.md). Alcance: barrido de la raíz temporal privada; no borra versiones permanentes de S3 ni cambia logros, propuestas, rankings o usuarios.

## Qué se considera abandonado

Un archivo antiguo no basta. El barrido exige carpeta UUID directa bajo la raíz canónica, marcador `.receipt-owner.json` exacto y owner persistido del mismo host/raíz que esté cerrado o cuyo PID ya no exista. El runtime actual, procesos vivos/desconocidos, trabajos activos, leases/tareas protegidos y referencias desde otros trabajos impiden el borrado.

La frontera es **24 horas inclusive** desde la actividad más reciente: mtime y ctime de carpeta, marcador, input y variantes; también cierre del owner y updatedAt del trabajo si existe. Producción consulta `clock_timestamp()` de PostgreSQL. Copiar o crear un archivo recientemente no lo envejece por conservar un mtime antiguo: ctime también cuenta.

| Caso | Tratamiento |
| --- | --- |
| Trabajo todavía activo, aunque sea antiguo | Conservar; recuperación/cancelación mantienen su protocolo propio |
| Trabajo terminal, sin otro consumidor y con limpieza pendiente | Reutilizar el limpiador terminal con prueba de cierre y señal de parada |
| Carpeta con marcador válido pero sin MediaJob | Registrar un plan en MediaOrphanCleanup antes de tocar archivos |
| Marcador ausente/ajeno, owner desconocido, archivos desconocidos o symlinks/junctions | Conservar para revisión; no apropiarse del contenido |
| Referencia de otro trabajo al directorio o a una variante | Conservar, incluso si ese otro trabajo es terminal |
| Archivos reaparecidos tras temporaryCleanedAt | Conservar para revisión; no declarar limpio solo porque exista el sello |
| Asset READY asociado a un logro | Conservar asset y referencia; retirar un original temporal no borra las versiones definitivas |
| Journal PENDING con contenido nuevo/modificado | Renovar la evidencia de actividad y esperar de nuevo el umbral; no usar la elegibilidad anterior para borrar contenido reciente |

«Cuarentena» significa conservación en su ubicación y registro de conteos, no mover ni renombrar los archivos. La raíz sigue teniendo su guard de capacidad: archivos desconocidos pueden bloquear nuevas admisiones hasta revisión, en vez de ser borrados para hacer espacio.

## Código

- `src/lib/mediaAbandonedCleanup.ts`: `sweepAbandonedMediaFiles()` descubre candidatos y journals, ordena su unión por UUID y procesa hasta100 por lote. `cursor`, `nextCursor` y `hasMore` permiten avanzar más allá de archivos conservados o pendientes. Los nombres desconocidos se cuentan, pero no se convierten en candidatos de borrado.
- `processWorkspace()` comprueba marcador, owner, actividad, estado y referencias. Un error consultando DB no se interpreta como ausencia de referencias. `findOtherReferences()` usa SQL parametrizado `starts_with` sobre texto literal: evita la interpretación de las barras de Windows como escapes de LIKE. La comparación respeta límites de directorio y casing de Windows.
- `prepareJournal()` escribe `MediaOrphanCleanup` bajo el mismo lock corto de coordinación que la cola, revalidando ausencia del trabajo y de otras referencias. No mantiene una transacción durante I/O de disco. Un COMPLETE reaparecido solo puede reabrirse para el mismo recibo, owner, raíz y ruta; no transfiere propiedad a otro marcador.
- `processJournal()` revisa todo el conjunto antes del primer unlink: solo `input.tmp`, el marcador y directorios `variants-*` con variantes regulares permitidas. Vuelve a comprobar propiedad y referencias después de esperas de DB. Borra archivos uno a uno, retira el marcador al final y usa rmdir sobre carpetas vacías; no hace borrado recursivo del workspace.
- El journal registra PENDING/COMPLETE, ruta, token, owner, evidencia de actividad y fallos. Si el proceso cae después de quitar el marcador, permite terminar únicamente un rmdir vacío de su ruta exacta. Si el directorio desapareció pero se perdió el ACK final, una nueva pasada confirma ausencia y completa el diario.
- Al retomar PENDING se vuelven a mirar timestamps de archivos. Los cambios de ctime de directorios causados por nuestros propios unlink no reinician la espera; nuevos archivos o modificaciones sí. Una fecha de actividad reciente sigue aplazando los siguientes reintentos aunque ya no haya más cambios. Un directorio de variantes vacío no contiene bytes pendientes que proteger mediante una espera nueva.
- `src/lib/mediaTemporaryCleanup.ts`: añade `signal` opcional y comprobaciones antes de unlink/rmdir, conservando compatibilidad con sus consumidores anteriores. Así también la rama de trabajos terminales se detiene cooperativamente.
- `src/lib/mediaRuntime.ts`: llama al barrido después de recuperación y antes del guard de capacidad al arrancar. Drena todos los lotes iniciales; durante operación avanza uno por poll hasta completar y empieza otro barrido una hora después. Usa el temporizador serial existente, sin otro contenedor ni cron. stop y pérdida de liderazgo abortan mantenimiento y esperan la pasada en curso. Una operación del sistema operativo ya emitida puede terminar; no se inicia otra tras observar abort.

El runtime mantiene la exclusividad de [MEDIA-RECOVERY](MEDIA-RECOVERY.md): un host/runtime por base, raíz privada y PID reutilizado/EPERM conservadores. El servicio es interno; no hay endpoint público de borrado ni parámetros de reloj recibidos del navegador.

## Persistencia y límites

`prisma/schema.prisma` y migración aditiva `20261018100000_media_orphan_cleanup` añaden `MediaOrphanCleanup` y su FK a MediaRuntimeOwner. No lleva FK a MediaJob porque representa precisamente una carpeta cuya fila de trabajo ya no existe. No elimina registros históricos del dominio ni owners como parte del barrido.

Los objetos S3 retirados siguen su diario existente, sus comprobaciones de referencias y la revisión horaria de COMPLETE. Este bloque no añade un listado global ni borra claves S3 que encuentre por antigüedad. Los restos cuyo propietario no pueda demostrarse se conservan; borradores, referencias futuras y la operación administrativa de revisión pertenecen a sus tareas correspondientes.

El límite de cien acota candidatos tratados por lote. Enumerar nombres e IDs requiere memoria y no equivale a validar carga o consumo máximo; esa medición sigue pendiente. Tampoco valida múltiples hosts, ACL de producción, backups o recuperación completa del sistema operativo.

## Evidencia

Windows, Node24.14.0 y PostgreSQL aislado `127.0.0.1:55437/weblogros_ui`. Migración aplicada solo ahí:26 migraciones al día.

- `mediaAbandonedCleanup.integration.test.ts`: **24/24 PASS**, incluido padre. Frontera24h, mtime/ctime/owner y updatedAt, cuatro estados activos, owner actual/vivo/desconocido/ajeno, tareas protegidas, marcador ausente/ajeno, archivos desconocidos, junction, referencias literales/casing/descendientes y tardías, worker vivo, abort de terminal y tras journal, conservación de READY/referencia, sello reaparecido, fallo de disco, ACK final incierto, PENDING con archivo reciente, rmdir vacío, cursor y COMPLETE reaparecido con igual/distinto recibo.
- El último caso comprueba arranque con varios lotes, barrido horario y parada que espera mantenimiento, con reloj del scheduler y función de barrido controlados. No se ha esperado una hora real.
- La edad se prueba mediante `createMediaAbandonedCleanup({now})`, una factory interna de test. Archivos, consultas y journals son reales; no se esperaron24 horas ni se afirma haberlo hecho. Los fallos de EACCES/ACK son inyectados sobre I/O/DB reales. El recorrido del runtime usa un almacén en memoria para aislar su scheduler; las suites de API/publicación prueban SeaweedFS real por separado.
- Regresión del bloque: recuperación17, cancelación12, API13, pipeline18, ejecución12, intake14, admisión9, toma5, ejecutor11, limpieza5, receptor14 y S31: **155 comprobaciones PASS** con el barrido, incluidos padres. Build, seed:check, migrate status y formato PASS.
- Fixtures, journals, owners de pruebas y carpetas propias retirados; conteos de datos del proyecto conservados. Solo se borran las rutas de fixtures tras comprobar su raíz absoluta en el teardown.

Desde `apps/backend`, con el backend local detenido:

```powershell
npm run build
node --env-file=.env.ui-windows -e 'process.env.MEDIA_ABANDONED_CLEANUP_TEST="1"; require("./dist/lib/mediaAbandonedCleanup.integration.test.js");'
```

Pendientes de7.10: mediciones de recursos/corpus/carga, borradores/propuestas y publicación con imagen lista, revisión administrativa de casos conservados, otros destinos y controles/QA de navegador. El barrido local no cierra por sí soloT05.06/T08.01 ni la fase.

Estado final: backend compilado restaurado en3001, arranque con barrido PASS, health200 y lectura de imagen sin sesión401/no-store. Snapshot antes de restaurar:13 usuarios/2 equipos/14 membresías/19 logros,0 jobs/assets/cleanups/MediaOrphanCleanup y2 owners históricos del runtime de producto; el nuevo arranque crea su propio owner. Raíz de producto con solo su marcador, sin imágenes de prueba. Revisión independiente sin bloqueantes de borrado/reintento/parada. Sin commit/push ni despliegue.
