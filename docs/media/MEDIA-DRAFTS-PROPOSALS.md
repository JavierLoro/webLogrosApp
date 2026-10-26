# Borradores y propuestas con imagen — backend local

Entrega 2026-10-26: **recorrido backend local verificado**. Guardar/retomar → imagen READY → propuesta o publicación directa → aprobación/rechazo. El frontal conserva su pausa y no se ha desplegado esta entrega.

## Contrato y persistencia

`AchievementDraft` es independiente de `PropuestaLogro`. Tiene autor, tenant, finalidad inmutable `PROPOSAL`/`DIRECT`, documento editable `fields`, versión, imagen opcional y resultado del envío. Estados: `DRAFT`, `SUBMITTED`, `PUBLISHED`, `DISCARDED`. Solo `DRAFT` ocupa plaza; los terminales se conservan para reintentos y trabajos tardíos. Su consulta devuelve metadatos sin repetir textos terminales que podrían haberse convertido en un logro secreto.

Tres plazas por usuario entre todos sus equipos, contando también borradores inaccesibles. Crear, enviar/publicar y descartar bloquean `User` antes de comprobar o liberar la plaza. Cada envío bloquea además la membresía contextual: las cinco propuestas `PENDING` se cuentan por usuario/equipo. Un fallo conserva el borrador, la imagen y su plaza. No hay caducidad de borradores ni descarte automático.

Guardar admite campos ausentes y cadenas/criterios vacíos, con límites máximos de los esquemas existentes. `PATCH` sustituye el documento `fields` completo: para retirar un campo opcional, omitirlo del documento nuevo. Enviar usa los esquemas completos de propuesta/logro. La finalidad PROPOSAL admite únicamente nombre, descripción y criterios; el administrador decide puntos/configuración al aprobar.

Solo el autor con membresía vigente consulta y edita su borrador. DIRECT exige TEAM_ADMIN para crear/editar/subir/publicar. El descarte propio requiere membresía pero permite haber perdido el rol. La pérdida de membresía conserva borrador e imagen, impide consultas/escrituras y sigue ocupando plaza. El reingreso recupera el acceso; no implementa archivo ni eliminación administrativa de jugadores.

`version` aumenta al guardar texto y al asociar una imagen nueva. Una petición obsoleta recibe 409. Al enviar se guarda `submittedVersion` y `resultId`; repetir ese borrador/versión devuelve su resultado sin crear otro, comprobando acceso actual. No libera otra plaza. Los UUID se normalizan para que las mayúsculas no creen reservas distintas del mismo borrador.

## API

Prefijo tenant: `/equipos/:slug`; públicamente Nginx añade `/api`. Todas las escrituras requieren cookie de sesión y un Origin de `MEDIA_ALLOWED_ORIGINS`; el mismo control protege guardar texto aunque media esté desactivado. Errores conservan `{ error: ... }` y la validación existente. Lecturas JSON de borrador son `no-store`.

| Método y ruta | Cuerpo / respuesta |
| --- | --- |
| POST `/borradores` (tenant) | `{ purpose, fields?: {...} }`; 201 con DTO propio, versión inicial 1 |
| GET `/borradores` (tenant) | Borradores DRAFT propios accesibles |
| GET `/borradores/:id` | DTO propio; terminales sin texto editable |
| PATCH `/borradores/:id` | `{ version, fields: {...} }`; nueva versión; 409 si cambió |
| POST `/borradores/:id/descartar` | `{ version }`; idempotente para el mismo descarte |
| GET `/borradores` (global, sin prefijo tenant) | `{ borradores, totalOcupado, limite: 3, inaccesibles }`; solo agregados para los inaccesibles |
| POST `/borradores/:id/imagen` | Multipart con `image`; 202 y trabajo; autor/tenant/estado/rol revalidados al admitir |
| GET `/borradores/:id/imagen?size=320\|640\|1280` | Imagen privada del DRAFT propio |
| POST `/propuestas` o `/logros` | **Solo** `{ borradorId, version }`; finalidad PROPOSAL o DIRECT respectivamente |
| POST `/propuestas/:id/imagen` | Solo autor de una propuesta legacy PENDING marcada subsanable y todavía sin imagen |
| GET `/propuestas/:id/imagen` | Autor o TEAM_ADMIN; aceptada resuelve imagen vigente del catálogo y su secreto |
| GET `/media/trabajos/:id` | Estado propio con membresía vigente, sin claves S3/rutas/tokens |
| POST `/media/trabajos/:id/cancelar` | Propio; catálogo exige admin; borrador/subsanación permiten miembro; 202 intención, 200 CANCELED, 409 demasiado tarde |
| POST `/admin/propuestas/:id/aceptar` | Cuerpo administrativo existente; imagen READY disponible y sin trabajo activo; traslado atómico al catálogo |
| POST `/admin/propuestas/:id/rechazar` | `{ reason }` existente; conserva exactamente la imagen asociada y cancela trabajo de subsanación todavía activo |

