# Roadmap

## Ruta de aprendizaje
JS → TS → Express → PostgreSQL → Docker → Prisma → JWT → Nginx → CI/CD → Proxmox → Multi-tenancy (Relaciones DB) → **Frontend V1 code-first** → Roles → Auth Hardening → Solicitudes/Admin → Propuestas → Identidad → Temporadas → **Imágenes y almacenamiento (7.10)** → **Visual convergence (image-first)** → Aggregaciones SQL → Comunidad → shadcn/ui → Ampliaciones de archivos → Testing → **WebSockets** → **5.5: cierre de hardening y despliegue definitivo (backups al final)**

> **Concepto de la app:** plataforma multi-tenant de logros — ver mapa de rutas y roles en [Architecture.md](Architecture.md)

Clasificación pedagógica de todos los pendientes: [qué aporta conceptos nuevos, práctica o cierre](ROADMAP-APRENDIZAJE.md). Implementado y aprendido se evalúan por separado; esta clasificación no cambia los estados ni las pausas.

## Situación actual — conciliada el 2026-10-27

La numeración describe el itinerario de aprendizaje, no una secuencia estricta de entrega. El rediseño ha adelantado trabajo de propuestas, ranking y estadísticas. Las casillas completadas describen su alcance concreto; no implican despliegue en producción ni cierre de toda la fase.

