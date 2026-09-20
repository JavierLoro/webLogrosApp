# UI-G1-T05 — Evidencia QA

Fecha: 2026-09-20  
Rol: `qa_capture`  
Resultado: **PASS**

## Entorno aislado

- Fuente bajo prueba: copia exacta del backend del worktree `C:\Users\javie\.codex\worktrees\ui-visual-convergence\webLogrosApp`.
- Ejecución: CT112 `devbox`, exclusivamente en `/tmp/weblogros-ui-g1-t05.oc1qk7`.
- PostgreSQL temporal: contenedor `weblogros_ui_g1_t05_20260920`, publicado solo en `127.0.0.1:55432`.
- Base desde cero: `weblogros_qa`.
- Base de upgrade: `weblogros_upgrade_qa`.
- Backend temporal: una única instancia local en `127.0.0.1:3001`.
- Credenciales de seed/JWT: generadas de forma efímera; no se imprimieron ni conservaron.
- Checkout principal `/srv/projects/webLogrosApp`: no modificado y limpio al terminar.
- `weblogros_db`: no arrancado; continuó `Exited (255)`.

Se aplicó `.agents/skills/weblogros-entorno-seguro/SKILL.md`. El preflight propio `local dev` pasó antes de iniciar servicios:

- memoria disponible: 7441 MiB de 8192 MiB;
- reserva requerida: 2560 MiB;
- swap: 91% usada, advertencia no bloqueante;
- contenedores de aplicación: ninguno;
- procesos locales de aplicación: ninguno;
- puertos relevantes: libres;
- `oom`/`oom_kill`: 0.

## Migraciones y build

| Prueba | Resultado |
| --- | --- |
| `npx prisma migrate deploy` sobre PostgreSQL vacío | **PASS** — 13/13 migraciones aplicadas |
| Upgrade desde las 10 migraciones previas con filas históricas | **PASS** — las 3 migraciones nuevas aplicadas sin pérdida |
| Compatibilidad de fila histórica | **PASS** — `displayName` y `rejectionReason` quedaron null; `createdAt` obtuvo backfill; `criterios=[]` |
| `npx prisma generate` en la copia temporal | **PASS** |
| `npm run build` | **PASS** |
| `npm run seed:check` | **PASS** |
| `git diff --check` en el worktree | **PASS**; solo avisos informativos LF/CRLF |

La primera invocación del seed en la copia temporal detectó correctamente un Prisma Client heredado y desactualizado. Se ejecutó `prisma generate` solo en `/tmp`; después el seed y ambos builds pasaron. No fue un defecto del código versionado.

## Seed determinista

Se ejecutó `npx prisma db seed` dos veces sobre la base temporal. Ambas ejecuciones informaron:

- 2 equipos;
- 19 logros globales;
- 13 usuarios globales;
- 42 concesiones globales;
- 8 solicitudes;
- 6 invitaciones;
- 6 propuestas.

Se comparó un snapshot ordenado de todas las tablas de dominio antes y después del segundo seed. Se excluyeron únicamente password y ciphertext, que deben seguir siendo aleatorios. Conteos y hashes fueron idénticos:

| Tabla | Filas | Snapshot estable |
| --- | ---: | --- |
| Team | 2 | `d17521ca22f3e31049cefca1612816c2` |
| User | 13 | `0640a5f984cf2f3378314f7f9527fa3f` |
| TeamMembership | 14 | `2bdf57bddc1376c03ee9f86212de137c` |
| Logro | 19 | `82cda82a60ea18ff7d9ee6bcf6f9cf80` |
| UserLogro | 42 | `4058fba77997c232243e895c843f3b23` |
| SolicitudLogro | 8 | `9d2adc83886120fffe0edbab1ce4e76a` |
| TeamInvitation | 6 | `a4c611a66bda6caef94422f5a5fabf7a` |
| PropuestaLogro | 6 | `f3af175a5dd76a4b2ac0a2cdd69b04b7` |

Fixture Halcones verificado en PostgreSQL:

