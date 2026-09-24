# Retirada de User.displayName — aplicada localmente 2026-09-24

Autorizada por usuario «vamos con ello». Ownership backend: schema, seed y nueva migración. No incorpora temporadas ni media.

## Auditoría y estrategia

Las lecturas runtime ya usan `firstName`/`lastName` y `TeamMembership.displayName`; los DTO `user.displayName` del frontend son nombres contextuales calculados, no consumidores de la columna antigua. El único escritor encontrado es el upsert User del seed. Se eliminan esas dos asignaciones y la columna del schema; permanecen los aliases del seed y las migraciones históricas intactas.

No se puede interpretar un alias antiguo como nombre y apellidos fiables. Tampoco `membership.displayName IS NULL` prueba que falte migrar: desde 7.8 puede indicar una elección explícita de borrar el alias. Por ello esta migración NO copia datos a esos campos.

`20260924180000_remove_legacy_user_display_name/migration.sql` incluye un guard: cada texto legado no vacío, normalizado con BTRIM, debe estar representado por el nombre global concatenado o por un alias existente de ese usuario. Si queda alguno sin representar, aborta antes de DROP. La transacción bloquea ambas tablas durante guard y DROP para evitar modificaciones concurrentes. Conserva nombres nullable para identidades antiguas incompletas.

Con este criterio se conserva todo texto significativo del legado en campos activos y no se inventan identidades. No se conserva el espacio exterior del campo retirado. El DROP es irreversible sin una copia previa; para otro entorno hay que auditar primero y revisar cualquier valor no representado. No debe desbloquearse mediante backfill ciego ni borrando datos del usuario.

## Lectura local previa

Destino verificado: localhost/127.0.0.1, puerto 55437, base weblogros_ui. Docker único weblogros_ui_windows healthy. Memoria libre 7809 MiB. Transacción BEGIN READ ONLY y ROLLBACK; no datos personales ni credenciales en salida.

- Usuarios: 13.
- Legado no vacío: 13.
- Identidad global incompleta (algún nombre/apellido null/vacío): 13.
- Valores no representados: 0; IDs bloqueantes: ninguno.

La identidad incompleta es real; no se convierte en datos ficticios. Los alias existentes preservan los nombres de presentación y el usuario puede completar perfil.

## Verificación / coordinación

1. Coordinator verifica/paraliza únicamente runtime propio antes de cambiar cliente Prisma.
2. QA ejecuta SQL candidata sobre tablas de prueba aisladas: legado representado en nombre, representado solo en alias, vacío/null, alias explícitamente borrado, valor huérfano y usuario sin membresías. El huérfano debe abortar y conservar columna/datos.
3. Generar cliente, compilar backend y comprobar tipos seed sin ejecutar seed.
4. Coordinator autoriza operativamente deploy de migración a base aislada tras QA; nunca reset ni CT112. Auditar snapshot de nombres/alias antes/después.
5. Reiniciar runtime propio; verificar perfil, alias/fallback, contexto y lecturas tenant.

Estado inicial de esta evidencia: candidata escrita y diff check PASS; migración NO aplicada, cliente NO regenerado, runtime NO detenido por este worker. Registrar resultados posteriores en este documento/evidencia QA antes del cierre.


## Resultado de ejecución local

QA aplicó la migración en la base aislada tras probar el guard sobre tablas temporales con rollback. Casos de representación global/alias/null PASS; textos huérfanos y alias de otra persona rechazados sin pérdida. [Prueba SQL](qa/legacy-guard-results.json).

Migraciones 17/17 aplicadas, cliente Prisma regenerado, backend build y seed:check PASS. No se ejecutó seed. [Preservación](qa/legacy-preservation.json): 13 usuarios y 14 membresías con nombres/alias idénticos, columna antigua ausente. Backend reiniciado de forma controlada; runtime y regresión HTTP se consolidan en la entrega [7.9](../phase-7.9/RESULT.md).

La sección anterior conserva el plan previo; sus menciones «NO aplicada» describen ese momento, no el resultado final.