Los cuerpos antiguos de POST propuestas/logros reciben 400. **Los formularios actuales del frontal dejan de completar ambas operaciones hasta integrar borradores y subida; es una incompatibilidad temporal aprobada.** Los demás recorridos mantienen sus contratos; revisar envío de Origin en el frontal de revisión al retomarlo. No se aceptan autor, tenant, estado ni assetId desde JSON.

## Multimedia y transacciones

`mediaTargets.ts` distingue `achievement`, `draft` y `proposal`. La clase de imagen sigue siendo `achievement`: se reutilizan receptor, cola, Sharp, variantes y runtime. Se conservan PNG/JPEG, compresión, tamaños, dos activos/diez pendientes, plazos, caché Sharp desactivada y objetivo Go 384 MiB.

Las claves históricas `media/teams/{team}/achievements/{id}/jobs/{uuid}/...` siguen válidas. Los orígenes nuevos usan `drafts/{uuid}` y `proposals/{id}`. Transferir un asset a una propuesta/logro solo cambia la FK en una transacción; nunca copia ni renombra objetos S3. Las FK compuestas `(teamId, imageAssetId)` impiden cruzar tenants desde los tres modelos.

Admisión y commit multimedia usan orden membresía → destino → lock global. Envío/descarte anteponen el lock de User para la cuota. El envío comprueba HEAD de todas las variantes fuera de la transacción y revalida versión/referencia/READY/estado/permiso bajo locks al confirmar. Una sustitución activa bloquea envío/publicación aunque exista imagen anterior READY. La aprobación sigue el mismo patrón de HEAD externo y revalidación interna, incluyendo rol actual del administrador y trabajo activo de subsanación.

La aprobación crea el logro y mueve la referencia sin PUT; la propuesta ACCEPTED resuelve la imagen vigente del logro en sus lecturas. Secretos se filtran también al reintentar envío. El rechazo mantiene la imagen exacta. Propuestas nuevas y resueltas no permiten sustituirla. Solo las legacy PENDING sin imagen marcadas por la migración admiten una primera asociación; el flag se consume con el commit de imagen. Sus textos no cambian.

Descartar confirma DISCARDED, referencia retirada, diario S3 y cancelación en una transacción. QUEUED se vuelve CANCELED inmediatamente porque no tiene escritor; RECEIVING/PROCESSING/PUBLISHING retienen la reserva hasta confirmar cierre. El runtime consume la intención persistida y el guard final impide asociar después del descarte. Un fallo físico de limpieza deja diario reintentable. La recuperación valida claves por origen y la limpieza cuenta referencias de catálogo, borradores y propuestas, conservando lo dudoso.

## Migración y pruebas

Migración aditiva `20261026120000_achievement_drafts`, aplicada **solo** tras verificar `127.0.0.1:55437/weblogros_ui`: 27 migraciones al día. `draftMigrationCheck.ts` introdujo fixtures de los tres estados de propuesta antes de migrar y comprobó que únicamente PENDING quedó subsanable; comparó catálogo e historiales anteriores y retiró sus fixtures. No inventa imágenes, altera textos, cuenta como enviado un borrador ni borra datos existentes. Prisma validate y diff contra base aislada PASS, sin diferencias.

