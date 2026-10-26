# UI Workstream Status

workstream: PAUSED — G7/G8 entregados; resto de pausa conservado
orchestration: ADAPTIVE_ROUTER_READY
current_phase: NONE — entrega local Phase 7.7 sin imágenes finalizada
current_task: NONE
last_functional_delivery: 7.10 recorrido backend borradores/propuestas con imagen DONE LOCAL — docs/media/MEDIA-DRAFTS-PROPOSALS.md
publication: PR #33 DRAFT — https://github.com/JavierLoro/webLogrosApp/pull/33; rama codex/media-backend-drafts-quality-20261027; sin merge/despliegue
current_iteration: 3 — correcciones y captura final
last_completed: UI-G7-T01–T05 / UI-G8-T01–T08 — PASS local, evidencia docs/phase-7.7/RESULT.md
next_action: Carga sostenida/mixta con el corpus de logros ya validado, incluido PNG de alta entropía; revisar RAM/CPU/disco/provisiones y repetir en servidor al retomar ese entorno. Revisión de casos conservados pendiente aparte. Frontal pausado; T08.01 sigue abierto antes de logos. No reanudar G9 ni A1/A2.
paused_mainline_task: UI-G9-T01 — fuera del alcance actual; A1/A2 aplazados

## Planificación vinculada vigente — 2026-10-27

**Entrega acotada — 2026-09-24:** G7/G8 y pasos 1–7 de 7.7 completados y verificados localmente. Evidencia: [resultado](../phase-7.7/RESULT.md). A1/A2 siguen aplazados, G6 provisional y G9 sin iniciar; el resto del workstream conserva la pausa solicitada. Imágenes de propuestas incluidas en 7.10: backend verificado localmente el 2026-10-26; frontal y QA completos pendientes.

**Pausa vigente fuera de la entrega:** G7/G8 cerrados localmente tras la reanudación autorizada de 7.7. Se conservan G0–G5 cerrados, G6 provisional, A1/A2 aplazados y G9 sin iniciar. Las fases independientes, como 7.10, mantienen su planificación.

- [Corpus y calidad de logros](../media/MEDIA-QUALITY-CORPUS.md) PASS local el 2026-10-27:38 casos (25 válidos/13 rechazos),71 variantes privadas,7 pruebas de herramienta y11 de compatibilidad Sharp. PNG exacto respecto a referencia; JPEG sin avisos de métricas y13 paneles inspeccionados a1×/2×. Máximo observado6,13MB por imagen con variantes; carga sostenida/mixta y servidor pendientes. Frontal pausado yT08.01 abierto; no habilita logos.
- [Borradores/propuestas con imagen](../media/MEDIA-DRAFTS-PROPOSALS.md): recorrido backend local verificado el 2026-10-26; 192/192 comprobaciones PASS, 27 migraciones solo base aislada. Frontal pausado y formularios de creación/propuesta temporalmente incompatibles. 7.10 parcial por corpus de otros destinos, dimensionamiento sostenido/servidor, revisión de casos multimedia conservados y frontal/QA; T08.01 sigue abierto y logos dependen de ese gate.
- Recorridos previstos: base común → logro completo y QA T08.01 → logos → avatares → QA/cierre local. Compresión, metadatos, tamaños/variantes, cancelación y recuperación del aviso ya acordados; no reabrirlos por entradas históricas anteriores.
- [Ciclo de vida del jugador](../PLAYER-LIFECYCLE-PLAN.md): T00 documental DONE, T01–T07 TODO. Diseño antes de relación avatar/equipo; archivo/reingreso antes de completar avatar específico; eliminación administrativa es entrega aparte, no absorbida por uploads.
- Ubicaciones de edición T07.01 aplazadas hasta nuevas pestañas. Backups/despliegue MEDIA-DEP-T01–T04 aplazados; R2 futuro; media de propuestas incluida en 7.10 por acuerdo del 2026-09-25. Mantener #11/#27/#28, A1/A2 y G6–G9 con sus propios pendientes y gates.
- La reordenación posterior de esta fecha aplaza A1/A2 y sustituye el foco anterior; conserva el override de comparación directa del Coordinator. Contrato vigente resumido en MEDIA-PLAN; los apuntes de decisiones siguientes son cronológicos y pueden reflejar propuestas posteriormente resueltas.

