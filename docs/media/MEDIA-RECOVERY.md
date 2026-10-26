# Recuperación de trabajos multimedia — Phase 7.10

Entrega local del 2026-10-17. Continuación de [API/runtime](MEDIA-HTTP.md) y [publicación](MEDIA-ACHIEVEMENT-PIPELINE.md). Alcance: catálogo existente, un runtime multimedia por base de datos y un solo host con su raíz temporal privada. No cierra 7.10 ni habilita imágenes en el frontal.

## Qué resuelve

Un cierre brusco puede dejar un trabajo con reserva y archivos aunque ya no exista quien lo ejecutaba. También puede perderse la respuesta de PostgreSQL después de un commit correcto. Recuperar consiste en leer la realidad persistida y demostrar que el proceso dejó de escribir; no consiste en repetir Sharp ni en declarar fallido todo lo que aparezca pendiente.

| Situación comprobada | Resultado |
| --- | --- |
| RECEIVING o QUEUED de un runtime anterior muerto | INTERRUPTED; libera reserva y conserva la imagen vigente |
| PROCESSING/PUBLISHING sin ejecución local y worker confirmado muerto | INTERRUPTED; libera puesto, retira STAGING no asociado mediante diario y limpia temporales propios |
| SUCCEEDED y referencia guardados antes de perder el acuse | Conserva SUCCEEDED, READY y referencia; solo termina limpieza pendiente |
| Recepción/callback local activo o PID de worker vivo/desconocido | Conserva el trabajo y su plaza |
| Owner activo de otro host/raíz o trabajo legacy sin owner | Arranque bloqueado para revisión; no adivina propiedad |
| DELETE remoto falla | Diario PENDING y reintento de limpieza; no revierte la imagen nueva ni repite el procesamiento |

## Archivos y responsabilidades

1. `prisma/schema.prisma` y migración `20261017150000_media_runtime_ownership`: `MediaRuntimeOwner` registra UUID, host, PID, raíz y cierre. `MediaJob` añade owner/receipt, PID/ruta del worker y sello `temporaryCleanedAt`. FK e índices permiten rastrear cada intento. Los CHECK impiden pares PID/ruta incoherentes y sellos de limpieza en trabajos activos. Los campos nullable preservan datos anteriores; no acreditan que puedan recuperarse automáticamente.
2. `src/lib/mediaRuntimeOwnership.ts`: `acquireMediaRuntimeOwnership()` adquiere un advisory lock de sesión PostgreSQL `(7100,2)` en conexión dedicada. Un segundo runtime falla. El lock corto de admisión/toma `(7100,1)` mantiene su función. La pérdida de la sesión exclusiva deja de admitir media; no intenta recuperar liderazgo en caliente.
3. `src/lib/mediaRuntimeContext.ts`: `withMediaRuntimeOwner()` usa AsyncLocalStorage para que `registerReceivingMediaJob()` guarde owner/receipt a través de los await sin aceptar estos valores del navegador.
4. `src/lib/mediaRuntime.ts`: `acquireReceipt().runOwned()` identifica el callback que recibe el archivo. `release()` solicita cierre; mientras quede trabajo dentro, no lo declara libre. El controlador expone `getActiveJobIds()` y el reconciliador recibe getters vivos. El arranque recupera antes de comprobar espacio disponible y antes del polling normal.
5. `src/lib/mediaImageExecutor.ts` y `mediaJobExecution.ts`: `onSpawn` guarda PID y directorio exactos antes de permitir el comando IPC que ejecuta Sharp. Si esa escritura no se confirma, el hijo no empieza a procesar. El padre espera que termine el registro y se confirme el cierre físico. La desconexión IPC termina el worker; el reconciliador comprueba además su PID.
6. `src/lib/mediaJobRecovery.ts`: `recoverMediaJobs()` vuelve a validar owners, trabajo y elegibilidad. Espera hasta 3 s al worker; solo ESRCH prueba ausencia. Bajo locks de filas y coordinación revalida identidad/estado y escribe INTERRUPTED. READY o referencias inconsistentes se conservan para revisión. Las llamadas a S3 y al sistema de archivos ocurren fuera de la transacción corta.
7. `src/lib/mediaUploadReceiver.ts`, `mediaUploadIntake.ts` y `mediaTemporaryCleanup.ts`: el receptor escribe `.receipt-owner.json` después de ganar la creación de la carpeta, vinculando job/owner/token. EEXIST no se apropia del contenido previo. El limpiador comprueba raíz canónica, archivos regulares, marcador propio y contenido permitido; no sigue enlaces ni borra recursivamente sobrantes desconocidos. Tras demostrar que el escritor terminó, puede reconocer variantes propias creadas antes del registro de su ruta. Si cayó entre retirar el marcador y quitar la carpeta, solo intenta `rmdir` sobre la ruta pendiente exacta y vacía. `temporaryCleanedAt` confirma ausencia física; conservar rutas/tokens históricos en DB no conserva originales.
8. `src/lib/mediaAssetCleanup.ts`: el diario valida claves contra manifiesto y namespace del job; solo retira assets RETIRED sin referencia actual. DELETE y HEAD hacen el borrado repetible. Un COMPLETE se vuelve a consultar: si aparece tarde un PUT de un intento retirado, vuelve a retirarlo. `completedAt` rota el barrido para no revisar siempre las mismas primeras cien filas.
9. `src/server.ts`: health devuelve 503 si media está habilitado pero el runtime dejó de aceptar. Al apagar, espera recepciones, workers y respuestas HTTP; S3 se cierra después y Prisma al final.

