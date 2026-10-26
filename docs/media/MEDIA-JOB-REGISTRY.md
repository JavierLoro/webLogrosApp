# 7.10 — Primera pieza funcional: registro de trabajos

Fecha: 2026-10-12. **IMPLEMENTADO Y VERIFICADO LOCALMENTE.** El usuario pidió ir montando las piezas mientras se explica cada bloque. Se adelantó solo esta base aditiva al cierre completo de T02.03/T03; el ejecutor, cancelación y subidas HTTP siguen pendientes. Esperar comprensión del registro antes del siguiente bloque.

## Código y datos introducidos

- `apps/backend/prisma/schema.prisma`: `MediaJobState` y `MediaJob`, con relaciones a User y Team. Las listas inversas `mediaJobs` son relaciones Prisma; no añaden columnas físicas a User/Team.
- Migración `20261012120000_media_job_registry`: enum, tabla, claves externas, índices y CHECK; aditiva, sin retirar columnas ni transformar registros existentes.
- `apps/backend/src/lib/mediaJobs.ts`: `registerReceivingMediaJob` y `findMediaJobForOwner`, con selección explícita de datos de respuesta y error 409 ante reserva duplicada.
- `apps/backend/src/lib/mediaJobs.integration.test.ts`: integración opt-in en la base Windows aislada, fixtures propias y limpieza scoped.

`MediaJob` conserva UUID, solicitante/owner, equipo opcional, clave interna canónica de destino, estado, tiempos y código seguro de fallo opcional. No almacena original, rutas de usuario, credenciales, EXIF ni variantes de imagen. El UUID lo genera Prisma al crear; los datos se escriben en PostgreSQL.

Una creación devuelve `RECEIVING`: existe un registro/reserva, no una imagen recibida ni un trabajo ejecutado. `findMediaJobForOwner` filtra en la consulta por UUID y propietario; devuelve null tanto para un registro ausente como para uno ajeno. El DTO contiene solo ID, estado, tiempos y código de fallo: no expone claves internas.

## Reserva del destino y límites de esta pieza

`resourceKey` identifica el destino resuelto por el backend. `activeResourceKey` contiene la misma clave durante RECEIVING/QUEUED/PROCESSING/PUBLISHING y tiene un índice UNIQUE. Así dos llamadas concurrentes no pueden reservar ese destino a la vez, incluso si un proceso local todavía no vio la otra llamada.

El CHECK exige coherencia entre estado, clave activa y finalización: activos conservan clave y no tienen completedAt; terminales liberan clave y requieren completedAt. Es una garantía de estructura de datos, **no una prueba de que un proceso Sharp se haya detenido**. La transición terminal deberá comprobarlo mediante el protocolo de ejecución/cancelación que todavía falta.

El helper reconoce el conflicto P2002 de esa clave específica. Prisma 7.5 con adapter-pg lo informó en `meta.driverAdapterError.cause.constraint.fields`, con el nombre SQL entre comillas, en lugar de `meta.target`. La primera prueba detectó que el 409 no se traducía; se corrigió para ambos formatos y volvió a pasar. Otros errores se propagan.

El llamador puede aportar una `Prisma.TransactionClient`: la admisión global futura podrá comprobar/cargar plazas y crear el registro dentro de la misma transacción. **Este módulo todavía no implementa el máximo global 2 + 10**, ni toma trabajos, genera archivos o ejecuta Sharp.

No existe endpoint que acepte resourceKey/ownerId libremente desde el navegador. El futuro llamador debe resolver el destino, obtener usuario de sesión y verificar permisos/alcance antes de registrar. Esta base no sustituye la matriz de permisos ni demuestra autorización de subida a un recurso concreto. Las referencias tipadas de imagen/destino y las relaciones del ciclo de vida siguen en T03.

FK Restrict impide borrar User/Team mientras haya registros de trabajo referidos. Una futura eliminación debe coordinar esos registros y limpieza; no se ha añadido una función de borrado. Archivar/borrar una membresía no elimina automáticamente el usuario global.

