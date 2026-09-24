# UI Visual Convergence Plan

**Entrega acotada — 2026-09-24:** G7/G8 y pasos 1–7 de 7.7 completados y verificados localmente. Evidencia: [resultado](../phase-7.7/RESULT.md). A1/A2 siguen aplazados, G6 provisional y G9 sin iniciar; el resto del workstream conserva la pausa solicitada. Imágenes de propuestas pendientes de 7.10/Phase 10.

**Pausa vigente fuera de la entrega:** G7/G8 cerrados localmente tras la reanudación autorizada de 7.7. Se conservan G0–G5 cerrados, G6 provisional, A1/A2 aplazados y G9 sin iniciar. Las fases independientes, como 7.10, mantienen su planificación.

## Estado de ejecución — 2026-09-24

Este archivo conserva dependencias y alcance; los estados de tarea están en [TASKS](TASKS.md) y el punto de continuación en [STATUS](STATUS.md). G0–G5 tienen gates cerrados. G6 tiene implementación terminada y cierre provisional por decisión del usuario, con T03–T05 descartadas por ahora y sin gate visual PASS; A1/A2 están aplazados hasta completar la estructura G6–G8 y las nuevas pestañas/controles acordados de perfil, temporadas y media, antes de G9. G7/G8 cerrados localmente en el alcance sin imágenes; G9 no se ha iniciado.

Auth Hardening e identidad se implementaron posteriormente como trabajos separados. Temporadas tiene migración e integración con progreso/secretos; administración visual, selector histórico y QA de #11 completados localmente en [7.9](../phase-7.9/RESULT.md). #30/#29 ya incluyen frontend funcional, cuya integración en el rediseño administrativo se sigue en UI-G8. Las exclusiones de estas funciones en la primera pasada no significan que sigan ausentes del repositorio. Consultar [Roadmap](../Roadmap.md) y [BACKEND-GAPS](evidence/UI-A2/BACKEND-GAPS.md); esta actualización no reanuda fases ni cierra gates.

## Principios