## Frecuencias y límites

- Cola normal: 500 ms. Huérfanos del runtime vivo: cada 2 s. Limpieza pendiente: cada 60 s. Revisión de assets COMPLETE: cada hora. Barrido completo al arrancar; lotes de hasta 100 registros por consulta.
- No se toma la edad del archivo ni un timeout como prueba de muerte. PID reutilizado, EPERM o host/raíz no coincidentes conservan/bloquean; requieren revisión. No se mata un proceso encontrado por recuperación.
- El reintento automático es de limpieza, no de subida/compresión/publicación. Un trabajo interrumpido requiere nueva subida manual. No cambia el acuerdo 2+10, FIFO/180 s o Sharp/30 s.
- Los temporales conocidos de trabajos ya terminales se limpian al confirmar su cierre. El rastreo genérico de archivos abandonados sin job/marcador, elegibles tras 24 h y revisión horaria, continúa pendiente; no se borran por parecer antiguos. Borradores/referencias de propuestas y avatares pertenecen a otros bloques.
- Esta exclusividad depende de PostgreSQL y comprobación local de procesos. Múltiples hosts, recuperación automática tras pérdida de liderazgo, despliegue Linux/producción y backups quedan fuera de la validación local. Un reinicio completo del sistema operativo no se ha ejecutado como prueba.

## Evidencia reproducible

Entorno: Windows, Node24.14.0, PostgreSQL aislado `127.0.0.1:55437/weblogros_ui`, SeaweedFS4.47 privado en `127.0.0.1:8333`. La migración aditiva se aplicó solo a esta base; 24 migraciones al día.

`src/lib/mediaJobRecovery.integration.test.ts` crea fixtures propias y lanza `src/experiments/mediaRecoveryCrashProbe.ts` en procesos hijos. Los mata en cinco fronteras reales: recepción, espera, Sharp en marcha, primer objeto S3 guardado y commit final realizado sin respuesta al caller. Comprueba estados, referencias, plazas y ausencia de temporales/objetos retirados. Otros casos fuerzan rollback o pérdida de acuse con wrappers alrededor de transacciones reales, y comprueban receipts activos, release anticipado, PID vivo, owner desconocido, limpieza S3 fallida/reaparición y pérdida real de la conexión exclusiva mediante `pg_terminate_backend` sobre la conexión creada por el test.

La reaparición S3 se provoca escribiendo de nuevo una clave retirada: demuestra reconciliación de ese estado, no una caída de red real durante un PUT. Los actores de crash tienen opt-in y restricciones al entorno aislado; no forman parte del arranque del servidor.

Ejecutar desde `apps/backend`, con el backend local detenido para no compartir la cola:

```powershell
npm run build
node --env-file=../../.env.media.local --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_RECOVERY_TEST="1"; require("./dist/lib/mediaJobRecovery.integration.test.js");'
```

El teardown elimina exclusivamente sus fixtures, claves y raíces temporales comprobadas; compara recuentos antes/después. La evidencia final y los restantes recorridos se siguen en [MEDIA-PLAN](../MEDIA-PLAN.md).

Resultado final: recuperación **16/16**, limpieza temporal **5/5**, ejecutor **11/11**, receptor **14/14**, API **13/13**, pipeline **18/18**, enlace ejecución **12/12**, intake **14/14**, admisión **9/9**, toma **5/5** y adaptador S3 **1/1** PASS: **118 comprobaciones**, incluidos casos padre. Build, seed:check y migrate status PASS. Snapshot de fixtures antes/después: 13 usuarios, 2 equipos, 14 membresías, 19 logros y 0 jobs/assets/cleanups/owners. El runtime real crea su propio owner al volver a arrancar; no es una fixture abandonada.

Backend compilado restaurado en3001 con los contenedores existentes: arranque con recuperación PASS, `/health`200 y lectura de imagen sin sesión401/no-store. Raíz de producto sin imágenes de prueba ni originales, solo marcador de raíz. Revisión independiente sin bloqueantes; PID reutilizado mantiene el límite conservador descrito arriba. No se ejecutó despliegue ni commit/push.


Continuación del 2026-10-17: [cancelación persistente por API](MEDIA-CANCELLATION.md) implementada; incorpora intención a recuperación tras reinicio y guard final de publicación. Cancelación12/12 y recuperación ampliada17/17 PASS;25 migraciones en base aislada. La evidencia anterior describe su entrega histórica.


Continuación 2026-10-18: [barrido de abandonados](MEDIA-ABANDONED-CLEANUP.md) implementado con journal propio, umbral24h, revisión horaria/cursor y parada cooperativa. Barrido24/24 y155 comprobaciones totales PASS;26 migraciones en la base aislada. El texto anterior conserva la evidencia y pendientes de su entrega histórica.