[Resumen reproducible de resultados](draft-backend-evidence/summary.json): **192/192 comprobaciones PASS, 16 archivos, sin omisiones**, incluidos tests padres. Logs individuales junto al resumen. Build TypeScript y `seed:check` PASS; no se reejecutó el seed ni se restablecieron contraseñas.

| Suite | PASS |
| --- | ---: |
| Nuevo recorrido HTTP de borradores/propuestas | 20 |
| Nuevas caídas reales de borrador/subsanación | 9 |
| Registro / toma / admisión / intake / ejecución | 8 / 5 / 9 / 14 / 12 |
| Pipeline catálogo / API media | 18 / 13 |
| Cancelación / recuperación / barrido | 12 / 17 / 24 |
| Ejecutor Sharp / limpieza temporal / receptor / adaptador S3 | 11 / 5 / 14 / 1 |

Cobertura nueva: cuarto borrador y ocho creaciones simultáneas entre dos equipos; incompletos/límites/propietario/rol/tenant; membresía perdida e inaccesibles que cuentan, reingreso; versión obsoleta, UUID en mayúsculas, doble envío, retry tras perder respuesta, rollback de envío y descarte; imagen obligatoria/fallida/cancelada/ausente en S3; sustitución activa con anterior READY; sexta propuesta y carrera por quinta plaza, jugadores/equipos independientes; aprobación concurrente sin duplicación S3, secreto y sustitución posterior del catálogo; rechazo conservando bytes; legacy sin editar texto ni volver a sustituir; FK tenant y limpieza protegida por referencias; descarte durante recepción, cola y publicación retenida.

Las ocho caídas matan un padre real en RECEIVING/QUEUED/PROCESSING/PUBLISHING/SUCCEEDED para borradores y en PUBLISHING/SUCCEEDED para subsanación; incluyen descarte tras caer antes del reinicio. El siguiente runtime conserva commits confirmados o retira staging, no vuelve a procesar ni revive el destino descartado. Nunca hay dos runtimes vivos a la vez.

La primera pasada de cancelación detectó un 404 nuevo donde el contrato histórico daba 403 a un PLAYER sin trabajo propio. Se corrigió sin consultar destinos ajenos; la suite final es 12/12 PASS. No se presenta la ejecución fallida como validación. Una comprobación de diff detectó nombres de FK que se reflejaron mediante `map` en Prisma; diff final vacío, sin tocar de nuevo la migración aplicada.

Comandos de las nuevas suites, desde `apps/backend`, sin otro backend/runtime activo:

```powershell
npm run build
npm run seed:check
$env:MEDIA_DRAFT_TEST='1'
node --env-file=../../.env.media.local --env-file=.env.ui-windows dist/lib/achievementDrafts.integration.test.js
Remove-Item Env:MEDIA_DRAFT_TEST
$env:MEDIA_DRAFT_RECOVERY_TEST='1'
node --env-file=../../.env.media.local --env-file=.env.ui-windows dist/lib/mediaDraftRecovery.integration.test.js
Remove-Item Env:MEDIA_DRAFT_RECOVERY_TEST
```

Fixtures exclusivas UUID, un runtime por vez y retirada verificada de objetos propios con DELETE+HEAD. Cada suite compara sus conteos antes/después y comprueba la raíz absoluta antes de retirar su carpeta temporal. Foto final: 13 usuarios, 2 equipos, 14 membresías, 19 logros, 6 propuestas y 5 owners históricos conservados; cero borradores/jobs/assets/cleanups/journals de pruebas. Contenedores PostgreSQL y SeaweedFS existentes arrancados sin recrearlos ni cambiar volúmenes. Servidores HTTP efímeros y procesos hijos cerrados; no queda un backend de producto escuchando.

## Alcance pendiente

7.10 sigue parcial: corpus/calidad, dimensionamiento sostenido/servidor, revisión administrativa de casos multimedia conservados, ubicación/implementación del frontal y QA de navegador/visual. T08.01 sigue abierto y logos dependen de ese logro completo; avatares y ciclo de vida administrativo del jugador conservan sus dependencias. Despliegue y backups siguen aplazados. Las cifras de esta entrega no acreditan una nueva medición de RAM/carga ni el cierre global de la fase.