## Entorno y comprobaciones

- Preflight Windows: aproximadamente 14.497 MiB RAM libre y puertos 3000/3001/55437 sin listeners al comenzar.
- Docker Desktop iniciado para esta prueba; se reutilizó solo `weblogros_ui_windows`, PostgreSQL 16, volumen `weblogros_ui_windows_data`, puerto loopback 55437. SeaweedFS quedó detenido; Compose general/servidores no se iniciaron.
- Destino comprobado sin mostrar credenciales: `127.0.0.1:55437/weblogros_ui`, cargado desde `.env.ui-windows` ignorado.
- Antes de aplicar: 13 usuarios, 2 equipos, 14 membresías, 19 logros; última migración aplicada `20260924180000_remove_legacy_user_display_name`.
- `prisma validate`, `prisma generate`, `migrate deploy` PASS. Se aplicó únicamente la nueva migración pendiente. `migrate status`: 18 migraciones, base al día.
- `migrate diff --from-config-datasource --to-schema prisma/schema.prisma --exit-code`: ninguna diferencia en los elementos representables por Prisma. CHECK personalizados verificados mediante SQL/prueba, no inferidos del diff.
- Backend build y `seed:check` PASS. No se ejecutó seed ni reset.

Pruebas: 7 casos hijos y prueba contenedora, resultado de `node:test` **8 PASS / 0 FAIL**:

| Caso | Resultado |
| --- | --- |
| Registro RECEIVING y recuperación desde otra conexión Prisma | PASS |
| Otro usuario/UUID inexistente no devuelve datos | PASS |
| Dos reservas simultáneas del mismo destino | PASS: una creación y un AppError 409; una sola fila |
| Equipo/solicitante conservados | PASS |
| Liberar activeResourceKey manteniendo estado activo | PASS: PostgreSQL rechaza con CHECK 23514 |
| Terminal coherente permite nuevo registro y conserva anterior | PASS; fallo simulado sobre fixture sin ejecutor |
| Borrar propietario con trabajos referidos | PASS: FK rechaza la operación |

Al acabar: 13 usuarios, 2 equipos, 14 membresías, 19 logros y 0 MediaJob, igual que antes de las fixtures. La nueva tabla/migración permanecen; solo se retiraron registros del ensayo. La prueba verifica persistencia entre conexiones, no reinicio nuevo del contenedor PostgreSQL ni recuperación de un procesador inexistente.

## Repetición en Windows aislado

Desde `apps/backend`, con la base aislada existente en marcha y su configuración local:

```powershell
node --env-file=.env.ui-windows node_modules/prisma/build/index.js generate
npm run build
node --env-file=.env.ui-windows -e 'process.env.MEDIA_JOB_REGISTRY_TEST="1"; require("./dist/lib/mediaJobs.integration.test.js");'
```

La prueba afirma host, puerto y base antes de cualquier escritura; otro destino aborta. No contiene contraseñas reales ni reseembra el fixture visual.

## Estado y siguiente punto

Registro/lectura/reserva por destino listos como base interna. T03.02/T03.03 y T05.01 tienen avance parcial; ninguno se cierra por esta entrega. T02.03 debe terminar ejecución/cancelación, admisión/orden/tiempos, reinicios y avisos; T03 debe completar modelos/referencias/API; T05 integra recepción, procesamiento y publicación. Las pruebas no habilitan imágenes en frontend ni cierran los gates visuales.

Continuación posterior del 2026-10-12: el usuario pidió montar [el ejecutor Sharp aislado](MEDIA-IMAGE-EXECUTOR.md), ya implementado/probado sin conexión al registro. Siguiente acción vigente: explicar ese bloque y esperar comprensión antes de toma/admisión/transiciones persistentes. El cambio de orden autorizado no reabre formatos, tamaños, conservación ni permisos.