Conciliación documental del roadmap — 2026-10-26: [orden de los pendientes](../Roadmap.md#orden-de-los-pendientes) y [cierre de 7.10](../Roadmap.md#pendiente-para-cerrar-la-fase) actualizados con la evidencia existente. Se retiran menciones obsoletas a backend de borradores/cola/recuperación por implementar y a imágenes de propuestas en Phase 10. Sin ejecución nueva ni cambios de gates o pausa.

## Registro cronológico de decisiones

- 2026-10-27 — [Corpus y calidad de logros](../media/MEDIA-QUALITY-CORPUS.md) PASS local el 2026-10-27:38 casos (25 válidos/13 rechazos),71 variantes privadas,7 pruebas de herramienta y11 de compatibilidad Sharp. PNG exacto respecto a referencia; JPEG sin avisos de métricas y13 paneles inspeccionados a1×/2×. Máximo observado6,13MB por imagen con variantes; carga sostenida/mixta y servidor pendientes. Frontal pausado yT08.01 abierto; no habilita logos. Limpieza de71 objetos y fixtures verificada, conteos conservados; sin cambios productivos, migraciones ni seed. Las192 pruebas previas no se presentan como reejecutadas.

- 2026-10-26 — [Borradores/propuestas con imagen](../media/MEDIA-DRAFTS-PROPOSALS.md): recorrido backend local verificado el 2026-10-26; 192/192 comprobaciones PASS, 27 migraciones solo base aislada. Frontal pausado y formularios de creación/propuesta temporalmente incompatibles. 7.10 parcial por corpus/calidad, dimensionamiento sostenido/servidor, revisión de casos multimedia conservados, frontal/QA y otros destinos; T08.01 sigue abierto y logos dependen de ese gate.


- 2026-10-18 — [Barrido de abandonados](../media/MEDIA-ABANDONED-CLEANUP.md) implementado:24h de inactividad demostrada, referencias literales Windows, journal para carpetas sin job, reintento seguro y stop cooperativo; arranque por lotes y revisión horaria. Barrido24/24 y155 comprobaciones totales PASS;26 migraciones solo base aislada. Pendientes recursos/corpus/carga, borradores/propuestas, revisión administrativa, otros destinos y UI. Explicar código antes del siguiente bloque; no reanudar visual.

- 2026-10-17 — [Cancelación persistente](../media/MEDIA-CANCELLATION.md) conectada por API: flag en Prisma, aborto del runtime/receipts, guard en commit final y recuperación que conserva intención. Cancelación12/12, recuperación17/17 y131 comprobaciones totales PASS;25 migraciones solo base aislada. T02/T03/T05 parciales por abandonados24h, recursos/corpus/carga, borradores/propuestas, otros destinos y UI. Siguiente: explicar código de cancelación; después barrido de abandonados. UI conserva pausa.

- 2026-10-17 — Recuperación solicitada e implementada: [owners/reinicio/commit incierto](../media/MEDIA-RECOVERY.md), PID registrado antes de Sharp, receipts activos protegidos, limpieza propia y reintentos. Recuperación16/16, HTTP13/13 y pipeline18/18 PASS; migración aditiva solo base aislada/24 al día. T02/T03/T05 parciales; cancelación distribuida, abandonados24h, corpus/carga/RAM, borradores/propuestas, otros destinos y UI pendientes. Revisar código con usuario; no reanudar visual.

- 2026-10-17 — Continuación «conéctalo y luego explica»: [API/runtime de catálogo](../media/MEDIA-HTTP.md) montados en Express/arranque, POST202/estado/GET privado y revalidación antes de304. Leases, puente HTTP limitado, preflight/guard disco provisional y poll500ms; cierre conserva S3 hasta terminar peticiones y Prisma va al final. HTTP13/13 + pipeline18/18 + adaptador1/1 PASS finales (32/32 con padres), build/seed:check; sin nueva migración/23 al día. Arranque real compilado3001, health200 y rutaimagen401/no-store; contenedores existentes activos. Snapshots/objetos propios retirados. Revisión independiente sin bloqueantes tras corregir prebridgeabort, JSON503 temprano y cierre delecturas. Recuperación/reinicio/limpieza programada, cancel distribuida, carga/corpus/RAM, borradores/propuestas y controles/UI pendientes; fase continúa.

- 2026-10-17 — Usuario autoriza completar el bloque y añade expresamente guardado/asociación; revisión de código agrupada al terminar. [Entrega interna catálogo](../media/MEDIA-ACHIEVEMENT-PIPELINE.md): fachada con permiso contextual, controlador tick/idle/stop, Sharp, S3 privado verificado y asociación Logro/READY/SUCCEEDED atómica, claves por UUID y limpieza postcommit/temporales con diario. Pipeline18/18 y regresiones12/14/9/5 PASS (58/58 con padres), build/seed:check y 23 migraciones al día solo base aislada. Snapshots13/2/14/19/0 jobs/assets/cleanups conservados; artefactos propios retirados. Revisión independiente corrige claves compartidas, terminales conocidos y parada. HTTP/lectura/caché, scheduler, reconciliación de reinicio/commit incierto, presupuesto/corpus/carga y recorridos de borradores/propuestas/UI pendientes. No cierra fase ni T08.01; UI pausada.

- 2026-10-15 — Usuario comprende await y autoriza enlazar receptor con Prisma. [Entrega](../media/MEDIA-UPLOAD-INTAKE.md): fachada receiveAndQueueMediaJob, claim de recepción one-shot, metadata antes de IO y CAS ruta/tipo/QUEUED con identidad completa después de cierre. Fallos de ACK antes/después commit conservan estado/archivo, error503 seguro; EEXIST conserva RECEIVING; cancel antes de handoff deja pending y durante ACK ganador devuelve too_late. Enlace14/14, admisión9/9, toma5/5 y build/seed:check PASS; migración aditiva aplicada solo base aislada/22 al día, snapshots13/2/14/19/0 y temporales propios retirados. Revisión estática PASS con precondición close y recuperación inicial pendiente si admisión pierde ACK antes de devolver UUID. Sin HTTP/autorización de producto/controlador/S3 ni limpiador durable. Esperar comprensión del código del enlace antes del siguiente bloque. UI pausada.

- 2026-10-15 — Usuario comprende el límite de diez reservas y pide explicaciones centradas en código/funciones/archivos/arquitectura. Autoriza continuar: [receptor aislado](../media/MEDIA-UPLOAD-RECEIVER.md) nuevo con protocolo Zod, Readable→Busboy→Transform→input.tmp, firma/bytes, cancelación/cierre y limpieza no recursiva. Build y 14/14 pruebas PASS con Node24.14.0; caso junction completado con acceso permitido a temporales propios. setImmediate corrige fallo nativo al cancelar dentro del ciclo de Busboy; primera causa preservada. Revisión estática PASS acotada a fuentes que emiten close. Sin DB/migración/Docker/HTTP de producto ni enlace a cola. Próximo: comprensión del código antes de enlace con admisión/ruta temporal/QUEUED/controlador. UI pausada.

- 2026-10-13 — Usuario comprende que Sharp puede terminar y todavía fallar publicación, y autoriza continuar. [Admisión](../media/MEDIA-JOB-ADMISSION.md) interna 8/8 PASS: diez plazas compartidas RECEIVING/QUEUED, mismo lock que toma, FIFO por archivo completo y 180 s desde QUEUED. Reintento no renueva plazo; expiración solo QUEUED y bajo demanda, no reloj permanente. RECEIVING no se libera sin cierre confirmado. Toma5/5, enlace12/12, registro8/8, build/seed:check PASS; 21 migraciones solo base aislada, recuentos13/2/14/19/0 conservados. Revisor sin bloqueos acotados; receptor/ruta de limpieza de QUEUED, temporizador/controlador y presupuesto físico pendientes. Se corrigió explicación inicial de 180 s incluyendo subida antes de fijar implementación. Esperar comprensión del bloque antes de receptor/controlador; UI pausada.

- 2026-10-12 — Usuario comprende la transacción corta y autoriza continuar. [Enlace](../media/MEDIA-JOB-EXECUTION.md) toma→inicio único→Sharp→resultado: CAS de token/puesto/destino y marca de inicio; PUBLISHING guarda manifiesto/ruta conservando reserva; FAILED/CANCELED solo tras cierre/sin proceso creado. Revisión corrige borrado antes de CAS cancelado; pruebas fuerzan abort después del cierre y fallo de escritura sin API extra. Enlace12/12, toma5/5 y registro8/8 PASS, build/seed:check PASS, 20 migraciones en base aislada. Fixtures/temporales retirados y counts13/2/14/19/0 conservados. Cancelación sólo local hasta handoff (too_late si entrega gana), fallos DB inyectados; sin HTTP/S3/asociación/reinicio/cancelación entre instancias. Esperar comprensión antes del siguiente bloque; UI pausada.

- 2026-10-12 — Usuario comprende el descarte tras cancelar y pide continuar con subagentes mientras Coordinator explica. [Toma persistente](../media/MEDIA-JOB-CLAIMS.md) implementada con revisión independiente: advisory xact lock, puestos 1/2 UNIQUE/CHECK, token/fecha y orden entre QUEUED. Migración aditiva aplicada solo en `127.0.0.1:55437/weblogros_ui`, cliente generado, build/seed:check y estado de 19 migraciones PASS. Toma 5/5 y registro 8/8 PASS; ocho clientes consiguen solo dos puestos distintos. Fixtures retiradas, recuentos 13/2/14/19/0 conservados. No HTTP/admisión10/180s, ni enlace con Sharp/S3/resultados; T02/T03/T05 parciales. Esperar comprensión de toma/turnos antes de enlace; UI pausada.

- 2026-10-12 — «montemos el ejecutor con Sharp» autoriza pieza aislada con explicación antes de continuar. [Resultado](../media/MEDIA-IMAGE-EXECUTOR.md): protocolo, procesador, trabajador Node hijo y controlador con cierre confirmado; PNG/JPEG, variantes secuenciales, cancelación/30 s y limpieza solo de su intento. Build PASS, 11/11 procesos reales PASS + 1/1 arranque TS PASS. Pérdida de IPC detiene al trabajador; recuperación durable aún pendiente. Entrada temporal conservada para el futuro ciclo de asociación; sin originales de producto. No conecta cola/HTTP/DB/S3, no aplica global 2+10 ni publica imágenes. T05.02/T05.03 parciales; esperar comprensión antes del siguiente bloque. UI sigue pausada.

- 2026-10-12 — «porque no vamos montando las cosas?» autoriza primer slice real mientras se completa diseño: MediaJob/enum, migración aditiva, registro RECEIVING, reserva UNIQUE por destino y consulta propia. [Resultado](../media/MEDIA-JOB-REGISTRY.md). Aplicada solo a `127.0.0.1:55437/weblogros_ui`; Prisma validate/generate/deploy/status/diff, backend build, seed:check y pruebas 8/8 PASS. Fixtures retiradas; se conservan 13 usuarios, 2 equipos, 14 membresías y 19 logros. Docker Desktop/PostgreSQL aislado iniciados; SeaweedFS no se arrancó. T03/T05 parciales; máximo global, ejecutor, cancelación y endpoints pendientes. Pausa de comprensión del registro antes del siguiente bloque; UI sigue pausada.

- 2026-10-12 — Continuación autorizada tras recursos: T02.03 EN CURSO, elección de PostgreSQL existente como cola/registro duradero y estados conceptuales. [Diseño parcial](../media/T02-03-JOBS.md). Ejecución, cancelación, admisión/orden/tiempos, reinicio y avisos aún pendientes; T03 definirá modelos/migración/API. Solo documentación, sin código o cambios de DB. Siguiente acción: explicar cola persistente y esperar comprensión antes de ejecución/cancelación; UI conserva pausa.

- 2026-10-12 — Usuario confirma comprensión de Sharp. T02.02 DONE como diseño/viabilidad local: [presupuesto provisional y plan de medición](../media/T02-02-RESOURCES.md) registrados, con 1 GiB temporal y 1,5 GiB adicionales de RAM para media. Snapshot Windows: 31,81 GiB RAM visible, 12,98 GiB libres, 20 procesadores lógicos y 92,12 GB libres en C:. Docker no disponible, no se arrancó; sin asignación/cotas aplicadas ni carga nueva. T02 global sigue por trabajos/contrato; T04 por carga integrada. Siguiente acción: explicar recursos y esperar comprensión antes de T02.03; UI conserva pausa.

- 2026-10-12 — Usuario confirma comprensión de Busboy. T02.02 parcial: Sharp 0.35.5 fijado, native Windows/libvips cargado, build PASS y ensayo 11/11 PASS para orientación, metadatos sintéticos, color P3→sRGB, transparencia, variantes/no ampliación, límite de píxeles y rechazo de formatos/entradas dañadas. APNG se detecta por `acTL` porque la fixture de dos fotogramas da `pages=1` en Sharp. [Evidencia y límites](../media/T02-02-SHARP.md). T02.02 pendiente de presupuesto/plan de medición; T03/T05 pendientes. Siguiente acción: explicar Sharp y esperar comprensión antes de recursos; UI conserva pausa.

- 2026-10-12 — Usuario encarga terminar 7.10 al agente con implementación/pruebas/documentación y avance punto por punto, esperando comprensión antes del siguiente bloque. T02.02 parcial: Busboy 1.6.0 y tipos 1.5.5 fijados; build PASS y ensayo aislado 8/8 PASS para bytes, frontera de 10 MB, errores de flujo/multipart, extras, temporales independientes y limpieza. [Evidencia](../media/T02-02-BUSBOY.md). T02 global EN CURSO; Sharp/presupuesto y T03 pendientes. T05.01 no iniciado; UI conserva pausa. Siguiente acción de media: explicar este resultado y esperar comprensión antes de Sharp.

- 2026-09-29 — T04.02 DONE local: objeto de 17 bytes guardado por SDK; SeaweedFS recreado sin borrar `weblogros_media_windows_data`; nuevo contenedor devolvió mismos bytes y ETag; Delete/Head confirmaron limpieza. Docker Desktop se inició para esta prueba; PostgreSQL y Compose general no se arrancaron. T04 global sigue EN CURSO por medición bajo carga y T02/T03 continúan pendientes. [Evidencia](../media/LOCAL-SETUP.md).

- 2026-09-28 — T04.02 parcial: `@aws-sdk/client-s3@3.1141.0` fijado; adaptador backend con configuración por entorno y Put/Get/Head/Delete. `npm run build` PASS y prueba de integración directa con SeaweedFS 4.47 PASS (objeto temporal limpiado, credenciales incorrectas rechazadas con 403). Falta prueba SDK de persistencia tras recreación, medición bajo carga y diseño T02/T03; no hay rutas de imagen ni reanudación UI. [Evidencia](../media/LOCAL-SETUP.md).

- 2026-09-28 — Montaje guiado ejecutado: `docker-compose.media.yml` usa proyecto `weblogros_media_windows`, SeaweedFS 4.47 y volumen nombrado. El contenedor está en marcha; puerto publicado solo en `127.0.0.1:8333`, S3 anónimo respondió 403. Imagen descargada cotejada con índice `sha256:ce9e796f1fe6f06968f4c04bdaf8f678dad9c8acdfef3d244133d71bfa6bf882` y manifiesto Linux amd64 `sha256:f83509b0721dfd8e2e07faf76c0a899f67a8a889c89abe2fa0a5227ba1320362`. Snapshot en reposo: 69,25 MiB; no acredita máximo. [Evidencia y pendientes](../media/LOCAL-SETUP.md). T04 parcial, sin API ni imágenes de app.

- 2026-09-28 — Aclaración del usuario: la separación de Compose es **solo del piloto Windows**. Para desplegar en servidor propio, SeaweedFS irá como servicio del `docker-compose.prod.yml` junto a la aplicación, con volumen/credenciales propios, red interna y sin puertos de almacenamiento publicados a Internet. Copias y restauración siguen aplazadas a despliegue; todavía no se ha modificado ese Compose ni arrancado media.

- 2026-09-28 — Revisión operativa antes del montaje guiado: MEDIA-PLAN y Decisions ya fijaban para Windows un único contenedor SeaweedFS con configuración separada del Compose completo, volumen propio y S3 privado en loopback, conservando la base aislada y procesos locales. La sugerencia conversacional posterior de añadirlo al Compose general **para la prueba local** fue incorrecta y queda descartada. La petición actual autoriza empezar el montaje, sustituyendo el «solo definir» del 2026-09-23; no acredita arranque. T02.02 distingue presupuesto previo de medición real en T04/T05 para evitar un criterio circular. No se ha creado volumen ni contenedor de media.

- 2026-09-28 — MEDIA-10A-T02.02 EN CURSO documental: propuestos SeaweedFS `weed mini`, SDK S3 v3, busboy, Sharp y PostgreSQL existente para trabajos, con cota de 120 MB de entradas temporales y referencia de 192 MB para dos imágenes RGBA de 24 MP (ninguna es presupuesto total). [Diseño y fuentes](../media/T02-02-COMPONENTS.md). Versiones/digest, compatibilidad real, licencia del artefacto y recursos medidos pendientes; no se ha instalado ni arrancado media.

- 2026-09-28 — MEDIA-10A-T02.01 cerrado solo como inventario documental: modelos, migraciones, rutas, consumidores de `icono`/placeholders, configuración y evidencia 7.9/#29/#30, más foto de Windows local. Docker detenido; sin SeaweedFS ni medición de rendimiento. [Inventario](../media/T02-01-INVENTORY.md). T02.02 es el siguiente diseño; T02 global sigue TODO.

- 2026-09-28 — Usuario pide corregir ajustes backend y continuar almacenamiento. `POST /propuestas` comprueba ahora máximo 5 PENDING por jugador/equipo en una transacción que bloquea la membresía y revalida acceso; 409 si ya están ocupadas. Backend TypeScript build PASS; prueba HTTP/concurrente pendiente porque Docker PostgreSQL local no estaba disponible. Docs/apuntes, MEDIA-PLAN y Roadmap registran avance parcial. No se ha implementado borrador, imagen lista ni cancelación al eliminar jugador; T02–T09 siguen TODO y no se ha arrancado SeaweedFS.

- 2026-09-28 — Aclaración final del usuario: hasta 5 propuestas pendientes **por jugador y equipo**, con contador independiente para cada pareja; ni cupo global por persona ni cupo compartido por equipo. La interpretación intermedia de 5 sumando equipos fue errónea y queda sustituida. Los 3 borradores siguen por persona entre equipos. Cancelar pendientes al eliminar al jugador de A reduce su contador de A sin tocar B. MEDIA-PLAN, Roadmap, Decisions, Architecture, PLAYER-LIFECYCLE-PLAN, BACKEND-GAPS y MEDIA-CAPACITY corregidos; pruebas de sexta propuesta en misma pareja y capacidad con varias membresías previstas. Sin código ni cambio de gates.

- 2026-09-28 — El usuario decide cancelar la propuesta de nuevo logro aún pendiente cuando TEAM_ADMIN elimina explícitamente al autor del equipo. Sale de revisión y su imagen se limpia sin otras referencias; archivar/salir conserva ambas sin acceso del antiguo miembro. Rechazadas y logros aprobados siguen como decisiones resueltas. Sin elección aún de estado DB ni tratamiento de borradores al eliminar. PLAYER-LIFECYCLE-PLAN, MEDIA-PLAN, Architecture, Roadmap, Decisions y gap 21 sincronizados; ninguna implementación, servicio o gate cambiados.

- 2026-09-25 — Rechazo de propuesta: el usuario elige conservar la imagen enviada junto a la propuesta rechazada para consulta; libera plaza entre las 5 pendientes y conserva almacenamiento. MEDIA-CAPACITY añade rechazadas por separado porque pueden acumularse. Derivación de sustitución ya acordada: una propuesta aprobada muestra imagen vigente del catálogo y no retiene otra copia al reemplazarla. Borrado explícito de rechazadas pendiente. Documentación actualizada, sin implementación ni cambio de gates.

- 2026-09-25 — Envío de una propuesta a revisión solo con imagen ya procesada, guardada y asociada. Durante espera/proceso/fallo sigue como borrador retomable; se comprueban datos completos, autoría/membresía y plaza entre las 5 pendientes al enviar. Aprobación comprueba de nuevo imagen lista antes de catálogo. Registrado en MEDIA-PLAN, Decisions y Roadmap; implementación y verificación pendientes, sin reanudar UI.

- 2026-09-25 — Inventario parcial guiado de 7.10: el código actual crea propuestas directamente como PENDING y exige datos completos; historial personal y cola administrativa solo reconocen PENDING/ACCEPTED/REJECTED. El plan registra consumidores afectados por DRAFT, valida por separado guardar y enviar, y armoniza las pruebas con imagen obligatoria al publicar. MEDIA-CAPACITY ya cuenta imágenes de borradores/propuestas sin duplicarlas al aprobar. T02.01 continúa TODO hasta completar entorno, migraciones y consumidores; sin código ni servicios.

- 2026-09-25 — Usuario acuerda borradores incompletos retomables para propuestas y creación directa, máximo 3 por persona. Imágenes asociadas a borradores válidos se conservan; no confundir con temporales abandonados. Aclara máximo 5 propuestas de nuevos logros pendientes de revisión por persona, sin limitar solicitudes de obtención. Diseño y código pendientes; sin cierre de tareas ni reanudación visual.

- 2026-09-25 — Corrección de permisos y alcance por el usuario: un miembro autorizado para proponer debe poder subir la imagen de su propuesta propia; TEAM_ADMIN no es un requisito universal de subida. Aprobar/incorporar y modificar un logro del catálogo mantiene permiso administrativo. Imágenes de propuestas y MEDIA-EXT-T01 pasan expresamente de Phase 10 a 7.10, como requisito del recorrido completo T08.01. Permisos por estado, revisión, conservación/limpieza y relación entre procesamiento y envío pendientes de diseño. Documentación sincronizada, sin código ni servicios.

- 2026-09-25 — Inicio del aprendizaje guiado de 7.10: reconocimiento de `Logro.icono` y relación `teamId`/`team`. Usuario exige imagen lista antes de publicar un logro; creación pendiente durante procesamiento, fallo con reintento manual. Confirma permitir sustitución e impedir retirada sin reemplazo mientras esté publicado. Acuerdo registrado en MEDIA-PLAN/Roadmap; transición de datos existentes pendiente. Sin implementación, sin cierre de T02.01 ni reanudación de gates UI.

- 2026-09-24 — Limpieza 7.8 y temporadas 7.9 COMPLETADAS LOCALMENTE: migración conserva 13 usuarios/14 membresías, gestión administrativa y selector histórico, builds/HTTP/navegador/revisión Coordinator PASS. [Resultado y límites](../phase-7.9/RESULT.md). #11 sin cierre remoto. Avatares/media 7.10 pendientes; pausa A1/A2/G9 intacta.

- 2026-09-24 — Autorizada continuación «vamos con ello»: limpieza del campo legado 7.8 y gestión/históricos de temporadas 7.9. [Plan acotado](../phase-7.9/PLAN.md). Trabajo funcional EN CURSO, sin reanudar A1/A2/G9 ni media. Nueva sección administrativa de temporadas y selector en ranking; migración legacy protegida por auditoría de datos.

- 2026-09-24 — #27/#28 entregados localmente: `/perfil`, nombre/apellidos y alias propios. HTTP/navegador, lint/TypeScript y revisión desktop/móvil PASS. [Resultado y límites](../phase-7.8/RESULT.md). Sin migración, retirada del campo legado ni avatares; sin reanudar otros gates visuales.

- 2026-09-24 — Autorizada implementación funcional de 7.8 (#27/#28): `/perfil` con nombre/apellidos y alias propios por equipo, correo solo consulta. Permisos propios para PLAYER/TEAM_ADMIN; no edición ajena ni avatares. [Plan](../phase-7.8/PLAN.md). Trabajo separado de la pausa visual general.

- 2026-09-24 — Entrega G7/G8 sin imágenes finalizada: historiales, subrutas administrativas, revisión y progreso histórico. Build/lint/TypeScript, HTTP/E2E y capturas PASS; comparación Coordinator en [evidencia](../phase-7.7/COMPARISON-COORDINATOR.md). Se conserva pausa fuera del alcance autorizado. Phase 7.7 parcial solo por imágenes.

- 2026-09-24 — «montalo y ves explicando lo realizado y porque»: autoriza implementación de pendientes 7.7 y reanuda únicamente G7/G8 con QA. Auditoría descubre progreso histórico ausente en detalle administrativo de solicitud: ampliación de lectura scoped con temporada original, sin schema ni cambio de reglas. El resto de la pausa permanece vigente.

- 2026-09-24 — Usuario solicita pausar todo UI Workstream V2. Estado PAUSED, ninguna tarea visual activa; G7-T01 se conserva como punto pendiente, sin ejecución. A1/A2 aplazados y G6 provisional se mantienen. Reanudación solo por indicación del usuario; las fases independientes del roadmap conservan su estado.

- 2026-09-24 — Usuario pide descartar el trabajo restante de G6 y marcarla completada temporalmente. G6 COMPLETADA PROVISIONALMENTE; T03/T04/T05 DESCARTADAS por ahora, no ejecutadas. Se conserva la implementación T01/T02 y su evidencia; no se acredita QA ni gate visual PASS. No reabrir automáticamente esas tareas; G9 conserva su regresión general. G7 queda como siguiente bloque visual pendiente, sin iniciarlo. Esta decisión sustituye las menciones históricas a G6 pausado.

- 2026-09-24 — Reordenación solicitada: Phase 5.5 pasa al final del roadmap; backups como último bloque del despliegue definitivo. A1-T04 y A2-T04/T05 APLAZADAS hasta completar estructura G6–G8 y pestañas/controles acordados (perfil, temporadas, media), antes de G9. No se reanuda G6 ni se ejecuta media. Las menciones anteriores a A2 como foco son históricas.

- 2026-09-24 — Usuario aprueba adelantar el bloque como **Phase 7.10 — Imágenes y almacenamiento**, después de identidad/temporadas y antes de continuar el frontal con imágenes reales. Phase 10 queda para ampliaciones; despliegue/backups y R2 conservan seguimiento separado. IDs MEDIA-10A mantenidos por trazabilidad, sin cambiar tareas/estados, current_task UI-A2-T04 ni pausa G6–G9. Referencias históricas a 10A corresponden ahora a 7.10.

- 2026-09-24 — Petición de consolidación: plan de media desglosado por subtareas con responsables/dependencias/evidencia y enlazado en Roadmap. Plan separado PLAYER-LC para conservación/archivo/eliminación. T01 local cerrado documentalmente; diseño y ejecución pendientes. Comprobación documental únicamente; sin cierre de gates UI.

- 2026-09-24 — Phase 10A D05: recuperación del aviso al recargar/volver aceptada. Consultar estado real: espera/proceso recuperan indicador, éxito muestra imagen vigente y aviso, fallo conserva anterior/respaldo con alerta/reintento manual. Sin reenvío automático; continuidad solo tras recepción/admisión del archivo, permisos actuales y aislamiento de cuentas. Reconocimiento/caducidad de avisos y mecanismo técnico pendientes en T02. Solo documentación, sin implementación ni cambios de gates.

- 2026-09-24 — Phase 10A: compresión aceptada (JPEG 85; PNG sin pérdida adicional por compresión, sin paletas). Cancelar cambio pendiente conserva imagen anterior/respaldo; no admitir otro cambio de la misma imagen/recurso mientras haya trabajo pendiente. Coordinar cancelación/publicación y bloqueo entre pestañas/administradores en T02; no interpretar como límite nuevo por usuario/plataforma. Aviso al recargar/volver pendiente de explicar y decidir. Solo documentación; sin implementación ni cambios de gates.

- 2026-09-24 — Phase 10A D04: usuario pide retirar metadatos incrustados; aplicar antes orientación y normalización sRGB, conservar transparencia/estructura de formato y gestionar dimensiones/formato/peso en DB. Descarta optimización mediante paletas, tanto exacta como reducción de colores; no excluye PNG estático de entrada con paleta. Tamaños/variantes acordados se mantienen; JPEG 85 pendiente de aprobación. Solo documentación, sin implementación ni cambios de gates.

- 2026-09-24 — Phase 10A D04: variantes pequeñas aceptadas con su coste adicional estimado. Avatar 256 + 96 px; logo 512 + 128 px (sin variante 256); logro 1280 + 640 + 320 px. Una subida, generación automática, sin ampliar ni duplicar resultados equivalentes. Extras teóricos por píxeles: 14,06 %, 6,25 % y 31,25 % frente a guardar solo principal; no pesos medidos. Calidad de compresión pendiente. Solo documentación; T01 IN_PROGRESS, sin implementación ni cambios de gates.

- 2026-09-23 — Gap 21: acordadas acciones **Archivar** (retirar acceso, conservar ficha/avatar/resultados y recuperar al volver) y **Eliminar del equipo** (confirmación, sin deshacer, retirar datos actuales/avatar específico, cancelar solicitudes pendientes). Eliminar conserva decisiones resueltas, logros de catálogo derivados de propuestas y resultados cerrados con último alias/iniciales, sin alterar puntos ni puestos. Tras eliminación, reingreso empieza de nuevo. Cuenta global y otros equipos intactos. Producto definido; diseño técnico y controles pendientes. Solo documentación, sin implementación ni cambios de gates.

- 2026-09-23 — Conservación de jugador acordada: salida retira acceso pero mantiene ficha, progreso, logros y relaciones de rankings mientras exista equipo; reingreso recupera historial salvo eliminación explícita anterior. Los efectos de archivar/eliminar se precisan en el acuerdo anterior. Nuevo gap documental 21, dependiente del diseño de membresía; sin schema/API ni cambios de gates.

- 2026-09-23 — Phase 10A D03/D06: avatar específico se conserva mientras exista el equipo aunque la persona salga; recuperar al reingresar con la misma cuenta, sin conservar permisos durante su ausencia. Excluir de limpieza temporal/huérfanos; sin historial de sustituidas. Capacidad incluye antiguos miembros. Sin implementación ni cambios de gates.

- 2026-09-23 — Phase 10A D03: caché privada con revalidación obligatoria elegida. Navegador conserva copia; backend comprueba sesión, permiso y versión antes de permitir reutilización (304). Sin permiso no hay 304; sin caché compartida ni fallback offline. Pruebas e implementación pendientes, alcance solo documental. D03 sigue parcial por detalles de salida/reingreso y revocación.

- 2026-09-23 — Usuario reitera solo definición, sin montar nada. MEDIA-PLAN concreta propuesta de configuración local (contenedor/volumen/bucket/puerto privados) y compara caché privada con revalidación frente a no-store. Caché privada con revalidación aceptada posteriormente el mismo día; no modifica decisiones aprobadas ni acredita ejecución. Sin servicios, credenciales ni configuración ejecutable creados.

- 2026-09-23 — Phase 10A D02: montaje de pruebas aprobado por el usuario. Un contenedor SeaweedFS Windows con volumen propio, datos/metadatos persistentes y acceso privado con credenciales desde backend; conservar servicios existentes. Versión/configuración/recursos pendientes, sin arranque. Destino futuro servidor propio y R2 posterior conservados; no cambia current_task ni gates.

- 2026-09-23 — Phase 10A D03: entrega de imágenes a través del backend y almacenamiento privado acordados, compatibles con mantener el diseño al migrar a R2; permisos por petición, sin descarga directa por enlaces firmados. Caché y detalles de revocación pendientes. Propuesta de D02: contenedor SeaweedFS aislado en Windows con volumen propio; pendiente de elección, sin arranque.

- 2026-09-23 — Phase 10A D07: copias y restauración aplazadas por el usuario hasta preparar despliegue. No bloquean trabajo/piloto local; persistencia y material QA siguen vigentes. T02/T04 y gate local ajustados en MEDIA-PLAN. Sin tocar backups existentes ni cerrar pendientes offsite; sin implementación.

- 2026-09-23 — Phase 10A D06: limpieza tras éxito/fallo, revisión de restos cada hora y retirada de temporales abandonados tras 24 h acordadas; nunca archivos referenciados o de trabajos/transferencias activos. No amplía plazos de cola/proceso ni introduce reintento automático de subida. Implementación/coordinación pendientes. Próximo tema: copias de seguridad D07. Sin ejecución ni cambio de gates.

- 2026-09-23 — Phase 10A D06: reemplazo correcto borra principal anterior y variantes sin referencias, sin historial activo. Fallo de reemplazo conserva anterior; fallo de eliminación deja limpieza pendiente. No borrar avatar general al añadir específico. Retención de backups independiente y pendiente. Docs sincronizados; sin implementación ni borrados ejecutados.

- 2026-09-22 — Phase 10A D05: usuario aplaza ubicaciones de edición hasta definir nuevas pestañas. No se aprueban destinos propuestos ni añadir imagen después de crear logro; permisos y segundo plano conservados. Siguiente decisión independiente: limpieza/retención de imágenes sustituidas (D06). Sin implementación ni cambios en gates UI.

- 2026-09-22 — Seguimiento documental tras #30/#29: UI-G8-T05/T06/T07 deben integrar progreso/secretos ya funcionales en las subrutas administrativas definitivas; T08 incorpora regresión de sus estados. #11 conserva gestión visual de temporadas, selector histórico y QA restante; migración local y cobertura de integración ya verificadas. TASKS/PLAN/Roadmap/BACKEND-GAPS sincronizados; sin nueva issue, implementación ni cierre de gates. Corregidos IDs/estados/enlaces de TASKS afectados por sustitución accidental T→0. `current_task` sigue UI-A2-T04 y G6–G9 pausados.

- 2026-09-22 — Phase 10A D05/D06 parciales: espera máxima de 180 s, procesamiento de 30 s y reintento manual acordados. Proceso en segundo plano durante navegación interna, aviso flotante minimizable con estados reales, confirmación de éxito y alerta al fallar; mantener imagen anterior. Reinicios interrumpen trabajos afectados; recuperación del aviso y mecanismo técnico de limpieza pendientes; plazos acordados posteriormente el 2026-09-23. Sin implementación; estado UI conservado.

- 2026-09-22 — Phase 10A: máximo global de 2 imágenes en procesamiento simultáneo, incluido recorte/compresión/variantes, y 10 esperando por orden de llegada acordados. Las pendientes muestran «Esperando para procesar»; cola llena rechaza otra admisión con aviso para reintentar, conservando la imagen actual. Tiempos acordados en D06; pendientes admisión durante transferencia y validación de memoria/tiempos con los límites acordados de 10 MB/24 MP; sin implementación. D04 sigue parcial y T01 IN_PROGRESS; no cambia el estado UI.

- 2026-09-22 — Phase 10A: usuario confirma «sin originales». Conservar principal procesada y variantes necesarias; entrada temporal, retirada tras procesamiento/guardado/asociación correctos y exclusión de backups. Limpieza de fallos/abandonos acordada posteriormente en D06; implementación pendiente. MEDIA-PLAN, MEDIA-CAPACITY y Decisions sincronizados; D04 sigue parcial, sin implementación ni borrado de archivos.

- 2026-09-22 — Previsión de almacenamiento de Phase 10A documentada en [MEDIA-CAPACITY](../MEDIA-CAPACITY.md): fórmulas por usuario/membresía/equipo/logro, variantes incluidas, sensibilidad de PNG, originales y backups. Supuestos aritméticos verificados; no medición de archivos ni capacidad del servidor. No cierra D02/D04/D07 ni autoriza cuotas o infraestructura.

- 2026-09-22 — MEDIA-10A-D04 parcial: PNG/JPG estáticos y tamaños principales 256/512/1280 px aceptados para avatar/logo/logro. Logos y logros completos y proporcionales; sin ampliar fuentes pequeñas. Inspección de jugadores (avatar propio 96 px, filas 32 px) y referencia de detalle comunitario (bloque de logro aprox. 487 × 517 px). Encuadre de avatar general y específico acordado: vista previa circular con movimiento y zoom antes de guardar. Límites de entrada de hasta 10 MB y 24 MP por imagen acordados, sujetos a prueba de consumo. Dimensiones de variantes y calidad pendientes. Tiempos y flujo en segundo plano acordados posteriormente en D05/D06. Sin implementación de media ni ampliación de comunidad.

- 2026-09-22 — Phase 10A: avatar general y foto opcional por equipo acordados. Prioridad equipo → general → iniciales; fuera de equipo general → iniciales. Cambiar la general actualiza solo contextos que la heredan. Visibilidad acordada: general para cualquier usuario autenticado, específica solo para miembros de su equipo. Edición acordada: cada persona gestiona sus avatares; TEAM_ADMIN gestiona logo/logros de su equipo, sin editar avatares ajenos. Entrega/caché/revocación pendientes; no hay implementación ni cambios de schema.

- 2026-09-22 — MEDIA-10A-D03 parcial: cualquier usuario autenticado de la plataforma puede ver los logos de equipo, sin membresía ni invitación. No implica acceso anónimo ni acceso a otros datos privados. Edición del logo acordada para TEAM_ADMIN de ese equipo; matriz de producto acordada, entrega/caché/revocación pendientes. T01 sigue IN_PROGRESS, sin implementación de media.

- 2026-09-22 — #30 + #29 COMPLETADAS LOCALMENTE: progreso entero, objetivo obligatorio antes de conceder y contador cerrado tras concesión; secretos censurados y revelado histórico global. Migración16/16 aplicada en base Windows de revisión; builds/lint/TypeScript, 7 unitarias, 103 peticiones HTTP y flujo navegador PASS. 26 capturas y comparación directa Coordinator PASS para el alcance añadido. Fixtures existentes conservados; [entrega y evidencia](../issue-30/RESULT.md). No desplegado ni cerrado remotamente; no cierra gates anteriores ni reanuda G6–G9. `current_task` permanece UI-A2-T04.

- 2026-09-22 — MEDIA-10A-D02 parcial: SeaweedFS elegido para servidor propio y Cloudflare R2 como destino futuro preferido acordado. Diseñar integración S3 portable. Pendientes versión, montaje, capacidad y mantenimiento; siguiente decisión de producto D03 (permisos). T01 sigue IN_PROGRESS; sin despliegue, contratación ni migración.

- 2026-09-22 — [MEDIA-PLAN](../MEDIA-PLAN.md), Phase 10A: D01 acordada — imágenes de logros, logos, avatar general y opcional por equipo, por etapas y empezando por el recorrido completo de un logro. T00 completada; T01 IN_PROGRESS. D02–D06 parciales según entradas anteriores; D07 pendiente. No hay implementación ni integración de media real. `current_task` permanece UI-A2-T04 y G6 sigue pausado. Alcance de #22/#23 enlazado sin cierre remoto.

- 2026-09-22 — Conciliación documental solicitada por el usuario: Roadmap y BACKEND-GAPS reflejan gates G0–G5 cerrados, propuestas/ranking ya entregados en su alcance, identidad y sesiones versionadas en `c2ca920`, y temporadas parcialmente implementadas. Migración/pruebas HTTP y frontend de temporadas pendientes. No se ejecutan pruebas nuevas, no se cierran issues remotas ni gates, y `current_task` sigue en UI-A2-T04 con G6 pausado.

- 2026-09-22 — Phase 7.5 Auth Hardening completada y verificada manualmente: login con cookie HttpOnly, persistencia tras recarga, acceso protegido y logout PASS. Frontend sin `localStorage` para JWT, Bearer ni `auth: true`; TypeScript, lint y build backend PASS. No cambia `current_task`: continúa UI-A2-T04.

- 2026-09-21 — Petición explícita: «Tu resumen» pasa a «Mi progreso personal», con anillo de conseguidos/catálogo (Ana7/14=50%), leyenda conseguidos/pendientes, puntos y posición secundarios. No introduce progreso parcial ni secretos. Enlace «Ver logros» al catálogo existente sin prometer filtro personal. Implementación directa sin subagentes por instrucción vigente; ESLint dirigido/TypeScript PASS, revisión desktop1536 y móvil390 sin overflow del panel. No constituye aprobación independiente1:1 ni cierre de gates. Se mantienen pendientes A1/A2 y pausa G6.

- 2026-09-21 — Refinamiento puntual solicitado de participación del dashboard: título sin icono/divisor, porcentaje ampliado, explicación lateral adaptable, barra32px con36 segmentos y pendientes visibles, métricas inferiores más legibles. ESLint/TypeScript PASS; Coordinator verificó desktop/móvil y corrigió un solape inicial. Evidencia: `evidence/UI-G3/progress-audit-2026-09-21/REFINEMENT.md`. No cambia current_task ni cierra gates; sin backend/tokens/shell.

- 2026-09-21 — Ampliación explícita de identidad: `User.firstName`/`lastName` son identidad global y `TeamMembership.displayName` es alias contextual. Registro actualizado; migración aditiva conserva `User.displayName` como legado y hace backfill de membresías. Edición de perfil #27, edición/permisos del alias #28 y avatar/uploads #23 quedan pendientes. No cambia `current_task`: UI-A2-T04 continúa con su QA visual/funcional pendiente.

- 2026-09-21 — Refinamiento solicitado de superficies de Mis equipos: CSS reutilizable local mate, textura tenue, bordes direccionales y hover sin salto. Implementación frontend_worker y revisión directa Coordinator desktop/móvil registradas en `evidence/UI-A2/SURFACE-REFINEMENT.md`; no cambia current_task ni cierra gate. Sin backend ni cambios de tokens compartidos.

- 2026-09-21 — Override explícito del usuario: no volver a delegar en visual_critic; el Coordinator realiza directamente la comparación referencia/capturas y registra hallazgos y veredicto. El agente visual_critic_g3 fue interrumpido. Esta decisión sustituye la exigencia previa de crítico independiente; no elimina QA, evidencia visual ni criterios del gate. Próxima acción visual: comparación directa por Coordinator, sin esperar ni relanzar al crítico.

- Usuario pidió continuar resto de lámina onboarding y documentar soporte backend faltante para más adelante. Ampliación UI-A2 explícita; solo frontend, datos reales disponibles y errores honestos. A1 fullscreen confirmado y móvil sin decoración, pero su gate final sigue pendiente bajo comparación directa del Coordinator.

- 2026-09-20: ampliación explícita UI-A1 para login/registro desde referencia de acceso/onboarding; usuario confirmó continuar con convenciones actuales (Tailwind, sin migración). Análisis A1-T01 revisado; A1-T02 en curso. La línea G6 sigue pausada; no continuar jugadores automáticamente. Solo frontend y Header público limitado a ambas rutas; no backend/Auth Hardening ni fotografía. Consultar UI-A1 en PLAN/TASKS.

- Por petición del usuario, la siguiente continuación se ejecutará en Windows local, no CT112. Ver LOCAL_WINDOWS.md. La preparación del entorno y entrega Git no reanudan las tareas visuales. Las referencias históricas a transferencias/PID de CT112 no son instrucciones actuales.
- Entrega Windows verificada el 2026-09-20: PR #8 integrada y descargada en la carpeta principal; PostgreSQL aislado healthy, frontend localhost:3000, logins PLAYER/TEAM_ADMIN y lecturas reales PASS, lint PASS. Configuración, supervisión y reinicio en LOCAL_WINDOWS.md. UI-G6-T03 permanece sin ejecutar.
- El usuario pidió parar al terminar UI-G6-T02. Tarea cerrada; UI-G6-T03 queda READY sin ejecutar. No continuar hasta nueva petición de reanudación. No se apagan los servicios de revisión por esta pausa.
- El usuario usa un único prompt de entrada; la sesión raíz actúa como Coordinator adaptativo.
- El Coordinator selecciona automáticamente frontend_worker, backend_worker, qa_capture o visual_critic según TASKS/PLAN.
- Delegación secuencial por defecto; paralelismo solo para trabajo independiente y permitido por el gate.
- Solo el Coordinator modifica por defecto STATUS/TASKS/PLAN.
- Astra Low es el perfil lógico por defecto cuando el entorno lo ofrezca; los perfiles Codex heredan la configuración del Coordinator en lugar de fijar un model ID.
- Regla original Critic != Implementer sustituida para las comparaciones pendientes por el override del 2026-09-21: Coordinator directo, con evidencia y criterios de gate.
- Las imágenes canónicas viven en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`.
- `docs/ui-reference/manifest.json` es un índice; no se duplican PNG.
- Referencias = autoridad visual. Architecture/Roadmap/Decisions = autoridad funcional.
- El shell común se completa y congela antes de paralelizar pantallas.
- Tokens, `TeamShell`, `TeamNavigation`, `TeamIdentity` y primitivas compartidas quedan congelados tras UI-G2; cualquier cambio posterior vuelve al Coordinator.
- No se integran todavía achievement images, avatars, banners ni fotografía decorativa.
- Esas zonas conservan geometría mediante placeholders y pueden declararse ignoredRegions.
- Se prefiere seed/backend real a arrays de dominio hardcodeados.
- Pixel diff sirve para localizar diferencias; no existe un porcentaje automático de aprobación.
- El primer fixture visual será Halcones.
- Phase 7.7 convierte propuestas de nuevos logros en requisito real del workstream.
- Aprobar una propuesta la incorpora al catálogo; no concede el logro ni crea solicitud de obtención.
- Landing queda aplazada.
- Las 7 subrutas administrativas acordadas se implementan en UI-G8.
- Features futuras dibujadas en mockups no entran automáticamente en alcance.

## Estado conocido del repositorio

- Identidad separada en dos niveles: nombre/apellidos globales en `User` y alias opcional en `TeamMembership`; resolución tenant alias → nombre completo → fallback. Registro frontend/backend adaptado. El avatar no está implementado.

- Identidad y sesiones están versionadas en `main` local mediante `c2ca920`. Publicación remota y cierre de #13/#20/#24 no verificados en esta conciliación; no confundir validación local con despliegue.
- Temporadas (Phase 7.9 / #11): migración aplicada localmente y cobertura de integración con #30/#29 verificada en `e50e2e3`; gestión visual, selector histórico y QA restante de la fase pendientes. Consultar [Roadmap](../Roadmap.md#phase-79--temporadas-por-equipo). No es un gate cerrado ni una ampliación automática de A2.

- Fixture objetivo: 2 equipos; Halcones con 12 miembros, 14 logros, 40 asignaciones, 8 solicitudes, 6 propuestas y 6 invitaciones.
- Criterios y fechas de alta de logros forman parte del contrato de datos; `User.displayName` queda como legado de transición, reemplazado funcionalmente por identidad global y alias de membresía.
- El dominio de propuestas distingue envío, incorporación al catálogo y obtención del logro.
- Ranking, jugadores, dashboard y contexto disponen de lecturas tenant-scoped.
- Solicitudes de obtención y panel admin base incluyen histórico, detalle y motivo de rechazo.
- Las subrutas admin acordadas todavía no existen en `src/app`.
- Las referencias desktop del lote inicial sí están versionadas.
- `detalles-solicitud-logro-v1.png` existe; el inventario anterior tenía texto contradictorio y se corrige en esta PR.
- Assets de marca/surface system fueron reorganizados bajo `LockerBoard-marca/otros/`.

## Bloqueos actuales

El frontend administrativo V1 aún rechaza solicitudes sin enviar `reason`; se adaptará en UI-G8 antes del gate funcional correspondiente. No hay bloqueo técnico documentado para UI-G6, pero su continuación está pausada por el usuario. El entorno operativo vigente es Windows local; consultar `LOCAL_WINDOWS.md` y comprobar salud antes de usarlo. Las URLs/PID de CT112 del historial son evidencia pasada, no una afirmación de que esos servicios continúen activos.

## Última validación

- Sesiones 2026-09-22: login con cookie HttpOnly, persistencia tras recarga, acceso protegido y logout PASS; validación ya registrada en las decisiones vigentes y en `apuntes.md`. La conciliación documental no la vuelve a ejecutar.
- Slice de identidad 2026-09-21: QA independiente PASS para `prisma validate/generate`, build backend, `seed:check`, lint/TypeScript/build frontend y `git diff --check`. La migración 14/14 se aplicó después únicamente a `127.0.0.1:55437/weblogros_ui`; login Ana/PLAYER y contexto Halcones PASS (`Ana Fernández`, 2 equipos), sin P2022. No hubo seed, reset ni screenshots. Implementación posteriormente versionada en `c2ca920`; cierre remoto de #13/#20 no verificado. Esta validación no cubre temporadas, no cierra UI-A1/UI-A2 ni cambia `current_task`.

- Estado vigente: gates UI-G0 a UI-G5 cerrados; UI-G6-T01/T02 DONE y G6 completada provisionalmente por decisión del usuario, T03–T05 descartadas por ahora. G7–G9 pendientes; A1/A2 queda aplazada hasta completar la estructura, antes de G9. Jugadores implementado con lint/build/checks dirigidos PASS; captura, pruebas de navegador y gate visual UI-G6 pendientes. Evidencia: `evidence/UI-G6/UI-G6-T02-IMPLEMENTATION.md`.
- Pendiente explícito para UI-G9: ejecutar variantes HTTP 401/403/404 del ranking; loading, 500/retry, empty y 1–2 miembros ya tienen evidencia funcional. No confundir inspección de código con prueba runtime.
- Último runtime verificado por QA de UI-G5: frontend PID 712719/sesión 56528; backend PID 620960/sesión 88569; PostgreSQL temporal `weblogros_ui_review_g3` saludable. Directorio `/tmp/weblogros-ui-review-g3`, URL `http://100.65.11.85:3000/login`. QA y crítica UI-G5 iteración 2 PASS. No actualizado ni revalidado durante cierre T02 de jugadores; verificar identidad/salud antes de operar.
- Gate UI-G4 cerrado: crítica independiente sin P0/P1 y FORM-FLOW-QA.md PASS. Submit real por rol, payload exacto, redirect, doble envío (un único POST), vacío sin POST y filtro sin resultados verificados. Solo se eliminaron los dos registros QA por ID; conteos 6/19/42/8 restaurados. Shell permanece congelado con la excepción tipográfica de PageHeader ya validada.

### Historial de validaciones (más reciente primero)

Las menciones siguientes a pendientes, bloqueos y handles describen cada momento histórico; no sustituyen el estado vigente anterior. La autorización para actualizar la sesión temporal fue concedida posteriormente por el usuario con «dale».

- UI-G4 crítica independiente iteración 1 aprobada: cero P0/P1, cuatro hallazgos anteriores resueltos y un P2 de elipsis aceptado. El nombre completo ya está disponible en title, nombre accesible y detalle. Se completa QA del submit real antes del cierre de fase.
- UI-G4 iteración 1: seis columnas de 193 px, H1 de 43.2 px desktop/36 px móvil, formularios 70.4/29.6 y cero overflow global o errores de consola/red. Dashboard sin regresión. Crítica independiente pendiente; un título largo truncado se entrega explícitamente al crítico.
- Runtime de revisión actual: frontend PID 665035/sesión 25296; backend PID 620960/sesión 88569 y DB conservados. URL: `http://100.65.11.85:3000/login`. Verificar identidad antes de operar; los handles de entradas anteriores son históricos.
- gate UI-G3 aprobado: `REPORT-ITERATION-2.md` y `VISUAL_CRITIC_ITERATION_2.md` confirman cero P0/P1, seis paneles sin overflow interno ni clipping y bandas 328/296; P2 de truncado del feed aceptado.
- sesión actual: frontend PID 631856/sesión 12161; backend PID 620960/sesión 88569 y DB conservados; URL de revisión saludable con logins reales de Ana y Diego confirmados.
- iteración 1 recapturada: bandas 328/296, podio y medidor resuelven los deltas originales; queda P1 de overflow interno de Participación (340/326 px) y P2 de truncado de actividad. Veredictos QA/crítico: ITERATE.
- sesión temporal actualizada disponible para revisión: frontend PID 621216/sesión 89626, backend PID 620960/sesión 88569, PostgreSQL `weblogros_ui_review_g3` en 127.0.0.1:55437 y directorio `/tmp/weblogros-ui-review-g3`; verificar identidad antes de operar.
- UI-G3-T05 iteración 1 implementada: actividad en filas de 48 px, medidor segmentado, podio con placas de 48 px y avatares de 44 px; bandas desktop de 328/296 px. Lint/build aprobados por frontend_worker; aprobación visual pendiente de recaptura.
- Coordinator revalidó HTTP 200 en la sesión anterior; no se detuvo ni sustituyó. La solicitud de autorización permanece pendiente tras el rechazo de revisión automática.
- crítica dashboard iteración 0 confirma shell/roles/responsive saludables, cero P0 y composición 38/33/29 + 38/27/35 correcta;
- P1 abiertos: banda superior 427 px frente a objetivo 320–335 px y Top 3 sin jerarquía de podio suficiente;
- P2 abiertos: medidor continuo frente a lenguaje segmentado y segunda banda 317 px frente a objetivo 288–300 px;
- captura canónica PLAYER 1440×1024, smoke TEAM_ADMIN 1440×1024 y móvil PLAYER 390×844 guardados en `evidence/UI-G3/`;
- fixture visible confirmado: 12/14/40/4280/7/10, 83 %, Ana 790/7/#1, top 3 y destacados correctos;
- reloj congelado en `2026-09-20T12:00:00Z`, grid 3+3 desktop y una columna móvil sin overflow;
- cero errores de consola, HTTP o red; solo una petición de pantalla a `/dashboard` y cero a `/logros`;
- dashboard usa una única petición cancelable a `/api/equipos/:slug/dashboard` y contratos TypeScript explícitos;
- composición implementada en dos bandas 38/33/29 y 38/27/35 con participación, stats, actividad, últimos logros, resumen y top 3;
- loading geométrico, errores 401/403/404/general, retry y vacíos regionales conservan layout;
- responsive 3→2→1 columnas, fechas `es-ES`/`Europe/Madrid`, sin valores fixture hardcodeados ni features futuras;
- frontend `npm run lint`, `npm run build` y `git diff --check` correctos; shell/tokens/primitivas/landing intactos;
- análisis `UI-G3-T01-DASHBOARD-ANALYSIS.md` mapea geometría, contrato tipado, fixture, estados, responsive y captura 1440×1024;
- `/dashboard` cubre participación, estadísticas, actividad, últimos logros, resumen personal y top 3 sin backend adicional;
- temporadas, retos, niveles, progreso parcial, objetivo siguiente y fotografía quedan explícitamente excluidos;
- shell/tokens/primitivas congelados no se modificaron durante el análisis;
- UI-G2-T05 aprobado en iteración 2 por crítico independiente: cero P0/P1 materiales y un P2 tipográfico no bloqueante;
- PLAYER no reserva bloque administrativo; TEAM_ADMIN sitúa Administración bajo Solicitudes y antes de utilidades;
- evidencia final 1440×900 confirma sidebar 172 px, cabecera 129 px, geometría idéntica, `Halcones` completo y cero overflow/errores;
- informes y telemetría de las tres iteraciones quedan en `evidence/UI-G2-T05/`; entorno CT112 fue limpiado tras cada captura;
- iteración visual 1 resuelve cabecera a 129 px, lockup contenido, `Halcones` completo, geometría entre roles y overflow;
- queda un único P1: Administración está mezclada con utilidades inferiores; debe formar bloque propio bajo Solicitudes; peso lateral P2 no bloqueante;
- iteración visual 0 capturada a 1440×900 para Ana/PLAYER y Diego/TEAM_ADMIN sin errores de consola/red ni overflow;
- el crítico retiró un P0 causado por preview incompleta al reabrir el PNG TEAM_ADMIN original; ambas variantes conservan el shell completo;
- quedan P1: cabecera tenant demasiado baja, lockup de marca fuera del sidebar y truncado innecesario de `Halcones`; P2 de peso tipográfico lateral;
- `PlayerAvatar` reserva 1:1 en tamaños tabla, sesión, identidad y podio; iniciales/fallback son deterministas y decorativos;
- `AchievementMedia` reserva 16:9, 1:1, 2:1 y 9:10 para los contextos documentados;
- ambos placeholders usan solo CSS/iconografía existente, `aria-hidden` y cero URLs/uploads/storage/assets nuevos;
- TeamIdentity consume el avatar de sesión sin adelantar cambios de pantallas G3+;
- frontend `npm run lint`, `npm run build` y `git diff --check` correctos tras los placeholders;
- shell consulta `/api/equipos/:slug/contexto` y expone equipo, identidad y rol mediante `useTeamContext`;
- Administración aparece exclusivamente para `TEAM_ADMIN` contextual; el shell no lee `isSuperAdmin` para permisos;
- loading, 401, 403, 404, error/reintento y cancelación quedan resueltos antes de montar pantallas hijas;
- PLAYER y TEAM_ADMIN comparten geometría, con identidad real y sin una tercera variante para SUPER_ADMIN;
- frontend `npm run lint`, `npm run build` y `git diff --check` correctos tras conectar contexto real;
- `TeamShell` integra sidebar de 172 px, navegación móvil, skip link y un único landmark `main` para todas las rutas tenant;
- `TeamNavigation`, `TeamIdentity`, `PageHeader`, `SectionHeader` y primitivas Surface/KPI/Toolbar/Status quedan disponibles sin adelantar rediseños de pantalla;
- navegación común incluye solo rutas aprobadas; Comunidad permanece fuera y Administración se condicionará en T03;
- offsets y `TeamNav` heredados se retiraron; solicitudes/admin ya no anidan landmarks `main`;
- frontend `npm run lint`, `npm run build` y `git diff --check` correctos tras la integración del shell;
- contrato `lockerboard-tokens.css` centraliza paleta, tipografía, spacing, geometría, radios, estados y exposición Tailwind;
- sidebar `10.75rem`, contenido `78rem`, gutter fluido y superficies/bordes coinciden con el rango documentado en `VISUAL_SYSTEM.md`;
- puente `--team-*` mantiene compatibilidad temporal sin mezclar el tema público;
- siete imports preexistentes se alinearon con la ubicación versionada `LockerBoard-marca/otros/` sin cambiar assets ni markup;
- frontend `npm run lint`, `npm run build` y `git diff --check` correctos;
- gate UI-G1 reproducido en CT112 con copia temporal, PostgreSQL aislado y limpieza completa documentada en `evidence/UI-G1-T05-QA.md`;
- 13 migraciones desde cero y upgrade de las 10 históricas sin pérdida; doble seed con snapshots idénticos en 8 tablas;
- fixture Halcones confirmado: 12 miembros, 14 logros, 40 concesiones, 8 solicitudes, 6 propuestas y 6 invitaciones;
- matriz HTTP de roles, aislamiento, ranking/jugadores/dashboard, solicitudes y propuestas aprobada;
- aprobación concurrente produce exactamente `200 + 409`, un solo `Logro` y cero `UserLogro`/`SolicitudLogro`;
- runtime temporal, contenedor, puerto y directorio QA eliminados; checkout CT112 y base principal intactos;
- `PropuestaLogro` guarda criterios, estado, resolución y vínculo opcional único con el logro incorporado;
- creación e historial propios, cola/detalle admin y resoluciones están protegidos por membresía, rol y tenant;
- aceptar usa una transición compare-and-set dentro de transacción, crea exactamente un `Logro` y no concede `UserLogro` ni crea `SolicitudLogro`;
- el seed declara 6 propuestas (2 por estado), enlaza las 2 aceptadas a 2 logros adicionales y mantiene 40 asignaciones/8 solicitudes;
- nueva migración añade `SolicitudLogro.rejectionReason` nullable y el seed aporta motivos deterministas a los dos rechazos;
- `/contexto`, `/jugadores`, `/ranking` y `/dashboard` devuelven proyecciones scoped e incluyen miembros con cero;
- catálogo/detalle conservan campos previos y añaden `holdersCount`/`earnedByMe`;
- solicitudes propias/admin incluyen histórico, motivo y orden estable; `GET /admin/solicitudes/:id` queda protegido por tenant;
- rechazo exige `reason` trim de 1–500 caracteres y mantiene transición compare-and-set desde PENDING;
- agregados filtran concesiones por `logro.teamId` y ordenan puntos desc, cantidad desc, userId asc;
- `npx prisma generate`, `npm run build`, comprobaciones estáticas del seed y aserciones aisladas de agregados/scoping correctos;
- `git diff --check` correcto; no se inició runtime ni se aplicaron migraciones a una BD viva.

## Protocolo de cierre de tarea

Al terminar la tarea actual, actualizar en el mismo cambio:

1. `TASKS.md`: estado DONE.
2. `STATUS.md`: resultado, validaciones y decisiones.
3. `STATUS.md`: `current_task` = siguiente tarea READY.
4. artefactos propios de la tarea.
5. si hubo código, comandos ejecutados y resultado.

## Handoff mínimo

Otra sesión debe poder continuar leyendo:

- `AGENTS.md`
- este archivo
- `TASKS.md`
- `PLAN.md`
- `docs/ui-reference/manifest.json`

No depender de memoria de chat.
