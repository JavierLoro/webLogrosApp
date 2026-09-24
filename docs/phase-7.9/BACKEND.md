# Temporadas: validación y concurrencia — 2026-09-24

## Alcance

Correcciones acotadas en routes/seasons.ts y schemas/seasons.ts; endpoints existentes y máquina PLANNED → ACTIVE → CLOSED conservados. Activar ACTIVE sigue siendo idempotente. CLOSED nunca se reactiva. Cerrar PLANNED/CLOSED devuelve 409. Objeto inexistente o de otro equipo devuelve 404. Sin schema adicional ni cambios al cálculo de puntos/historial.

## Cambios y motivos

- Activar y cerrar toman `SELECT id FROM Team WHERE id = ... FOR UPDATE` dentro de su transacción **antes** de leer la temporada. Ambas operaciones usan el mismo candado por equipo aunque el ID de temporada sea distinto. Evita que una petición lea PLANNED, espere a otra transición que la cierre y luego sobrescriba ese CLOSED con ACTIVE. El índice parcial existente sigue protegiendo la unicidad de temporada activa.
- El SQL usa template parametrizado Prisma, nunca concatenación de entrada. El candado se libera al commit/rollback. Equipos distintos pueden operar independientemente.
- Crear confía en la restricción única de BD y traduce P2002 a 409. El antiguo consultar→crear podía devolver 500 ante dos nombres iguales simultáneos.
- Fechas exigen strings ISO datetime con Z u offset explícito, validados por Zod antes de convertir a Date. Se rechazan null, booleanos, números, fechas calendáricas imposibles y fechas sin hora/zona. Se comparan instantes: fin > inicio.
- Payload de creación estricto y asignación de campos explícitos. Permisos existentes: lectura miembro, escritura TEAM_ADMIN scoped.

## Contrato fechas

Ejemplos válidos: `2026-09-24T00:00:00.000Z`, `2026-09-24T02:00:00+02:00`. La UI debe enviar `toISOString()`. Un campo HTML date necesita transformarse a datetime antes de enviarse; no se asume zona silenciosamente en backend.

## Verificación

- Diff check PASS.
- Smoke del validador Zod instalado: Z/offset válidos; null/0/true, 30 de febrero, date-only y hora 24:00 rechazados.
- QA es único actor de migración/generación/build/runtime; avisado de código congelado para comprobar conjuntamente cliente sin legado y temporadas.
- Casos HTTP exigidos: permisos401/403, tenant404, estados409, duplicado concurrente201+409, activación doble (misma y distinta temporada), activación/cierre concurrentes sin reapertura de CLOSED, fechas y campos extra400, historial después del cierre.

## Límite operativo

El candado coordina las transiciones de temporada de estas rutas. No añade bloqueo ni cambia las reglas de concesiones/progreso; conserva el alcance existente de ese dominio. Ante ráfagas de administración la base espera el candado o aplica su timeout transaccional; esta entrega no añade colas ni reintentos globales.


Cierre posterior: build y HTTP/concurrencia PASS. [Suite y límites](qa/QA.md). La carrera activar/cerrar sobre el mismo periodo termina CLOSED y el intento posterior de reapertura devuelve409.
