# Roadmap

## Ruta de aprendizaje
JS → TS → Express → PostgreSQL → Docker → Prisma → JWT → Nginx → CI/CD → Proxmox → Hardening → Multi-tenancy (Relaciones DB) → **Frontend V1 code-first** → Roles → Auth Hardening → Solicitudes/Admin → Propuestas → Identidad → Temporadas → **Imágenes y almacenamiento (7.10)** → **Visual convergence (image-first)** → Aggregaciones SQL → Comunidad → shadcn/ui → Ampliaciones de archivos → Testing → **WebSockets**

> **Concepto de la app:** plataforma multi-tenant de logros — ver mapa de rutas y roles en [Architecture.md](Architecture.md)

## Situación actual — base conciliada el 2026-09-22; planificación de media actualizada el 2026-09-24

La numeración describe el itinerario de aprendizaje, no una secuencia estricta de entrega. El rediseño ha adelantado trabajo de propuestas, ranking y estadísticas. Las casillas completadas describen su alcance concreto; no implican despliegue en producción ni cierre de toda la fase.

| Área | Estado real | Qué queda |
| --- | --- | --- |
| Base, equipos, roles y administración V1 | Completados en su alcance | Lecturas adicionales por jugador cuando se requieran |
| Despliegue y protección del entorno (5/5.5) | Parcial | Confirmar HTTPS y copias externas del backup |
| Seguridad de sesión (7.5) | Completada; QA manual 22/09 | No repetir la migración a cookies |
| Propuestas (7.7) | Backend y formulario por rol completados | Historiales UI-G7, administración UI-G8 e imágenes en Phase 10 |
| Identidad (7.8) | Nombre/apellidos y alias contextual implementados y validados localmente | Editar perfil/alias, retirar campo legado y avatar |
| Temporadas (7.9) | Migración local e integración #30/#29 verificadas; fase sin cerrar | Administración visual, selector histórico y QA restante de #11 |
| Rediseño G0–G5 | Gates cerrados | Regresión conjunta y últimos refinamientos en el cierre final |
| Acceso y onboarding A1/A2 | En curso; foco actual UI-A2-T04 | QA funcional y cierre visual de ambos bloques |
| Jugadores G6 | Pantalla implementada; continuación pausada en T03 | Capturas, pruebas de navegador y gate visual |
| Solicitudes, administración y revisión G7–G9 | Pendientes | Continuar al reanudar la línea principal |
| Ranking y estadísticas (8) | Capacidad entregada dentro de G1/G3/G5 | Profundización pedagógica SQL y regresión final pendiente |
| Imágenes y almacenamiento adelantados (7.10) | Decisiones de uso locales y plan por tareas cerrados; sin implementación | [T02/T03: diseño técnico](MEDIA-PLAN.md#52-diseño-e-infraestructura), luego logro completo → logos → avatares → QA; controles aplazados a nuevas pestañas |
| Conservación, archivo y eliminación de jugadores | Reglas acordadas; bloque propio relacionado con identidad/temporadas | [PLAYER-LC-T01–T07](PLAYER-LIFECYCLE-PLAN.md#3-tareas-y-dependencias); conservación/reingreso antes de completar avatar específico; eliminación/admin no absorbidos por uploads |
| Comunidad, evolución UI, imágenes, testing y tiempo real | Futuro | Fases 8.5–12 y decisiones del backlog |

Fuentes: [STATUS](ui-workstream/STATUS.md), [TASKS](ui-workstream/TASKS.md), [QA de UI-G1](ui-workstream/evidence/UI-G1-T05-QA.md) y [registro de pendientes](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). El commit local `c2ca920` reúne identidad, temporadas y sesiones. La publicación remota y el estado de las issues no se verifican mediante esta conciliación documental.

Orden de entrega planificado: **diseño de 7.10 y conservación del jugador → almacenamiento/base común → logro completo → logos → avatares → QA y cierre local → despliegue/backups cuando se retomen**. La línea visual sigue en UI-A2-T04 y G6–G9 pausada; este orden no cambia sus gates. El recorrido completo de cada tipo necesita ubicar sus controles, decisión aplazada. Phase 7.10 se sitúa después de temporadas y antes de continuar el frontal con imágenes reales; no requiere completar antes Comunidad, shadcn/ui ni WebSockets.

---

## Phase 1 – Project Base
- [x] Create GitHub repository
- [x] Next.js + TypeScript initialized
- [x] Express + TypeScript initialized
- [x] Basic health endpoints and local run scripts

## Phase 2 – Public Website
- [x] Public homepage
- [x] Achievements list page (`/logros`, `/logros/[id]`)
- [x] Backend public endpoints (GET /logros, GET /logros/:id)

## Phase 3 – Auth & Admin
- [x] Register + Login pages (Client Components)
- [x] Auth (JWT) — backend: register, login, authMiddleware
- [x] Protected create-logro form (históricamente con localStorage; sustituido por cookie HttpOnly en Phase 7.5)
- [x] Session-aware header (usePathname + useEffect)
- [x] Backend protected endpoints (POST /logros)

## Phase 4 – Database
- [x] PostgreSQL container (Docker)
- [x] Prisma schema + migrations
- [x] Seed data idempotente (`npm run seed`) — equipos, logros, usuarios y asignaciones de prueba

## Phase 5 – Deployment
- [x] Dockerfiles (frontend + backend)
- [x] Docker Compose (db + backend + frontend + nginx)
- [x] Nginx reverse proxy (puerto 80, /api/* → backend, /* → frontend)
- [x] Proxmox — despliegue en servidor local/VM
- [x] GitHub-based deployment workflow (GitHub Actions → GHCR + Watchtower)
- [ ] HTTPS (Let's Encrypt) — verificar si Cloudflare Tunnel ya provee TLS en el borde; quizá solo falta confirmarlo

## Phase 5.5 – Hardening
> **Concepto nuevo:** configuración por entorno, validación en runtime, defensa en profundidad

- [x] **Fix URLs del frontend** — sustituir `http://localhost:3001` hardcodeado por rutas relativas `/api/*` (vía nginx) o `NEXT_PUBLIC_API_URL`. Bug latente: en producción el navegador del visitante intenta conectarse a *su propio* localhost:3001, que no existe
- [x] Validación de entrada con **Zod** en `POST /logros` y `/auth/*` — nunca confiar en el cliente
- [x] **Error handler global** + clases de error centralizadas (patrón de `nodejs-backend-patterns`)
- [x] **Fail-fast al arranque** — validar `JWT_SECRET` y `DATABASE_URL` al iniciar, con mensaje claro si faltan (eliminar el `!` que revienta en runtime de forma críptica)
- [x] **Rate limiting** en `/auth/login` con `express-rate-limit` — protección básica contra fuerza bruta (también en `/auth/register`; `trust proxy` para nginx)
- [x] **Healthcheck** — endpoint `GET /health` (readiness, `SELECT 1` a la BD, 503 si falla) + `healthcheck:` en Docker Compose (db con `pg_isready`, backend con Node `fetch`) + `depends_on: condition: service_healthy` (resuelve el clásico "backend arranca antes que la DB")
- [x] **Backup automático de PostgreSQL** — sidecar DIY (`postgres:16` + bucle `pg_dump | gzip`, retención 7d con `find -mtime`) a `./backups` (volumen host); `backups/` en `.gitignore` (los datos son lo único irrecuperable; una migración mala con Watchtower auto-desplegando puede destruirlos)
- [x] `apuntes.md`: sección "Hardening — validación, errores y configuración" (fail-fast, error handler, Zod, rate limiting, healthchecks, backup)
- [ ] **Copias offsite del backup** (pasos manuales del host, documentados en apuntes) — cronjob `rsync` a otro disco/CT del Proxmox + opción `rclone` a Google Drive (regla 3-2-1)

## Phase 6 – Multi-tenancy: modelo de datos (Relaciones en Prisma)
> **Concepto nuevo:** relaciones one-to-many / many-to-many, `@relation`, `@@unique`, rutas dinámicas anidadas

- [x] Nuevo modelo `Team` — `slug` único, `nombre` (DECISIÓN: sin `esPublico`; los logros de un equipo son SIEMPRE privados a sus miembros. La reutilización entre equipos se hace por publicación *a nivel de logro* en Phase 8.5, no por equipos públicos)
- [x] `Logro` pasa a pertenecer a un equipo (`teamId`) + campos: `descripcion`, `categoria`, `icono` (emoji). DECISIÓN: `Logro` es la INSTANCIA del equipo; la PLANTILLA proponible/comunitaria (con `firma`/atribución) es una tabla aparte en Phase 8.5, no ahora
- [x] Membership `User` ↔ `Team` — primera versión con `teamId Int?`; evolucionada en Phase 7 a `TeamMembership` para pertenecer a varios equipos con rol contextual
- [x] Nuevo modelo `UserLogro` — junction table explícita (`fecha` + `@@unique([userId, logroId])`)
- [x] Migración Prisma con las nuevas relaciones (`add_multitenancy`, vía reset en dev)
- [x] **Endpoints scoped por equipo**: `routes/equipos.ts` montado en `/equipos/:slug` (`mergeParams` + `router.use(resolveTeam)`). `GET /logros`, `GET /logros/:id` (con doble filtro `id`+`teamId` anti-fuga), `POST /logros` (auth + `teamId` desde `req.team`, no del body). Viejo `routes/logros.ts` borrado. Verificado en vivo: aislamiento entre Halcones/Lobos, 404 cross-tenant, 401 sin token. `apuntes.md` actualizado.
- [ ] Lecturas adicionales por jugador, como `GET /equipos/:slug/jugadores/:id/logros`, cuando una tarea las requiera. El listado de jugadores, ranking y dashboard ya dispone de lecturas reales desde UI-G1.
- [x] Frontend **(a) esqueleto de rutas** — `app/equipos/[slug]/layout.tsx` (layout anidado con nav del equipo, segmento dinámico `[slug]`, `<Link>`) + 13 páginas placeholder de todo el mapa (componente `Placeholder` reutilizable). Borrados `/logros`, `NuevoLogro` y el fetch muerto de la landing. Verificado: 15 rutas responden 200, `/logros` viejo 404. DECISIONES: esqueleto de todas las rutas · empezar limpio · slug manual por URL hasta que haya roles (Phase 7)
- [x] Frontend **(b) pantallas reales** — catálogo, detalle y crear logro cableados a los endpoints scoped. Se implementa en **Phase 6.5** como frontend V1 code-first.
- [x] `apuntes.md`: sección "Prisma — Relaciones y multi-tenancy"

## Phase 6.5 – Frontend V1 (code-first)
> **Nota histórica:** esta fase define la primera UI funcional. El trabajo visual activo posterior ya no es code-first: se gestiona mediante el workstream image-first de [ui-workstream/README.md](ui-workstream/README.md).
>
> **Concepto nuevo:** construir una UI usable directamente desde el contrato de rutas/API, con estados explícitos, responsive y accesibilidad.
>
> El frontend se implementa de forma autónoma y code-first. No depende de Figma ni de un proceso previo de mockups; las decisiones visuales se validan en el navegador junto con el comportamiento real de la aplicación.

- [x] Landing pública: propuesta de valor y acceso a registro/login
- [x] Auth: login, registro, sesión y estados de error/401
- [x] Shell tenant para `/equipos/[slug]`: navegación, identidad del equipo y responsive
- [x] Dashboard básico derivado del catálogo disponible (resumen y accesos; sin ranking ni stats de agregación)
- [x] Catálogo de logros scoped por equipo
- [x] Detalle de logro scoped por equipo
- [x] Crear logro scoped por equipo, conectado al endpoint existente
- [x] Estados explícitos en las pantallas V1: loading, error, empty, 401 y 404
- [x] Responsive mobile-first y navegación usable con teclado
- [x] Accesibilidad básica: landmarks, labels, foco visible, contraste y mensajes asociados a controles
- [x] Ranking desbloqueado por UI-G1 e implementado/aprobado en UI-G5; jugadores dispone de lectura real y pantalla implementada en UI-G6-T02
- [ ] Cierre visual y de navegador de jugadores: UI-G6-T03/T04/T05, actualmente pausado
- [ ] Comunidad: funcionalidad futura de Phase 8.5, fuera de la V1 completada

## Phase 7 – Autorización por Roles
> **Concepto nuevo:** autenticación vs autorización, autorización contextual (rol *dentro de* un equipo), middleware composition, seed scripts

- [x] Roles `SUPER_ADMIN | TEAM_ADMIN | PLAYER` — `isSuperAdmin` global y `TeamMembership.role` contextual por equipo
- [x] Login devuelve las membresías y roles actuales; el JWT conserva solo `userId` para no congelar permisos contextuales
- [x] Middlewares `requireSuperAdmin`, `requireTeamMember` y `requireTeamAdmin`
- [x] Proteger lectura, creación y asignación de logros según membresía/rol y equipo
- [x] Script `prisma/seed.ts` idempotente — super admin, equipos, membresías, logros y asignaciones (`npm run seed:dev`)
- [x] `apuntes.md`: autorización, roles contextuales y seed idempotente

## Phase 7.5 – Auth Hardening
> **Concepto nuevo:** seguridad del navegador, XSS, cookies HttpOnly vs localStorage

- [x] Migrar la entrega del JWT a **cookie HttpOnly** — `localStorage` es accesible desde JS (XSS puede robar el token); una cookie HttpOnly no lo es
- [x] Actualizar `authMiddleware` para leer el JWT desde la cookie en lugar del header `Authorization`
- [x] Añadir `GET /auth/session` y `POST /auth/logout` como contrato servidor de sesión y cierre idempotente.
- [x] Actualizar el frontend para no gestionar el token manualmente (la cookie se envía automáticamente)
- [x] `apuntes.md`: sección "Cookies HttpOnly vs localStorage"
- [x] QA manual en navegador: login, persistencia tras recarga, acceso protegido y logout correctos (2026-09-22).

## Phase 7.6 – Solicitudes y paneles admin
> **Concepto nuevo:** flujos de aprobación (máquina de estados simple), layouts anidados y route groups en Next.js

- [x] Modelo `SolicitudLogro` — PLAYER reclama un logro (PENDIENTE | APROBADA | RECHAZADA)
- [x] Endpoints: crear solicitud (PLAYER), aprobar/rechazar (TEAM_ADMIN), asignación directa (TEAM_ADMIN)
- [x] Página `/equipos/[slug]/solicitudes` — mis solicitudes y su estado (PLAYER)
- [x] Panel `/equipos/[slug]/admin` — solicitudes, asignación directa e invitaciones (TEAM_ADMIN)
- [x] Panel `/admin` — equipos de la plataforma + solicitudes de acceso de nuevos equipos (SUPER_ADMIN)
- [x] Landing pública `/` (publicidad de la idea) + `/solicitar-acceso` (formulario para equipos)
- [x] `apuntes.md`: sección "Solicitudes de logro" y aceptación transaccional

## Phase 7.7 – Propuestas de nuevos logros (parcial: backend y formulario entregados)

Decisión de producto del 2026-09-17. Amplía Phase 7.6: proponer un logro nuevo es distinto de solicitar la obtención de uno existente. UI-G1 y UI-G4 ya entregaron el dominio y el formulario; la fase completa depende aún de UI-G7/UI-G8 y de imágenes en Phase 10.

- [x] Persistencia/API para proponer un logro con nombre, descripción y criterios; equipo y autor conservados desde el envío.
- [x] Estados pendiente, aprobada y rechazada con motivo; aprobar incorpora al catálogo y mantiene la creación directa administrativa.
- [x] Flujo de dominio secuencial: incorporar al catálogo antes de solicitar obtención. No crea solicitud simultánea, concesión ni puntos por proponer.
- [x] Formulario `/equipos/[slug]/logros/nuevo` adaptado al rol en UI-G4: PLAYER propone y TEAM_ADMIN conserva creación directa.
- [x] Aislamiento, permisos, rechazo y aprobaciones concurrentes sin duplicados validados en [UI-G1-T05](ui-workstream/evidence/UI-G1-T05-QA.md); submit real por rol validado en [UI-G4](ui-workstream/evidence/UI-G4/FORM-FLOW-QA.md).
- [x] Referencias inventariadas y conceptos documentados en `apuntes.md`, sección «Proponer, incorporar y obtener — UI-G1-T04».
- [ ] Separar propuestas y solicitudes de obtención en los historiales personales y sus detalles — UI-G7.
- [ ] Dividir administración en resumen y subrutas invitaciones, jugadores, logros, solicitudes y propuestas, incluidos detalles — UI-G8.
- [ ] Completar el recorrido visual de revisión y obtención mediante esos historiales/paneles y su QA.
- [ ] Imagen en propuestas: ampliación de Phase 10 que reutiliza el almacenamiento de Phase 7.10.

## Phase 7.8 – Identidad global y alias contextual

> **Concepto nuevo:** separar los datos propios de la persona de los datos que dependen de su pertenencia a un tenant.

Primer bloque validado localmente y versionado en `c2ca920`; ver apartados 4 y 10 de [BACKEND-GAPS](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). Esto no acredita su despliegue en otros entornos.

- [x] Definir nombre y apellidos globales en `User`; `lastName` admite uno o varios apellidos.
- [x] Capturar nombre y apellidos al registrar una cuenta.
- [x] Mover el nombre visible contextual a `TeamMembership.displayName`, con migración aditiva y transición del antiguo `User.displayName`.
- [x] Resolver lecturas tenant con prioridad alias del equipo → nombre global → fallback estable.
- [ ] Perfil global consultable/editable y formulario correspondiente — issue #27.
- [ ] Edición tenant-scoped del alias y decisión de permisos PLAYER/TEAM_ADMIN — issue #28.
- [ ] Retirar `User.displayName` cuando no queden consumidores ni datos dependientes del campo legado.
- [ ] Avatar general y foto opcional por equipo, validación de imágenes, almacenamiento y reemplazo seguro — issue #23, coordinado con Phase 7.10; prioridad acordada: equipo → general → iniciales.

### Bloque vinculado a 7.8/7.9 — Ciclo de vida del jugador (gap 21)

Plan y criterios: [PLAYER-LIFECYCLE-PLAN.md](PLAYER-LIFECYCLE-PLAN.md). Producto definido, sin implementación ni issue remota creada. Archivar conserva ficha/avatar/resultados y permite recuperación; eliminar exige confirmación, retira datos actuales/avatar y conserva históricos cerrados con último alias e iniciales. Reingreso tras eliminación empieza de nuevo. Cuenta global, otros equipos y logros de catálogo derivados de propuestas permanecen.

- [x] PLAYER-LC-T00 — Consolidar reglas y límites.
- [ ] PLAYER-LC-T01 — Diseñar separación entre acceso, ficha actual e historial; depende del inventario de media T02.01 y precede a su relación avatar/equipo T03.02.
- [ ] PLAYER-LC-T02 — Persistencia compatible y migración coordinada con media.
- [ ] PLAYER-LC-T03 — Salida, archivo y reingreso con permisos/contadores correctos; requisito para completar avatar específico T05.08.
- [ ] PLAYER-LC-T04 — Eliminación explícita y limpieza del avatar con conservación de resultados cerrados; usa media T05.06/T05.08.
- [ ] PLAYER-LC-T05 — Controles y filtros administrativos, al definir nuevas pestañas y coordinar UI-G8.
- [ ] PLAYER-LC-T06 — QA de históricos, reingreso, aislamiento y frontend.
- [ ] PLAYER-LC-T07 — Evidencia y documentación, sin dar por cerradas 7.8/7.9/UI-G8.

Este bloque no obliga a rehacer ranking/temporadas ya entregados. Logros/logos pueden avanzar sin acabarlo; los avatares de equipo necesitan conservación, mientras que la eliminación administrativa completa se entrega por separado.

## Phase 7.9 – Temporadas por equipo

> **Concepto nuevo:** separar la definición reutilizable de un logro del periodo concreto en el que una persona lo obtiene.

**Estado parcial — #11:** backend versionado en `c2ca920`; migración de temporadas aplicada en la base Windows de revisión. La entrega `e50e2e3` de #30/#29 verifica progreso y concesiones por temporada, revelado persistente y aprobación de solicitudes en su temporada original. [Evidencia](issue-30/qa/RESULT.md). Esta cobertura no equivale a completar toda la API de gestión ni el frontend de temporadas.

- [x] Modelar temporadas tenant-scoped con estados `PLANNED`, `ACTIVE` y `CLOSED`; máximo una activa por equipo.
- [x] Configurar cada logro como `PERMANENT` o `SEASONAL`, manteniendo `PERMANENT` como valor compatible.
- [x] Guardar el contexto nullable de temporada en solicitudes y concesiones, sin arrays de IDs.
- [x] Aplicar unicidad distinta para concesiones permanentes y para cada temporada mediante índices parciales.
- [x] Adaptar solicitudes, aprobación y asignación directa al alcance del logro y a la temporada activa.
- [x] Adaptar dashboard, catálogo, jugadores y ranking al contexto actual y exponer ranking histórico por temporada.
- [x] Añadir API tenant-scoped para listar, crear, activar y cerrar temporadas.
- [ ] Diseñar e implementar la administración visual de temporadas en #11: concretar ubicación/navegación, listar y crear temporadas y activar/cerrar mediante los endpoints existentes, con estados y errores reales; coordinar su entrada con UI-G8 sin añadir una ruta todavía.
- [ ] Implementar el selector de históricos y conectar el ranking de la temporada elegida; distinguir periodo activo/cerrado, permanentes y estacionales sin mezclar progresos entre ediciones.
- [ ] Completar QA de #11 para gestión e históricos, incluyendo permisos, transiciones inválidas, una única temporada activa, ausencia de temporada, carga/error/vacío y aislamiento; reutilizar la cobertura de #30/#29 sin declarar probados los casos restantes.
- [x] Aplicar la migración en PostgreSQL local de revisión y verificar integración estacional de #30/#29 (progreso, concesiones, revelado y solicitud histórica); resto de QA de #11 pendiente según apartado anterior.


## Phase 7.10 — Imágenes y almacenamiento

> **Concepto nuevo:** archivos persistentes separados de sus referencias en base de datos, subida validada, permisos de lectura y recuperación.
>
> Ubicación aprobada el 2026-09-24: después de identidad/temporadas y antes de continuar el frontal con imágenes reales. Sustituye el nombre anterior «Phase 10A». Los identificadores `MEDIA-10A-Txx` se conservan como referencias estables de las mismas tareas; no son otra fase pendiente.

Acuerdo del 2026-09-23 para la baja del jugador: ofrecer **Archivar** (sin acceso, conservando ficha/avatar/resultados y recuperación al volver) y **Eliminar del equipo** (confirmación de pérdidas, sin deshacer; retira datos actuales y avatar específico, cancela solicitudes pendientes). Eliminar conserva decisiones resueltas, logros del catálogo surgidos de propuestas y resultados cerrados con último alias e iniciales, sin alterar puntos/puestos históricos. Reingreso tras eliminación empieza de nuevo. Cuenta global y otros equipos intactos. Contrato de producto definido en Architecture; diseño técnico, implementación y pruebas pendientes.

Dependencia funcional detectada al definir media (2026-09-23): salir o perder acceso conserva ficha y datos; reingreso recupera historial salvo eliminación explícita anterior, según las dos acciones acordadas. Trabajo de dominio pendiente y separado de uploads; [BACKEND-GAPS, apartado 21](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md#21-conservación-del-jugador-y-baja-del-equipo). Sin implementación autorizada ni issue remota creada.

Plan operativo reconciliado el 2026-09-24: [MEDIA-PLAN.md](MEDIA-PLAN.md), con [dependencias y subtareas](MEDIA-PLAN.md#5-tareas-ejecutables-y-condiciones-de-cierre) y [matriz de pruebas](MEDIA-PLAN.md#6-pruebas-que-permiten-darlo-por-terminado). Estado: **decisiones de uso locales acordadas; diseño técnico e implementación pendientes**. Esta petición solo define tareas; no autoriza montar servicios ni cambiar código. Se sitúa antes de revisar las pantallas con imágenes reales, sin cerrar A1/A2 ni reanudar G6 automáticamente.

- [x] Preparar decisiones, tareas, dependencias y criterios de prueba — MEDIA-10A-T00
- [x] MEDIA-10A-T01 — Cerrar decisiones de uso locales: tipos/proveedor/permisos, formatos/tamaños/compresión, cola/cancelación/recuperación y conservación. Ubicaciones y backups aplazados explícitamente.
- [ ] MEDIA-10A-T02 — Inventario, componentes/configuración, recursos, cola/temporales y contrato técnico — T02.01–T02.04.
- [ ] MEDIA-10A-T03 — Diseñar API/permisos, referencias, migración compatible y pruebas — T03.01–T03.03; coordinar PLAYER-LC-T01.
- [ ] MEDIA-10A-T04 — Servicio privado y adaptador S3; operaciones y persistencia tras recreación — T04.01/T04.02.
- [ ] MEDIA-10A-T05 — Base común y logros (T05.01–T05.06); logos (T05.07) después del logro completo; avatares (T05.08) después de logos y PLAYER-LC-T03.
- [ ] MEDIA-10A-T06 — Corpus autorizado y carga repetible por etapa — T06.01/T06.02; pesos reales en MEDIA-CAPACITY.
- [ ] MEDIA-10A-T07 — Ubicaciones/excepción visual T07.01 (aplazada); integrar logro T07.02 → logo T07.03 → avatares T07.04.
- [ ] MEDIA-10A-T08 — Puerta del logro completo T08.01 antes de ampliar; consumo T08.02 y regresión conjunta T08.03.
- [ ] MEDIA-10A-T09 — Evidencia/apuntes T09.01 y sincronización de entrega local T09.02; sin declarar despliegue.

Acuerdos vigentes: logros del catálogo, logos (#22), avatar general y opcional por equipo (#23); SeaweedFS inicial y R2 futuro; entrega por backend con caché privada revalidada; PNG/JPEG estáticos hasta 10 MB/24 MP; avatar 256/96, logo 512/128 y logro 1280/640/320 px; JPEG 85, PNG sin paletas y retirada de metadatos. Dos imágenes procesándose y diez esperando globalmente; cancelación conserva anterior, bloqueo por recurso y recuperación de avisos al volver. Sin originales ni historial de sustituidas; limpieza segura. Ver contrato completo en MEDIA-PLAN. Edición de perfil/alias sigue en #27/#28; ubicaciones con las nuevas pestañas y backups al despliegue. Ningún montaje o prueba de media se presenta como realizado.

Relación entre entregas existentes y este plan:

| Seguimiento | Tareas de este plan | Límite |
| --- | --- | --- |
| #23 / Phase 7.10 | T02–T05 base/logros/avatares, T06–T09 | No completar por subir un único archivo |
| #22 logos | T05.07 + T06.02-logos + T07.03 + QA/cierre | Sin directorio público ni permisos adicionales |
| #27/#28 / Phase 7.8 | Coordinar T07.01/T07.04 | Media no implementa edición general de perfil/alias |
| Gap 21 / PLAYER-LC | Diseño T01 y archivo T03 antes de completar avatar específico | Eliminación completa y su UI son entrega separada |
| #11 / Phase 7.9 | PLAYER-LC preserva históricos; QA cruza casos | No declara terminada administración/selector de temporadas |
| UI-A1/A2, G6–G9 | T07.01 define excepción; T08 revisa pantallas afectadas | Sin avance automático de gates ni banners/propuestas |
| Phase 5.5 / despliegue | MEDIA-DEP-T01–T04 | Copias/HTTPS pendientes; piloto local no es producción |
| Phase 11 / pruebas | Reutilizar evidencia T08 | No posponer pruebas críticas de media a la fase general |
| Phase 12 / tiempo real | Recuperación del aviso definida por consulta de estado | No introducir una dependencia obligatoria de WebSockets |

La elección de objetos/blobs sustituye el planteamiento antiguo de almacenamiento en carpeta del backend y `/uploads/` servido directamente por Nginx. Cloudflare R2 queda como destino futuro preferido, con integración S3 portable desde el inicio; SeaweedFS está elegido para la etapa local. No hay despliegue, migración ni contratación actual. La librería de recepción de subidas sigue por elegir. La entrega de imágenes privadas debe preservar autorización y aislamiento. Las rutas finales serán coherentes con el alcance por equipo y el avatar asociado a cada membresía.


## UI Workstream V2 – Visual convergence (ACTIVE)

Registro unificado de pendientes y resoluciones detectados por el frontal: [BACKEND-GAPS.md](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). Distingue capacidades completadas, implementación parcial, datos ausentes y decisiones pendientes. Incluye también contenido, assets y QA; no todo es backend. Registrar una idea no autoriza implementarla ni amplía el alcance visual.

> Workstream de entrega paralelo al itinerario pedagógico. La fuente operativa está en [ui-workstream/README.md](ui-workstream/README.md), con estado reanudable en [ui-workstream/STATUS.md](ui-workstream/STATUS.md).
>
> Las imágenes canónicas ya están inventariadas bajo `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`. Son autoridad visual, mientras que Architecture/Roadmap siguen siendo autoridad funcional.
>
> Astra Low es el perfil por defecto. Por override del usuario del 2026-09-21, el Coordinator realiza las comparaciones visuales directamente, conservando evidencia y criterios de gate; ver STATUS/PLAN.

- [x] **UI-G0 — Reference inventory/manifest**: inventario existente reconciliado y manifest machine-readable apuntando a referencias canónicas
- [x] **UI-G0 — Visual extraction**: tokens, shell y reglas comunes extraídos; gate cerrado
- [x] **UI-G1 — Visual Fixtures + Domain Slice**: seed, lecturas y dominio de propuestas validados; gate cerrado
- [x] **UI-G2 — Shared Shell**: navegación, tokens y componentes comunes; shell aprobado y congelado
- [x] **UI-G3 — Dashboard**: `/equipos/[slug]`; gate cerrado, refinamientos posteriores sujetos a regresión final
- [x] **UI-G4 — Achievements**: catálogo + creación/propuesta por rol; gate y submit real aprobados
- [x] **UI-G5 — Ranking**: `/equipos/[slug]/ranking`; gate cerrado, variantes 401/403/404 pendientes en UI-G9
- [ ] **UI-A1 — Login/registro**: implementados y capturados; gate final UI-A1-T04 en curso
- [ ] **UI-A2 — Mis equipos/unirse/solicitar acceso**: implementados; QA UI-A2-T04 es el foco actual y gate T05 pendiente
- [ ] **UI-G6 — Players**: pantalla implementada (T01/T02 DONE); capturas, QA y gate pendientes, continuación pausada en T03
- [ ] **UI-G7 — Requests / My proposals**: historial personal y detalles respaldados por las referencias vigentes
- [ ] **UI-G8 — Team Admin**: resumen + subrutas acordadas; T05/T06/T07 integran progreso/secretos ya funcionales de #30/#29 y T08 verifica su regresión. Gestión visual de temporadas e históricos permanece en #11. [Alcance](ui-workstream/PLAN.md#ui-g8--team-admin).
- [ ] **UI-G9 — Consistency Pass**: regresión visual, responsive base y gates finales
- [ ] Integrar imágenes reales de logros/logos/avatares mediante Phase 7.10 tras definir controles y excepción visual; hasta entonces mantener placeholders. Banners/fotografía siguen en las ampliaciones futuras de Phase 10.

## Phase 8 – Ranking y Aggregaciones SQL
> **Concepto nuevo:** GROUP BY, SUM, COUNT via Prisma y `$queryRaw`

Capacidad funcional adelantada en UI-G1/G3/G5. Su entrega no acredita haber completado el objetivo pedagógico de practicar agregaciones SQL en base de datos.

- [x] Endpoint `GET /equipos/:slug/ranking` — jugadores del equipo por puntos totales; lectura validada en UI-G1
- [x] Stats del equipo y por logro: totales, más conseguido, más raro y recientes — lecturas de UI-G1
- [x] Frontend de ranking con top 3 y estadísticas — gate UI-G5 cerrado
- [x] Dashboard con logros recientes, top 3 y estadísticas — gate UI-G3 cerrado
- [x] Lecturas y conteos documentados en `apuntes.md`: «Lecturas del equipo y resolución visible — UI-G1-T03» y «Estadísticas agregadas de Mis equipos — issue #10»
- [ ] Profundización de aprendizaje «SQL — Aggregaciones»: GROUP BY/SUM/COUNT y elección de consultas, sin dar por exigida una reimplementación del ranking
- [ ] Regresión final de estados 401/403/404 del ranking — ya asignada a UI-G9, no crear una segunda tarea

## Phase 8.5 – Comunidad de logros
> **Concepto nuevo:** features cross-tenant, copia vs referencia, atribución

- [ ] Publicación de logros: **tabla PLANTILLA separada** (`PlantillaLogro`/`LogroPublicado`) distinta del `Logro`-instancia del equipo — decidido en Phase 6. Lleva `firma` (`@default("anonimo")`, autoría *display* que elige el proponente) + atribución al autor real. El `Logro` del equipo es una COPIA de la plantilla
- [ ] Página `/comunidad` — galería navegable de logros publicados; `/comunidad/[id]` — detalle (qué equipos lo implementaron)
- [ ] Acción "implementar": **copia independiente** al catálogo del equipo, con atribución al autor (la copia es editable y no cambia si el original cambia)
- [ ] Proponer publicar/implementar: PLAYER propone → TEAM_ADMIN aprueba (reutiliza el flujo de Phase 7.6)
- [ ] `apuntes.md`: sección "Comunidad — features cross-tenant"

## Phase 9 – UI Component Library (shadcn/ui)
> **Concepto nuevo:** design systems, Radix UI, componentes accesibles, theming, Server vs Client Components

Plan futuro pendiente de reconciliar con las primitivas compartidas y el catálogo ya entregados en UI-G2/UI-G4. No supone rehacer pantallas aprobadas ni autoriza una migración de librería durante el rediseño actual.

- [ ] Migrar las páginas de lectura (`/equipos/[slug]/logros`, `/equipos/[slug]/logros/[id]`, landing) a **Server Components** — el fetch ocurre en el servidor (mejor SEO y velocidad inicial)
- [ ] Estados de carga y error con `loading.tsx` y `error.tsx` del App Router (Suspense boundaries)
- [ ] Instalar y configurar shadcn/ui en el frontend Next.js
- [ ] Reemplazar Tailwind manual con: Card, Badge, Table, Button, Input, Dialog
- [ ] "Sala de trofeos": grid de cards con iconos grandes, nombre, puntos, cuántos la tienen
- [ ] Toggle dark/light mode con `next-themes`
- [ ] `apuntes.md`: sección "shadcn/ui — Librería de componentes"

## Phase 10 — Ampliaciones de imágenes y otros archivos

El almacenamiento y las imágenes básicas ya tienen su propio bloque anterior: [Phase 7.10](#phase-710--imágenes-y-almacenamiento). Esta fase queda para ampliar usos; no retrasa logros, logos ni avatares.

- [ ] MEDIA-EXT-T01 — Imagen adjunta a propuestas y su ciclo de revisión/incorporación al catálogo, vinculada a Phase 7.7 y apoyada en el almacenamiento de 7.10.
- [ ] Otros tipos de archivos, banners o fotografía decorativa: definir alcance, permisos y ciclo de vida antes de integrar.
- [ ] Documentar en `apuntes.md` los conceptos de cada ampliación efectivamente implementada.

## Preparación de despliegue y evolución del alojamiento — seguimiento separado

Se activa al preparar producción o solicitar migración, sin esperar a terminar las ampliaciones de Phase 10 ni condicionar el piloto local de 7.10.

- [ ] MEDIA-DEP-T01–T04 — Preparar servidor propio, decidir backups, probar restauración conjunta y desplegar. Coordinado con Phase 5.5 y HTTPS; aplazado por el usuario.
- [ ] MEDIA-R2-T01 — Migración a Cloudflare R2 cuando se solicite: copia verificada, coordinación de escrituras y vuelta atrás; sin contratación actual.
- [ ] Reutilizar evidencia de 7.10 y comprobar el entorno de destino; piloto local no equivale a despliegue.

## Phase 11 – Testing
> **Concepto nuevo:** pirámide de tests, unit vs integration, TDD básico

Pendiente como programa general de pruebas automatizadas y gate de publicación. Ya existen validaciones de compilación, lint, fixtures, HTTP y navegador dentro del workstream; esta fase no significa que el proyecto carezca de pruebas.

- [ ] Backend: tests con Vitest + supertest (rutas /logros, /auth, middlewares)
- [ ] Frontend: React Testing Library para componentes clave (ranking, login form)
- [ ] GitHub Actions: los tests corren **antes** del build de imágenes — si fallan, no se publica a GHCR (CI como gate real, no solo como build)
- [ ] `apuntes.md`: sección "Testing — Vitest y Supertest"

## Backlog de producto detectado en el dashboard — sin fase asignada

Registro solicitado el 2026-09-21. No autoriza implementación ni amplía el UI Visual Convergence Workstream. Detalle y estado centralizados en [BACKEND-GAPS.md](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md), apartados 18–20.

- [x] [Logros secretos: visibilidad y desbloqueo por equipo (#29)](https://github.com/JavierLoro/webLogrosApp/issues/29): COMPLETADO LOCALMENTE junto con #30; censura de servidor, revelado histórico global y exclusión del denominador personal. [Entrega y validaciones](issue-30/RESULT.md); cierre remoto pendiente de publicación.
- [x] [Progreso parcial de logros por jugador (#30)](https://github.com/JavierLoro/webLogrosApp/issues/30): COMPLETADO LOCALMENTE; contador entero por persona/temporada, deltas atómicos, objetivo obligatorio y cierre tras concesión manual. UI, 103 HTTP, 7 unitarias y capturas PASS. [Entrega y validaciones](issue-30/RESULT.md). Publicación/cierre remoto conjunto con #29 pendientes.
- [ ] [Etiquetas personalizables de jugadores (#31)](https://github.com/JavierLoro/webLogrosApp/issues/31): catálogo por equipo y concesión por TEAM_ADMIN; definir personalización, visibilidad y retirada. No otorgan permisos ni puntos. Detalle en BACKEND-GAPS.md, apartado 20.

Al resolver cada issue, marcar COMPLETADO su apartado y fila de BACKEND-GAPS.md con PR/commit y validaciones, y actualizar esta lista en el mismo cambio.

## Phase 12 – Real-Time con WebSockets
> **Concepto nuevo:** conexiones persistentes, event-driven, WebSockets vs HTTP polling

- [ ] `socket.io` en el backend adjunto al servidor HTTP de Express
- [ ] `socket.io-client` en el frontend Next.js
- [ ] Evento `logro:assigned` — toast de notificación en tiempo real al ganar un logro (scoped al equipo)
- [ ] Feed en vivo en el dashboard del equipo (últimas 5 asignaciones)
- [ ] `apuntes.md`: sección "WebSockets — Tiempo real con socket.io"