- 12 miembros: 10 PLAYER + 2 TEAM_ADMIN;
- 2 miembros con cero logros;
- 14 logros y 40 concesiones;
- 8 solicitudes: 4 PENDING, 2 ACCEPTED y 2 REJECTED;
- toda solicitud ACCEPTED tiene concesión y ninguna PENDING/REJECTED la obtiene por esa solicitud;
- 6 propuestas: 2 PENDING, 2 ACCEPTED y 2 REJECTED;
- toda propuesta ACCEPTED enlaza catálogo; ninguna propuesta crea concesión o solicitud;
- 6 invitaciones: 3 activas, 1 agotada, 1 caducada y 1 revocada según el reloj de captura.

## Matriz HTTP y concurrencia

| Criterio | Evidencia | Resultado |
| --- | --- | --- |
| Login fixture | PLAYER, TEAM_ADMIN y SUPER_ADMIN autenticaron; equipos/roles/global flag correctos | **PASS** |
| Protección | 401 sin token; 403 para PLAYER/no miembro en admin; TEAM_ADMIN no obtiene permiso global | **PASS** |
| Contexto | slug, nombre público y rol contextual correctos | **PASS** |
| Jugadores | 12 filas, incluidos 2 miembros con cero | **PASS** |
| Ranking | totales 12/14/40, posiciones ordinales y empate María/Carmen resuelto por id | **PASS** |
| Dashboard | mismos totales, top 3 y 6 concesiones recientes | **PASS** |
| Aislamiento | Ana suma puntos en Halcones y cero en Lobos; IDs de logros cruzados devuelven 404 | **PASS** |
| Catálogo | 14 filas con `holdersCount` y `earnedByMe` | **PASS** |
| Invitaciones | 6 filas descifrables solo por TEAM_ADMIN; estados deterministas correctos | **PASS** |
| Solicitudes | creación propia, detalle admin, motivo obligatorio/trim, histórico propio y aceptación | **PASS** |
| Solicitud repetida | segunda resolución no muta datos y devuelve 404 con la semántica actual | **PASS** |
| Propuesta propia | creación/lista/detalle por autor; campos de control extra rechazados con 400 | **PASS** |
| Propuesta admin | filtro `all`, estado inválido 400, autor visible y PLAYER 403 | **PASS** |
| Cruce de propuesta | propuesta Lobos consultada desde Halcones devuelve 404 | **PASS** |
| Aprobación concurrente | dos peticiones simultáneas produjeron exactamente 200 + 409 | **PASS** |
| Efecto de aprobación | exactamente +1 Logro; +0 UserLogro; +0 SolicitudLogro; contenido/criterios/puntos/categoría conservados | **PASS** |
| Aprobación repetida | 409, sin catálogo duplicado | **PASS** |
| Rechazo de propuesta | motivo obligatorio/trim, `logroId=null`, repetición 409 | **PASS** |
| Creación directa | PLAYER 403; TEAM_ADMIN conserva descripción, categoría y criterios | **PASS** |

El primer intento de lectura de invitaciones recibió 500 porque una instancia QA huérfana seguía usando una clave efímera anterior. Se comprobó el `JWT_SECRET` sin mostrarlo, se confirmó `MISMATCH`, se detuvo únicamente ese PID, se resembró y se inició una sesión supervisada con la misma clave. La repetición completa terminó en `RUNTIME_GATE_PASS`. Esto fue un error del montaje temporal, no un defecto del producto.

## Alcance y limpieza

- No aparecen uploads, storage, WebSockets ni campos nuevos de imagen/avatar/banner en schema o rutas del cambio.
- `docs/apuntes.md` documenta T02–T04 y el backend nuevo conserva comentarios `// 📚`.
- El frontend administrativo V1 todavía rechaza sin `{reason}`; es el bloqueo conocido que debe adaptar UI-G8 y no afecta este gate backend.
- El backend no dispone de una suite `npm test`; la batería anterior fue ejecutada expresamente contra PostgreSQL/HTTP reales.

Limpieza final verificada:

- sesión backend detenida y puerto 3001 libre;
- contenedor temporal detenido y eliminado;
- puerto 55432 libre;
- `/tmp/weblogros-ui-g1-t05.oc1qk7` eliminado;
- checkout principal limpio;
- base principal sin arrancar.

**Conclusión QA: UI-G1-T05 cumple su contrato y el gate UI-G1 puede cerrarse.**