| Área | Estado real | Qué queda |
| --- | --- | --- |
| Base, equipos, roles y administración V1 | Completados en su alcance | Lecturas adicionales por jugador cuando se requieran |
| Despliegue y protección del entorno (5/5.5) | Parcial | Confirmar HTTPS en el despliegue definitivo; copias externas al final del roadmap |
| Seguridad de sesión (7.5) | Completada; QA manual 22/09 | No repetir la migración a cookies |
| Propuestas (7.7) | Dominio, historiales y administración entregados; backend con imagen verificado en 7.10 | Adaptar creación/propuesta y revisión al flujo de borradores e imágenes; QA completo. El formulario anterior es temporalmente incompatible |
| Identidad (7.8) | Nombre/apellidos, alias contextual y edición propia en `/perfil` validados localmente | Avatar en 7.10 |
| Temporadas (7.9) | Gestión, históricos y QA completados localmente; [entrega](phase-7.9/RESULT.md) | Publicación/despliegue y cierre remoto #11; ciclo de vida del jugador separado |
| Rediseño G0–G5 | Gates cerrados | Regresión conjunta y últimos refinamientos en el cierre final |
| Acceso y onboarding A1/A2 | Cierre aplazado hasta completar la estructura | QA y gates después de G8 y de las nuevas pestañas/controles acordados, antes de G9 |
| Jugadores G6 | COMPLETADA PROVISIONALMENTE por decisión del usuario (2026-09-24) | T03–T05 descartadas por ahora; sin QA ni aprobación visual acreditados |
| Solicitudes, administración y revisión G7–G9 | G7/G8 cerrados localmente; G9 pendiente | Regresión global G9 tras estructura y A1/A2 |
| Ranking y estadísticas (8) | Capacidad entregada dentro de G1/G3/G5 | Profundización pedagógica SQL y regresión final pendiente |
| Imágenes y almacenamiento adelantados (7.10) | [Backend completo de logro](media/MEDIA-DRAFTS-PROPOSALS.md) verificado localmente:192 pruebas/27 migraciones aisladas; [corpus y calidad de logros](media/MEDIA-QUALITY-CORPUS.md) PASS:38 casos/71 variantes | Dimensionamiento sostenido, revisión de casos conservados, frontal/QA y etapas de logos/avatares con sus corpus. Fase parcial |
| Conservación, archivo y eliminación de jugadores | Reglas acordadas; bloque propio relacionado con identidad/temporadas | [PLAYER-LC-T01–T07](PLAYER-LIFECYCLE-PLAN.md#3-tareas-y-dependencias); conservación/reingreso antes de completar avatar específico; eliminación/admin no absorbidos por uploads |
| Comunidad, evolución UI, imágenes, testing y tiempo real | Futuro | Fases 8.5–12 y decisiones del backlog |

Publicación del bloque multimedia: rama y PR agrupan las bases S3/cola/runtime/migraciones, borradores/propuestas con imagen y corpus/calidad verificados. La PR es para revisión del alcance backend local;7.10 y el frontal conservan sus pendientes. Abrir o publicar esa rama no aplica migraciones fuera del piloto ni despliega la aplicación.

Fuentes: [STATUS](ui-workstream/STATUS.md), [TASKS](ui-workstream/TASKS.md), [QA de UI-G1](ui-workstream/evidence/UI-G1-T05-QA.md) y [registro de pendientes](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). El commit local `c2ca920` reúne identidad, temporadas y sesiones. La publicación remota y el estado de las issues no se verifican mediante esta conciliación documental.

UI Workstream V2 conserva la pausa fuera de G7/G8, ya entregados por autorización acotada del usuario; A1/A2/G9 conservan su aplazamiento/pausa.

### Orden de los pendientes

| Orden | Entrega pendiente | Condición para avanzar |
| --- | --- | --- |
| 1 | Medir carga sostenida/mixta de media y revisar recursos; revisión de casos conservados pendiente aparte | Corpus/calidad de logros ya verificados. Incluir PNG de alta entropía de6,13MB; frontal conserva pausa. Detalle en Phase 7.10 |
| 2 | Integrar borradores e imágenes de logros/propuestas en el frontal y verificar el recorrido completo | Reanudación explícita del frontal y ubicaciones T07.01; después T07.02 y gate T08.01 |
| 3 | Logos y, después, avatares general/de equipo | Logos tras T08.01; avatares tras logos y conservación/reingreso PLAYER-LC-T01–T03. Eliminación administrativa completa es una entrega separada |
| 4 | Cerrar QA y evidencia de 7.10, completar la estructura pendiente y cerrar A1/A2 antes de G9 | Regresión funcional, de navegador y visual con los controles acordados; G6 conserva su cierre provisional sin gate visual PASS |
| 5 | Continuar el itinerario restante: profundización SQL, comunidad, evolución UI, ampliaciones de archivos, programa general de tests y tiempo real | Respetar los alcances y dependencias de sus fases; ranking y estadísticas ya entregados no se reimplementan por sus casillas pedagógicas |
| Final | Hardening y despliegue definitivo; backups/offsite y restauración conjunta al cierre de esa preparación | Reanudación del despliegue y verificación del servidor. R2 solo cuando se solicite |

El trabajo de diseño PLAYER-LC-T01 puede prepararse sin reabrir pantallas; su implementación mantiene las dependencias de [PLAYER-LIFECYCLE-PLAN](PLAYER-LIFECYCLE-PLAN.md). La pausa del frontal, A1/A2 y G9 sigue vigente. Esta actualización organiza los pendientes; no inicia las tareas ni modifica sus gates.

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
- [x] G6 completada provisionalmente por decisión del usuario (2026-09-24): UI-G6-T03/T04/T05 descartadas por ahora, sin ejecutar QA ni acreditar aprobación visual.
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

## Phase 7.7 – Propuestas de nuevos logros (backend completo local; frontal con imagen y QA pendientes)

Plan original: [historiales, administración, QA e imágenes](PHASE-7.7-PLAN.md). Pasos 1–7 y G7/G8 entregados localmente: [resultado y validación](phase-7.7/RESULT.md). El backend del paso de imágenes está [verificado en 7.10](media/MEDIA-DRAFTS-PROPOSALS.md); su frontal y QA completo siguen pendientes en esa misma fase, sin otra tarea duplicada.

Decisión de producto del 2026-09-17. Amplía Phase 7.6: proponer un logro nuevo es distinto de solicitar la obtención de uno existente. UI-G1 y UI-G4 ya entregaron el dominio y el formulario; UI-G7/UI-G8 se cierran localmente el 2026-09-24. El cierre completo depende de integrar y verificar imágenes en Phase 7.10; no es trabajo de Phase 10.

- [x] Persistencia/API para proponer un logro con nombre, descripción y criterios; equipo y autor conservados desde el envío.
- [x] Estados pendiente, aprobada y rechazada con motivo; aprobar incorpora al catálogo y mantiene la creación directa administrativa.
- [x] Flujo de dominio secuencial: incorporar al catálogo antes de solicitar obtención. No crea solicitud simultánea, concesión ni puntos por proponer.
- [x] Formulario por rol entregado en UI-G4: PLAYER propone y TEAM_ADMIN crea directamente. Entrega histórica: necesita adaptarse ahora al contrato de borradores e imagen de 7.10 para volver a completar ambos envíos.
- [x] Aislamiento, permisos, rechazo y aprobaciones concurrentes sin duplicados validados en [UI-G1-T05](ui-workstream/evidence/UI-G1-T05-QA.md); submit real por rol validado en [UI-G4](ui-workstream/evidence/UI-G4/FORM-FLOW-QA.md).
- [x] Referencias inventariadas y conceptos documentados en `apuntes.md`, sección «Proponer, incorporar y obtener — UI-G1-T04».
- [x] Separar propuestas y solicitudes de obtención en los historiales personales y sus detalles — UI-G7.
- [x] Dividir administración en resumen y subrutas invitaciones, jugadores, logros, solicitudes y propuestas, incluidos detalles — UI-G8.
- [x] Completar el recorrido visual de revisión y obtención mediante esos historiales/paneles y su QA.
- [x] Backend de imagen de propuesta: borrador propio, imagen READY, envío atómico, subsanación legacy, aprobación sin copia S3 y rechazo con conservación; [verificado localmente](media/MEDIA-DRAFTS-PROPOSALS.md).
- [ ] Frontal y QA de imagen de propuesta: guardar/retomar, subir, enviar, consultar y revisar con el contrato nuevo — MEDIA-EXT-T01 / T07.02 / T08.01 de 7.10.

## Phase 7.8 – Identidad global y alias contextual

> **Concepto nuevo:** separar los datos propios de la persona de los datos que dependen de su pertenencia a un tenant.

Primer bloque validado localmente y versionado en `c2ca920`; ver apartados 4 y 10 de [BACKEND-GAPS](ui-workstream/evidence/UI-A2/BACKEND-GAPS.md). Esto no acredita su despliegue en otros entornos.

- [x] Definir nombre y apellidos globales en `User`; `lastName` admite uno o varios apellidos.
- [x] Capturar nombre y apellidos al registrar una cuenta.
- [x] Mover el nombre visible contextual a `TeamMembership.displayName`, con migración aditiva y transición del antiguo `User.displayName`.
- [x] Resolver lecturas tenant con prioridad alias del equipo → nombre global → fallback estable.
- [x] Perfil global consultable/editable en `/perfil` (nombre/apellidos, correo solo consulta) — issue #27. [Entrega local y QA](phase-7.8/RESULT.md).
- [x] Alias propio por equipo editable en `/perfil`, con permiso propio PLAYER/TEAM_ADMIN; vacío recupera nombre global — issue #28. [Entrega local y QA](phase-7.8/RESULT.md).
- [x] Retirar `User.displayName`: schema/seed actualizados, migración protegida aplicada localmente y conservación comprobada. [Evidencia](phase-7.8/LEGACY-CLEANUP.md).
- [ ] Avatar general y foto opcional por equipo, validación de imágenes, almacenamiento y reemplazo seguro — issue #23, coordinado con Phase 7.10; prioridad acordada: equipo → general → iniciales.

### Bloque vinculado a 7.8/7.9 — Ciclo de vida del jugador (gap 21)

Plan y criterios: [PLAYER-LIFECYCLE-PLAN.md](PLAYER-LIFECYCLE-PLAN.md). Producto definido, sin implementación ni issue remota creada. Archivar conserva ficha/avatar/resultados y propuestas pendientes con imagen, sin acceso mientras no haya membresía activa; eliminar exige confirmación, retira datos actuales/avatar, cancela propuestas pendientes y limpia sus imágenes sin referencias, y conserva históricos cerrados con último alias e iniciales. Reingreso tras eliminación empieza de nuevo. Cuenta global, otros equipos, decisiones resueltas y logros de catálogo derivados de propuestas permanecen.

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

**COMPLETADO LOCALMENTE — #11 (2026-09-24):** gestión administrativa, selector histórico, validación y concurrencia verificadas. [Entrega, pruebas y límites](phase-7.9/RESULT.md). Conserva backend base `c2ca920` e integración #30/#29 `e50e2e3`; no implica publicación/despliegue ni cierre remoto de la issue. Conservación ante bajas de jugadores sigue en PLAYER-LC.

- [x] Modelar temporadas tenant-scoped con estados `PLANNED`, `ACTIVE` y `CLOSED`; máximo una activa por equipo.
- [x] Configurar cada logro como `PERMANENT` o `SEASONAL`, manteniendo `PERMANENT` como valor compatible.
- [x] Guardar el contexto nullable de temporada en solicitudes y concesiones, sin arrays de IDs.
- [x] Aplicar unicidad distinta para concesiones permanentes y para cada temporada mediante índices parciales.
- [x] Adaptar solicitudes, aprobación y asignación directa al alcance del logro y a la temporada activa.
- [x] Adaptar dashboard, catálogo, jugadores y ranking al contexto actual y exponer ranking histórico por temporada.
- [x] Añadir API tenant-scoped para listar, crear, activar y cerrar temporadas.
- [x] Administración visual de temporadas en `/equipos/[slug]/admin/temporadas`: listar/crear y activar/cerrar con confirmación, errores y permisos reales; navegación y acceso rápido administrativos.
- [x] Selector de históricos conectado al ranking de la edición activa/cerrada; Actual sin activa muestra permanentes. Contexto y regla de suma explícitos, sin mezclar ediciones.
- [x] QA de #11: permisos, transiciones inválidas, concurrencia/una activa, sin temporada, carga/error/vacío, aislamiento, históricos y móvil. [HTTP/navegador y límites](phase-7.9/qa/QA.md); cobertura #30/#29 conservada.
- [x] Aplicar la migración en PostgreSQL local de revisión y verificar integración estacional de #30/#29 (progreso, concesiones, revelado y solicitud histórica); QA de gestión/históricos completada después según el apartado anterior.


## Phase 7.10 — Imágenes y almacenamiento

**PARCIAL — backend del recorrido de logro verificado el 2026-10-26 y corpus/calidad de logros el 2026-10-27; frontal pausado.** [Contrato, implementación y evidencia](media/MEDIA-DRAFTS-PROPOSALS.md): 192/192 comprobaciones PASS, build y seed:check correctos, 27 migraciones aplicadas solo en la base aislada. Implementado localmente no equivale a desplegado ni a cerrar T08.01.

**Pendiente de integración:** los formularios actuales de creación/propuesta no completan el envío hasta adaptarse a `{ borradorId, version }` y a la imagen obligatoria. El catálogo anterior sin imagen se conserva; nuevas altas/propuestas/aprobaciones exigen imagen READY disponible en S3.

> **Concepto nuevo:** archivos persistentes separados de sus referencias en base de datos, procesamiento en segundo plano, permisos y recuperación. Los IDs `MEDIA-10A-Txx` pertenecen a esta fase y se conservan para trazabilidad.

### Entregado y verificado

- [x] MEDIA-10A-T00/T01 — Plan y decisiones de uso locales: proveedor, permisos, formatos, variantes, compresión, cuotas, cancelación y conservación. Ubicaciones de edición y backups siguen aplazados.
- [x] T02.01/T02.02 — Inventario, componentes, ensayos y presupuesto provisional. El dimensionamiento definitivo sigue pendiente.
- [x] T04.01/T04.02 — Piloto privado SeaweedFS, adaptador S3 y persistencia tras recrear el servicio conservando su volumen.
- [x] Base backend de catálogo/borradores/propuestas — recepción con sesión y Origin, cola 2+10, Sharp, variantes, S3 privado, lectura autorizada y caché revalidada, recuperación, cancelación y limpieza con diario.
- [x] T05.05, alcance backend — guardar/retomar/descarte manual sin caducidad; máximo tres borradores globales por autor y cinco propuestas pendientes por autor/equipo; versiones y envío/publicación idempotentes. Pérdida de membresía conserva borradores/imágenes y plazas sin acceso hasta reingreso.
- [x] MEDIA-EXT-T01, alcance backend — imagen propia desde borrador, subsanación de propuestas antiguas pendientes, aprobación con traslado de referencia sin copiar S3 y rechazo conservando su imagen exacta.
- [x] Migración aditiva, regresión del backend y documentación de esta entrega. Los registros terminales permiten resolver reintentos y trabajos tardíos; las referencias de los tres modelos protegen la limpieza.
- [x] [Carga sintética local y ajustes de memoria](media/MEDIA-LOAD-TESTING.md): caché Sharp desactivada y objetivo Go 384 MiB aplicados. Se midió carga real; falta acreditar capacidad sostenida y revisar las provisiones.

- [x] T06.01/T06.02-logros y formatos/calidad local deT08.02 — [38 casos y71 variantes verificadas](media/MEDIA-QUALITY-CORPUS.md),7 pruebas de herramienta y11 de compatibilidad Sharp;13 paneles inspeccionados a1×/2×, PNG exacto y JPEG sin avisos. Máximo6,13MB/imagen con variantes. Logos/avatares, carga sostenida y QA de navegador siguen pendientes.

### Pendiente para cerrar la fase

Prefijo de los IDs abreviados: `MEDIA-10A-`. El desglose y los criterios completos permanecen en [MEDIA-PLAN](MEDIA-PLAN.md#5-tareas-ejecutables-y-condiciones-de-cierre).

| Tarea | Pendiente concreto | Dependencia o estado |
| --- | --- | --- |
| T02.03/T02.04 / T04 / T08.02 | Medir carga sostenida/mixta con el corpus validado, incluido PNG de alta entropía; revisar RAM/CPU/disco, provisiones y contrato técnico final; repetir en servidor cuando se retome ese entorno | La medición local previa y el objetivo Go 384 MiB no acreditan estabilización ni una cuota dura. Preparación/despliegue del servidor siguen en MEDIA-DEP |
| T05.06 | Completar revisión administrativa de casos multimedia conservados o de propiedad dudosa | Es distinta de aprobar/rechazar propuestas, ya implementado. Conservar los casos dudosos hasta su resolución |
| T07.01 | Definir ubicaciones de edición y excepción de imágenes reales por pantalla/tipo | APLAZADA hasta reanudación explícita del frontal; mantener placeholders mientras tanto |
| T07.02 / MEDIA-EXT-T01 | Integrar borradores, subida/preview, creación/propuesta y revisión con imagen; adaptar los formularios incompatibles y el Origin de las escrituras. Recuperar avisos por estado real tras navegar o recargar | Corpus funcional T06.02-logros ya PASS; requiere T07.01 y conserva QA/recursos pendientes. Reutilizar el backend verificado |
| T08.01 | Verificar logro completo en navegador: guardar/retomar → imagen → propuesta/publicación → revisión; estados, errores, cuotas, permisos, caché, navegación, responsive y comparación visual | Después de T07.02. **Gate abierto: bloquea logos** |
| T05.07 / T06.02-logos / T07.03 | Implementar, integrar y verificar logos de equipo | Solo después de T08.01 PASS; edición TEAM_ADMIN y lectura autenticada según contrato |
| PLAYER-LC-T01–T03 | Diseñar acceso/ficha/historial y entregar persistencia, conservación, salida/archivo y reingreso | Bloque propio; requisito para completar avatar específico. No incluye automáticamente eliminación administrativa |
| T05.08 / T06.02-avatares / T07.04 | Implementar, integrar y verificar avatar general/específico: recorte, reemplazo y fallback equipo → general → iniciales | Después de logos T07.03 verificado y PLAYER-LC-T03; controles sujetos a T07.01 |
| T03 y partes restantes de T05 | Completar contratos, relaciones tenant, migraciones y regresiones de logos/avatares | Se cierran con cada destino; las tablas de borradores/propuestas ya están entregadas |
| T08.03 / T09.01/T09.02 | Regresión conjunta, evidencia/apuntes finales y sincronización del cierre local | Después de todos los recorridos y su QA. La evidencia del backend actual ya existe y se reutiliza |

T02–T09 no están cerradas en su alcance global; T00/T01 y las subtareas locales identificadas arriba están entregadas. No repetir inventario, montaje S3, cola, recuperación, borradores ni revisión de propuestas como si faltaran por implementar.

### Acuerdos y trabajo separado

Se mantienen PNG/JPEG estáticos hasta 10 MB/24 MP; variantes de logro 1280/640/320, logo 512/128 y avatar 256/96; JPEG 85, PNG sin paletas y retirada de metadatos. Dos imágenes activas y diez esperando globalmente, sin originales ni historial de sustituidas. Los límites y recursos se revisan con evidencia, sin elevarlos para dar una prueba por aprobada.

El ciclo de vida completo del jugador sigue en [PLAYER-LIFECYCLE-PLAN](PLAYER-LIFECYCLE-PLAN.md). Logros y logos pueden avanzar sin terminarlo; el avatar de equipo necesita conservación/reingreso. La eliminación administrativa, sus controles y su QA corresponden a PLAYER-LC-T04–T07 y conservan sus dependencias propias. Temporadas, perfil y alias ya entregados no se reabren por esta integración.

Despliegue y backups siguen aplazados en MEDIA-DEP-T01–T04/Phase 5.5; no bloquean el cierre local del piloto. SeaweedFS se integrará en el Compose de producción al preparar ese despliegue, con volumen/credenciales propios y red privada. R2 es futuro y solo se activa cuando se solicite. Banners, fotografía decorativa y otros archivos permanecen en Phase 10. No se exige WebSockets para recuperar el estado de trabajos.

## UI Workstream V2 – Visual convergence (PAUSADO; G7/G8 ENTREGADOS)

**Entrega acotada — 2026-09-24:** G7/G8 y pasos 1–7 de 7.7 completados y verificados localmente. Evidencia: [resultado](phase-7.7/RESULT.md). A1/A2 siguen aplazados, G6 provisional y G9 sin iniciar; el resto del workstream conserva la pausa solicitada. Imágenes de propuestas en7.10: backend local verificado el 2026-10-26; frontend y QA completos pendientes.

**Pausa vigente fuera de la entrega:** G7/G8 cerrados localmente tras la reanudación autorizada de 7.7. Se conservan G0–G5 cerrados, G6 provisional, A1/A2 aplazados y G9 sin iniciar. Las fases independientes, como 7.10, mantienen su planificación.

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
- [x] **UI-G6 — Players**: COMPLETADA PROVISIONALMENTE por decisión del usuario (2026-09-24). T01/T02 implementadas; T03/T04/T05 descartadas por ahora, sin QA ni gate visual PASS.
- [x] **UI-G7 — Requests / My proposals**: historial personal y detalles respaldados por las referencias vigentes
- [x] **UI-G8 — Team Admin**: resumen + subrutas acordadas; T05/T06/T07 integran progreso/secretos ya funcionales de #30/#29 y T08 verifica su regresión. Gestión visual de temporadas e históricos permanece en #11. [Alcance](ui-workstream/PLAN.md#ui-g8--team-admin).
- [ ] **UI-A1 — Login/registro**: implementados y capturados; gate final UI-A1-T04 aplazado hasta completar la estructura
- [ ] **UI-A2 — Mis equipos/unirse/solicitar acceso**: implementados; QA UI-A2-T04 aplazado hasta completar la estructura y gate T05 pendiente
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

MEDIA-EXT-T01 (imagen de propuestas) trasladada a Phase 7.10 por acuerdo del 2026-09-25; conserva su ID, no se ejecuta como bloque separado de Phase 10.
- [ ] Otros tipos de archivos, banners o fotografía decorativa: definir alcance, permisos y ciclo de vida antes de integrar.
- [ ] Documentar en `apuntes.md` los conceptos de cada ampliación efectivamente implementada.

## Phase 11 – Testing
> **Concepto nuevo:** pirámide de tests, unit vs integration, TDD básico

Pendiente como programa general de pruebas automatizadas y gate de publicación. Ya existen pruebas backend con `node:test`, incluyendo las 192 comprobaciones de media, y validaciones de compilación, lint, fixtures, HTTP y navegador dentro del workstream. Reutilizar esa cobertura al organizar la fase; no exige reescribir las suites existentes para cambiar de herramienta.

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


## Phase 5.5 – Hardening
Trasladada al final por petición del usuario (2026-09-24). Se conservan los elementos ya completados; los pendientes se retoman con el despliegue definitivo. No se desactivan las copias existentes.

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

## Preparación de despliegue y evolución del alojamiento — seguimiento separado

Se sitúa al final del roadmap por decisión del usuario del 2026-09-24. Se activa con el despliegue definitivo; backups y restauración son el último bloque de preparación y verificación de esa entrega. R2 conserva su activación futura independiente.

- [ ] MEDIA-DEP-T01–T04 — Preparar servidor propio, decidir backups, probar restauración conjunta y desplegar. Coordinado con Phase 5.5 y HTTPS; aplazado por el usuario.
- [ ] MEDIA-R2-T01 — Migración a Cloudflare R2 cuando se solicite: copia verificada, coordinación de escrituras y vuelta atrás; sin contratación actual.
- [ ] Reutilizar evidencia de 7.10 y comprobar el entorno de destino; piloto local no equivale a despliegue.

Último trabajo del despliegue definitivo: decidir y configurar backups de PostgreSQL + archivos, copia offsite y prueba de restauración conjunta (MEDIA-DEP-T02/T03); verificar su funcionamiento en el cierre de MEDIA-DEP-T04.
