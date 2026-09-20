# UI Workstream Status

workstream: PAUSED
orchestration: ADAPTIVE_ROUTER_READY
current_phase: UI-G6
current_task: UI-G6-T03
current_iteration: 0
last_completed: UI-G6-T02 — implementación de jugadores y validaciones completadas; parada solicitada por el usuario
next_action: SOLO al reanudar, trabajar en C:\Users\javie\Proyectos\webLogrosApp en Windows; leer LOCAL_WINDOWS.md y ejecutar su preflight. Ejecutar UI-G6-T03 sobre localhost:3000: leer UI-G6-T02-IMPLEMENTATION.md y análisis, capturar PLAYER/TEAM_ADMIN 1440 y PLAYER 390; después crítica independiente. No ejecutar mientras permanezca pausado.

## Decisiones vigentes

- Por petición del usuario, la siguiente continuación se ejecutará en Windows local, no CT112. Ver LOCAL_WINDOWS.md. La preparación del entorno y entrega Git no reanudan las tareas visuales. Las referencias históricas a transferencias/PID de CT112 no son instrucciones actuales.
- El usuario pidió parar al terminar UI-G6-T02. Tarea cerrada; UI-G6-T03 queda READY sin ejecutar. No continuar hasta nueva petición de reanudación. No se apagan los servicios de revisión por esta pausa.
- El usuario usa un único prompt de entrada; la sesión raíz actúa como Coordinator adaptativo.
- El Coordinator selecciona automáticamente frontend_worker, backend_worker, qa_capture o visual_critic según TASKS/PLAN.
- Delegación secuencial por defecto; paralelismo solo para trabajo independiente y permitido por el gate.
- Solo el Coordinator modifica por defecto STATUS/TASKS/PLAN.
- Astra Low es el perfil lógico por defecto cuando el entorno lo ofrezca; los perfiles Codex heredan la configuración del Coordinator en lugar de fijar un model ID.
- Critic != Implementer.
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

- Fixture objetivo: 2 equipos; Halcones con 12 miembros, 14 logros, 40 asignaciones, 8 solicitudes, 6 propuestas y 6 invitaciones.
- `User.displayName`, criterios y fechas de alta de logros ya forman parte del contrato de datos.
- El dominio de propuestas distingue envío, incorporación al catálogo y obtención del logro.
- Ranking, jugadores, dashboard y contexto disponen de lecturas tenant-scoped.
- Solicitudes de obtención y panel admin base incluyen histórico, detalle y motivo de rechazo.
- Las subrutas admin acordadas todavía no existen en `src/app`.
- Las referencias desktop del lote inicial sí están versionadas.
- `detalles-solicitud-logro-v1.png` existe; el inventario anterior tenía texto contradictorio y se corrige en esta PR.
- Assets de marca/surface system fueron reorganizados bajo `LockerBoard-marca/otros/`.

## Bloqueos actuales

El frontend administrativo V1 aún rechaza solicitudes sin enviar `reason`; se adaptará en UI-G8 antes del gate funcional correspondiente. No hay bloqueo para UI-G6. La sesión temporal sirve dashboard, catálogo, formularios y ranking aprobados en `http://100.65.11.85:3000`; sus handles están registrados a continuación.

## Última validación

- Estado vigente: gates UI-G0 a UI-G5 cerrados; UI-G6-T01/T02 DONE y UI-G6-T03 READY. Workstream pausado por petición del usuario. Jugadores implementado con lint/build/checks dirigidos PASS; captura, pruebas de navegador y gate visual UI-G6 pendientes. Evidencia: `evidence/UI-G6/UI-G6-T02-IMPLEMENTATION.md`.
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