- image-first y reference-first;
- referencias canónicas versionadas en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`;
- datos deterministas para screenshots reproducibles;
- shell común antes de pantallas independientes;
- Override del usuario (2026-09-21): comparación visual directa por Coordinator, sin agente visual_critic. Sustituye las menciones a crítica independiente en este plan; conserva evidencia, iteraciones y criterios de gate.
- Astra Low por defecto;
- backend mínimo: solo lo necesario para representar correctamente las pantallas y los flujos ya acordados;
- sin assets reales en esta primera pasada;
- Architecture/Roadmap mandan sobre funcionalidad cuando una referencia contiene ideas futuras;
- ninguna pantalla se cierra por una puntuación arbitraria de similitud.

## UI-G0 — Reference Pack

Objetivo: convertir el inventario existente en una entrada inequívoca para los agentes.

### UI-G0-T01 — Reference inventory — DONE
El nuevo `main` ya contiene el inventario, las versiones históricas y las referencias vigentes bajo `LockerBoard-marca/ReferenciasPaginas/`.

### UI-G0-T02 — Machine-readable manifest — DONE
`docs/ui-reference/manifest.json` apunta a las referencias canónicas y registra rol, ruta, estado, regiones ignoradas y notas funcionales.

### UI-G0-T03 — Reference gaps for initial scope — DONE
No hace falta generar nuevas referencias de escritorio para empezar el lote inicial. Los estados vacíos, responsive y ajustes menores se resolverán durante implementación. Landing permanece aplazada.

### UI-G0-T04 — Visual extraction — DONE
Extraer y documentar en `docs/ui-workstream/VISUAL_SYSTEM.md`:
- fondo y superficies;
- tipografía y escalas;
- spacing;
- radios y borders;
- ancho de sidebar y gutters;
- estructura de navegación;
- patrones de cards/tablas/headers;
- diferencias PLAYER vs TEAM_ADMIN;
- elementos dibujados que son solo ideas futuras y no deben convertirse en features.

Gate UI-G0:
- manifest reconciliado con los archivos reales;
- sistema visual común documentado;
- ninguna pantalla del lote inicial necesita que el implementador invente su layout base.

## UI-G1 — Visual Fixtures and Domain/Read Slice

Objetivo: disponer de datos reales y deterministas suficientes para renderizar las referencias sin arrays falsos de dominio.

### UI-G1-T01 — Seed audit
Comparar el seed actual con las necesidades reales de las referencias vigentes.

### UI-G1-T02 — Visual seed
Crear un fixture principal Halcones orientado a visual testing. Objetivo aproximado:
- 8–10 jugadores;
- 2 administradores de equipo, manteniendo el superadmin existente;
- 12–16 logros;
- 30–50 asignaciones UserLogro;
- 5–8 solicitudes de obtención con estados variados;
- propuestas de nuevos logros con estados variados;
- invitaciones si las pantallas administrativas las requieren;
- timestamps deterministas.

Añadir `User.displayName` si hace falta para geometría/contenido realista. No añadir todavía avatarUrl, bannerUrl ni storage de imágenes.

### UI-G1-T03 — Minimal read APIs
Implementar solo el read slice necesario para:
- jugadores del equipo;
- ranking;
- actividad reciente;
- estadísticas simples de dashboard;
- datos administrativos necesarios por las vistas acordadas.

No adelantar toda Phase 8 si una consulta más pequeña satisface el frontend.

### UI-G1-T04 — Achievement proposals domain
Phase 7.7 ya es una decisión de producto acordada. Implementar el mínimo de persistencia/API necesario para que las referencias no sean falsas:
- propuesta vinculada a equipo y autor;
- nombre, descripción, criterios y estado;
- pendiente / aprobada / rechazada;
- motivo de rechazo;
- aprobación que incorpora el logro al catálogo sin concederlo al autor;
- separación clara entre proponer y solicitar obtención;
- aislamiento tenant y protección TEAM_ADMIN para revisión.

La imagen del logro se representa con placeholder en esta pasada; uploads reales se planifican en Phase 7.10, con integración tras definir sus controles y excepción visual.

### UI-G1-T05 — Fixture validation
Verificar migraciones, seed idempotente, build backend, aislamiento tenant y flujos de propuestas/solicitudes. Documentar conceptos backend en `docs/apuntes.md` y conservar learning-comments.

Gate UI-G1:
- reset + seed reproduce el mismo estado visual;
- las rutas objetivo no dependen de mocks frontend para datos de dominio;
- ranking/jugadores/stats/propuestas tienen soporte suficiente;
- no se ha adelantado storage real de imágenes.

## UI-G2 — Shared Shell

Objetivo: fijar el lenguaje visual común antes de paralelizar pantallas.

### UI-G2-T01 — Shared tokens
Centralizar colores, superficies, text hierarchy, borders, radii, page gutters, content width y sidebar width.

### UI-G2-T02 — Shell components
Construir TeamShell, TeamNavigation, TeamIdentity, PageHeader, SectionHeader y primitivas compartidas.

### UI-G2-T03 — Role variants
Ajustar navegación y CTAs para PLAYER y TEAM_ADMIN. SUPER_ADMIN conserva la superadministración global y no debe convertir automáticamente la navegación de equipo en una tercera UI distinta salvo que las referencias/arquitectura lo exijan.

### UI-G2-T04 — Media placeholders
Crear placeholders geométricos estables para AchievementMedia y PlayerAvatar. No integrar assets reales.

### UI-G2-T05 — Visual convergence loop
Capturar screenshot determinista, revisar con crítico separado y corregir P0/P1 hasta aprobar.

Gate UI-G2:
- shell aprobado para roles necesarios;
- no hay overflow al viewport objetivo;
- no quedan discrepancias P0 ni P1 materiales;
- tokens y componentes compartidos quedan congelados.

## UI-G3 — Dashboard

Ruta: `/equipos/[slug]`

- analizar `dashboard-desktop-v1.png`;
- separar geometría útil de conceptos futuros como temporadas/retos/progreso no aprobados;
- conectar stats, actividad reciente y mini-ranking reales;
- implementar;
- screenshot → critic → fix.

Gate: sin P0/P1 materiales, datos deterministas y shell intacto.

## UI-G4 — Achievements

Rutas principales:
- `/equipos/[slug]/logros`
- `/equipos/[slug]/logros/nuevo`

- usar catálogo v2 como referencia vigente;
- PLAYER ve “Proponer logro”; TEAM_ADMIN conserva creación directa;
- implementar geometría de media con placeholder;
- no convertir botones erróneos del mockup en permisos reales;
- implementar formulario de propuesta/creación según rol;
- screenshot → critic → fix.

Gate: catálogo y formulario convergen visualmente sin romper semántica de roles.

## UI-G5 — Ranking

Ruta: `/equipos/[slug]/ranking`

- validar contrato del endpoint;
- implementar top 3 y resto del ranking;
- probar nombres/puntos largos con fixture;
- screenshot → critic → fix.

Gate: jerarquía top 3, filas y stats sin P0/P1 materiales.

## UI-G6 — Players

**COMPLETADA PROVISIONALMENTE — 2026-09-24:** el usuario descarta por ahora T03/T04/T05. Se conserva la implementación; las capturas, QA, comparación y correcciones descritas debajo no se ejecutan ni se consideran aprobadas. Excepción al gate G6 para la planificación: no bloquea el avance posterior ni se reabre automáticamente. G9 conserva su regresión general; no equivale a acreditar el gate visual original.

Ruta: `/equipos/[slug]/jugadores`

- conectar miembros reales;
- usar avatar placeholders;
- resolver inconsistencias numéricas del mockup con datos del fixture, no copiándolas;
- screenshot → critic → fix.

Gate: densidad, alineación y responsive base aprobados.

## UI-G7 — Requests and My Proposals

Ruta principal: `/equipos/[slug]/solicitudes`

- usar `solicitudes-desktop-v3.png` como referencia vigente;
- distinguir solicitudes de obtención y propuestas;
- tratar “En revisión” como variante visual de PENDING hasta que exista decisión funcional distinta;
- mostrar “Añadida al catálogo” para propuestas aprobadas;
- usar las referencias de detalle disponibles sin inventar nuevas rutas si Architecture no las define;
- screenshot → critic → fix.

Gate: ambos flujos son distinguibles y coherentes con Phase 7.6/7.7.

## UI-G8 — Team Admin

### Incorporación de capacidades ya entregadas (#30/#29)

Actualización documental solicitada el 2026-09-22. La [entrega local](../issue-30/RESULT.md),
commit `e50e2e3`, ya incluye creación, consulta de progreso y controles administrativos en el
detalle existente. UI-G8 debe integrarlos en su diseño definitivo, preservando el recorrido
actual hasta disponer de un reemplazo funcional. No se crea otra issue para duplicar este trabajo.

- **T05 — Logros/asignación:** crear estándar/progresivo con objetivo entero positivo solo para
  progresivos, alcance permanente/estacional y secreto independiente; editar la propiedad de
  secreto; seleccionar miembro, consultar avance y aplicar deltas positivos/negativos limitados
  a cero–objetivo. Concesión manual solo al alcanzar objetivo y contador cerrado después.
  La edición posterior de tipo/objetivo sigue fuera de V1.
- **T06 — Solicitudes:** mostrar el avance y la elegibilidad disponibles, conservar motivo de
  rechazo y errores reales; una solicitud pendiente no implica progreso. La aprobación usa la
  temporada guardada en la solicitud, aunque ya esté cerrada. Si falta un dato de avance histórico
  en el contrato de lectura, documentarlo antes de conectar la UI; no sustituirlo por el actual.
- **T07 — Propuestas:** al aprobar, integrar los campos tipo/objetivo/alcance/secreto que ya acepta
  el backend. Incorporar al catálogo no concede el logro ni crea avance ficticio.
- **T08 — QA y comparación:** verificar sin empezar, parcial, objetivo alcanzado pendiente de
  concesión y conseguido; rechazo de decimales, doble envío, límites, bloqueo tras concesión,
  ausencia de temporada activa y aislamiento. Secretos no revelados conservan DTO censurado;
  solo la concesión revela a todo el equipo, también en temporadas posteriores. No incorporarlos
  al denominador personal. Incluir regresión de catálogo/detalle/dashboard y desktop/móvil.

La gestión visual de temporadas y selección de históricos siguen en **#11 / Phase 7.9**; su
navegación debe concretarse allí y coordinarse con el shell administrativo cuando corresponda.
No se considera entregada por haber añadido el campo de alcance al formulario de logros.
T05–T08 DONE localmente según [resultado y evidencia](../phase-7.7/RESULT.md); A1/A2 quedan aplazados hasta completar la estructura; G6 está completada provisionalmente por decisión del usuario.

### Rutas y secuencia existentes

Rutas acordadas:
- `/equipos/[slug]/admin`
- `/admin/invitaciones` bajo el slug
- `/admin/jugadores`
- `/admin/logros`
- `/admin/solicitudes`
- `/admin/solicitudes/[id]`
- `/admin/propuestas`
- `/admin/propuestas/[id]`

Usar siempre las rutas completas `/equipos/[slug]/admin/...`.

Orden:
1. shell/breadcrumbs/navegación administrativa;
2. resumen admin;
3. invitaciones;
4. jugadores;
5. logros/asignación;
6. solicitudes + detalle;
7. propuestas + detalle;
8. screenshot/critic/regresión.

Reglas:
- Administración permanece activa en subrutas;
- rechazar exige motivo;
- “Solicitar cambios”, “En revisión”, roles configurables e invitaciones por email son ideas futuras salvo decisión posterior;
- no mezclar propuestas internas con comunidad cross-team.

Gate: navegación coherente, acciones actuales preservadas y subrutas sin P0/P1 materiales.

## UI-A1 — Acceso público (ampliación explícita 2026-09-20)

**Reprogramación 2026-09-24:** QA/cierre pendientes aplazados hasta completar estructura G6–G8 y nuevas pestañas/controles acordados de perfil, temporadas y media. Conservar implementación/evidencia; retomar antes de UI-G9, sin ampliar el alcance funcional.

Petición del usuario: revisar y trasladar login/registro de `_compartidas/acceso-onboarding-desktop-v1.png`, reutilizando el patrón formulario/lateral. No reanuda G6 ni el roadmap global.

Ajuste explícito posterior del usuario (2026-09-20): composición a pantalla completa, no tarjeta encajonada. Eliminar límite exterior centrado, márgenes, borde/radio/sombra del frame. Desktop dividido lateral/formulario; ancho interno del formulario limitado por legibilidad. Móvil apilado full-width y altura natural. Esta decisión prevalece sobre el frame de la lámina; no evaluar su ausencia como discrepancia.

Ajuste móvil confirmado por usuario: por debajo de 768 px ocultar completamente el lateral decorativo y mostrar únicamente el formulario con logo arriba. Desktop conserva su composición 50/50. El Coordinator ejecuta este cambio responsive acotado; la aprobación visual final sigue siendo independiente.

Rutas: `/login`, `/register`. Dependencias: G2 gate (satisfecho), contratos actuales de autenticación. Layout reutilizable aislado, campos y password toggle compartidos; conservar POST, almacenamiento de sesión y redirects actuales. Confirmación de contraseña local permitida; OAuth, recuperación, recordar sesión y textos legales/enlaces inexistentes siguen excluidos. La ampliación explícita del usuario del 2026-09-21 añadió persistencia real de nombre/apellidos y el registro los captura; ver Phase 7.8, #13 y #20. No ejecutar Auth Hardening dentro de A1. Placeholder lateral conserva proporción; no integrar fotografía. Header público puede ocultarse únicamente en estas dos rutas, sin tocar TeamShell/tokens.

Secuencia: análisis → implementación → captura/QA → crítica independiente → corrección/gate. Gate: ambas rutas desktop/móvil, sin overflow, formularios y navegación funcionales, lint/build, cero P0/P1 materiales. Documentar diferencias funcionales y media excluida; G6-T03 queda descartada por la decisión posterior del 2026-09-24. Al cerrar A1, parar; no continuar G6 automáticamente. Incluir estas rutas en futura regresión G9.

## UI-A2 — Resto de acceso/onboarding (petición explícita)

**Reprogramación 2026-09-24:** QA/cierre pendientes aplazados hasta completar estructura G6–G8 y nuevas pestañas/controles acordados de perfil, temporadas y media. Conservar implementación/evidencia; retomar antes de UI-G9, sin ampliar el alcance funcional.

Referencia: paneles 3–6 de `_compartidas/acceso-onboarding-desktop-v1.png`. Rutas existentes `/equipos`, `/unirse`, `/solicitar-acceso` y su estado de éxito, sin nueva ruta de éxito obligatoria. Usuario autorizó continuar este conjunto y posponer cualquier backend faltante: usar APIs actuales, errores locales claros para apartados sin datos/soporte, documentar gaps en `evidence/UI-A2/BACKEND-GAPS.md`. No backend, schema, seed, datos inventados, endpoints especulativos ni éxito simulado en producto.

Reutilizar AuthLayout/AuthFields con fullscreen desktop y móvil solo logo/formulario. Se permite extensión compatible del componente (textarea/posición lateral de éxito) y ocultar Header global en formularios nuevos; `/equipos` usa cabecera propia con marca y acciones de sesión actuales, sin tocar tenant shell ni landing. Mantener preview/join, validación/payload de solicitud y éxito solo tras respuesta satisfactoria. No prometer email si no está soportado. Tipo de equipo/temporada del mockup no se convierten en dominio aprobado automáticamente. El modelo ya distingue nombre/apellidos globales y alias tenant, pero la cabecera global no debe inventar identidad hasta disponer del contrato de lectura seguido en #27; avatar/uploads permanecen en #23.

Secuencia: análisis/contratos frontend → Mis equipos → formularios/éxito → QA/capturas → crítica independiente/correcciones. Gate: desktop/móvil sin P0/P1 materiales, estados loading/error/empty diferenciados, navegación existente, lint/build, backend gaps documentados. El gate A1-T04 permanece pendiente (no se marca aprobado por cambio de foco solicitado); incluir regresión de auth al final por componentes compartidos. No continuar G6-G9 ni roadmap global automáticamente.

## UI-G9 — Consistency Pass

Dependencias de entrada: gates G3–G8 (G6 exceptuado por cierre provisional del usuario) y cierre A1/A2 tras completar la estructura. El aplazamiento de acceso/onboarding no elimina sus pruebas ni gates.

### UI-G9-T01 — Cross-screen audit
Revisar spacing, headers, surfaces, typography, navigation y states entre todas las rutas.

### UI-G9-T02 — Base responsive pass
Validar desktop y un viewport móvil representativo. No exigir una imagen móvil por ruta.

### UI-G9-T03 — Regression capture
Capturar el set completo del fixture determinista.

### UI-G9-T04 — Final gate
Ejecutar lint/build y revisar que las regiones ignoradas sean exclusivamente assets fuera de alcance.

Gate final:
- cero P0;
- cero P1 materiales;
- shell consistente;
- sin overflow/roturas;
- lint/build correctos;
- fixture reproducible;
- solo P2 de bajo impacto.

## Fuera de alcance inicial

Planificación consolidada el 2026-09-24: [Phase 7.10 — tareas de imágenes y almacenamiento](../MEDIA-PLAN.md#5-tareas-ejecutables-y-condiciones-de-cierre). Decisiones de uso locales acordadas; T02–T09 sin ejecutar. T07.01 concretará las ubicaciones aplazadas y la excepción por tipo/pantalla antes de introducir media real; T08.01 exige un logro completo verificado antes de logos y avatares, y T08.03 regresión conjunta. Preparar este plan no cambia las exclusiones siguientes ni reanuda G6–G9.

[PLAYER-LIFECYCLE-PLAN](../PLAYER-LIFECYCLE-PLAN.md) coordina la conservación de avatares con archivo/reingreso y eliminación de jugadores. Su interfaz se define con las nuevas pestañas y UI-G8; no ampliar ese bloque automáticamente ni declarar cerradas sus tareas por media. Mantener #11 y #27/#28 separados. No integrar banners, fotografía o imágenes de propuestas por inferencia.

- landing;
- integración real de imágenes de logros;
- avatares reales;
- banners/fotografía;
- uploads/storage;
- comunidad;
- pestañas secundarias de perfil;
- ampliaciones de superadministración;
- features futuras dibujadas pero no aprobadas.


## Entrega funcional posterior — temporadas 7.9

2026-09-24: `/equipos/[slug]/admin/temporadas`, navegación administrativa y selector en ranking entregados y validados en [7.9](../phase-7.9/RESULT.md). Las menciones anteriores a gestión pendiente describen el alcance original de G8; no reabren esa entrega ni la convergencia global. Limpieza legacy7.8 aplicada, media7.10 pendiente.
