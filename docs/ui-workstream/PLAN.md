# UI Visual Convergence Plan

## Principios

- image-first y reference-first;
- referencias canónicas versionadas en `apps/frontend/LockerBoard-marca/ReferenciasPaginas/`;
- datos deterministas para screenshots reproducibles;
- shell común antes de pantallas independientes;
- Critic != Implementer;
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

### UI-G0-T04 — Visual extraction — READY
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

La imagen del logro se representa con placeholder en esta pasada; uploads reales siguen en Phase 10.

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

## UI-G9 — Consistency Pass

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

- landing;
- integración real de imágenes de logros;
- avatares reales;
- banners/fotografía;
- uploads/storage;
- comunidad;
- pestañas secundarias de perfil;
- ampliaciones de superadministración;
- features futuras dibujadas pero no aprobadas.
