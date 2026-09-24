# Backend de perfil y alias — 2026-09-24

## Contratos

- `GET /auth/profile`: sesión obligatoria; respuesta `{id,email,firstName,lastName,memberships:[{role,displayName,team:{slug,nombre}}]}`. Los nombres son nullable para cuentas antiguas; memberships puede estar vacío.
- `PATCH /auth/profile`: `{firstName,lastName}` obligatorios, trim y límites 1–80/1–120 iguales al registro. Devuelve la misma forma de GET.
- `PATCH /equipos/:slug/mi-alias`: `{displayName:string|null}` obligatorio, trim, máximo 80; vacío se normaliza a null. Devuelve `{displayName}`.
- Los cuerpos PATCH son estrictos: claves adicionales (email, password, userId, teamId, role, isSuperAdmin…) producen 400, incluso combinadas con datos válidos.
- Cuenta desde JWT y equipo desde resolveTeam. PLAYER y TEAM_ADMIN pueden editar su propio alias; ningún rol obtiene aquí edición de alias ajenos. Falta de sesión 401, falta de pertenencia 403, equipo inexistente 404. Una cuenta eliminada produce 401 al leer/editar el perfil.

## Decisiones

La identidad global pertenece a User; el alias pertenece a TeamMembership. Cambiar nombres conserva todos los alias. Borrar alias conserva la membresía y recupera la regla existente `alias → nombre completo → Miembro {id}` en las lecturas tenant. No cambia el JWT: contiene userId y las lecturas consultan datos actuales.

Proyección explícita de campos evita exponer password, isSuperAdmin o User.displayName legado. PATCH usa campos validados y explícitos, no un spread del body. El perfil actualiza y lee dentro de una transacción; updateMany detecta cuenta eliminada sin error 500. Alias repite userId+teamId en la escritura y falla si la pertenencia desaparece entre middleware y handler. Reenviar los mismos valores es idempotente; no se crean relaciones ni eventos adicionales.

Sin cambios Prisma, migraciones, seed, autenticación, cookies ni endpoints de terceros. Sin uploads. Notas pedagógicas en bloques afectados; el Coordinator incorpora los apuntes a docs/apuntes.md.

## Auditoría del legado

No se encontraron consumidores explícitos de `User.displayName` en `apps/backend/src`: las lecturas públicas usan `TeamMembership.displayName` y firstName/lastName mediante `publicName`. El seed todavía escribe User.displayName en `apps/backend/prisma/seed.ts` (upsert User); el schema mantiene la columna nullable. La migración histórica `20260921120000_global_and_team_identity` la utilizó para rellenar alias existentes.

Retirada pendiente aparte: eliminar escrituras legacy del seed, comprobar los datos que aún necesitan completar identidad, crear una migración nueva que retire la columna y regenerar cliente. Preservar migraciones históricas. No confundir campos DTO llamados displayName (nombre contextual calculado) con la columna User.displayName.

## Validación

- `npm --prefix apps/backend run build`: PASS tras corregir inferencia readonly de orderBy mediante `satisfies Prisma.UserSelect`.
- Contratos de autorización, validación e aislamiento: ejecución HTTP y evidencia a cargo de QA en esta misma carpeta, con fixtures temporales y sin tocar las canónicas.


Actualización posterior 2026-09-24: la retirada descrita como pendiente arriba ya está aplicada y validada localmente. [Migración y conservación](LEGACY-CLEANUP.md). El apartado anterior conserva la auditoría previa al cambio.
