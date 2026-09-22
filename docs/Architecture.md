# Architecture

## Concepto de la app

**Plataforma multi-tenant de logros.** El dueño de la plataforma (SUPER_ADMIN) la ofrece a equipos;
cada equipo aceptado recibe su **espacio propio** (`/equipos/[slug]`) con sus jugadores, su catálogo
de logros, su ranking y sus stats. Un visitante sin sesión solo ve la landing publicitaria y cómo
solicitar acceso para su equipo.

### Membresías e invitaciones

Un usuario puede pertenecer a varios equipos mediante `TeamMembership`; el rol (`TEAM_ADMIN` o
`PLAYER`) se guarda en la membresía y no en `User`, porque puede variar entre equipos. Los
administradores generan invitaciones con token aleatorio, caducidad y límite de usos. El token
se almacena como hash y se puede consumir desde un enlace (`/unirse?token=...`) o introduciéndolo
manualmente; ambos caminos llaman a la misma operación de unión.

### Identidad global y alias por equipo

`User` conserva la identidad global de la persona: nombre (`firstName`), apellidos (`lastName`),
email y credenciales. `lastName` es un único texto y admite uno o varios apellidos sin imponer un
modelo cultural concreto. `TeamMembership.displayName` conserva el alias opcional dentro de cada
equipo, porque una misma persona puede presentarse de forma distinta en equipos diferentes.

Las lecturas tenant resuelven el nombre visible en este orden: alias de la membresía, nombre y
apellidos globales, y finalmente `Miembro {id}` para datos históricos incompletos. El antiguo
`User.displayName` se mantiene de forma transitoria para migración/compatibilidad, pero deja de ser
la fuente canónica. La edición posterior del perfil global se sigue en la issue #27 y la edición y
permisos del alias en la #28.

La foto de perfil será global y pertenecerá a `User`, pero no se guarda todavía: avatar, uploads y
storage se diseñarán conjuntamente en la issue #23 y Phase 10. Mientras tanto, la interfaz usa
iniciales/placeholders; no acepta URLs arbitrarias ni inventa una ruta de archivo.

### Temporadas y alcance de los logros

Cada `Season` pertenece a un `Team` y recorre el ciclo `PLANNED → ACTIVE → CLOSED`. Solo puede
haber una temporada activa por equipo; PostgreSQL protege esta regla con un índice único parcial.
Activar una temporada cierra la activa anterior dentro de la misma transacción. Una temporada
cerrada conserva sus concesiones y puede consultarse históricamente, pero no puede reactivarse.

`Logro.scope` separa dos comportamientos sin duplicar el catálogo:

- `PERMANENT`: una persona solo puede obtenerlo una vez y su concesión tiene `seasonId = NULL`.
- `SEASONAL`: puede obtenerlo una vez por temporada; solicitarlo o asignarlo exige una temporada
  activa y guarda su identificador tanto en `SolicitudLogro` como en `UserLogro`.

Guardar `seasonId` en la solicitud congela el contexto en el momento de reclamar el logro. Si el
administrador la revisa después de cerrar la temporada, la aprobación sigue perteneciendo a la
edición correcta. El ranking actual suma concesiones permanentes y las de la temporada activa; el
ranking histórico usa la temporada solicitada más las permanentes. Los datos de otras temporadas
no se eliminan ni se mezclan.

Rutas tenant-scoped nuevas:

- `GET /equipos/:slug/temporadas`
- `GET /equipos/:slug/temporadas/:id/ranking`
- `POST /equipos/:slug/admin/temporadas`
- `POST /equipos/:slug/admin/temporadas/:id/activar`
- `POST /equipos/:slug/admin/temporadas/:id/cerrar`

### Roles
| Rol | Quién | Qué puede hacer |
|-----|-------|-----------------|
| `SUPER_ADMIN` | Dueño de la plataforma | Crear equipos, aprobar solicitudes de acceso, ver todo |
| `TEAM_ADMIN` | Capitán/admin de un equipo | Gestionar logros y jugadores de SU equipo, aprobar solicitudes de obtención; previsto: revisar propuestas de nuevos logros y de comunidad |
| `PLAYER` | Jugador de un equipo | Ver su espacio y solicitar logros existentes; previsto: proponer nuevos logros para su equipo y proponer publicar/implementar logros de la comunidad |

### Cómo se gana un logro
1. **Asignación directa**: el TEAM_ADMIN lo asigna a un jugador.
2. **Solicitud + aprobación**: el PLAYER lo reclama ("yo hice esto") y el TEAM_ADMIN aprueba o rechaza.

### Proponer un logro nuevo — acordado, pendiente de implementación (2026-09-17)

Cualquier miembro de un equipo podrá aportar un logro nuevo. Para el jugador, crear significa
**enviar una propuesta**, no publicar directamente en el catálogo. El administrador conserva
la creación directa y revisa las propuestas de su equipo.

1. El miembro introduce nombre, descripción, criterios e imagen y envía la propuesta desde el equipo actual.
2. La propuesta queda vinculada al equipo y a su autor, con estado pendiente. Nunca queda sin equipo ni se publica automáticamente en comunidad.
3. El TEAM_ADMIN aprueba o rechaza indicando el motivo del rechazo. Solo al aprobar se incorpora el logro al catálogo del equipo.
4. Solo después de aprobarse la propuesta e incorporarse el logro al catálogo, el jugador podrá solicitar su obtención desde el detalle. No se solicita al proponer ni se crea una solicitud automática. Aprobar la propuesta no concede el logro ni puntos.
5. Si se rechaza la propuesta, no se incorpora al catálogo ni se activa una solicitud de obtención; el autor puede consultar el motivo.

**Crear/proponer**, **incorporar al catálogo** y **obtener** son acciones distintas. Para un logro
que ya existe se mantiene la solicitud de obtención actual desde su detalle. La publicación o
adopción comunitaria sigue siendo otro flujo (Phase 8.5).

En frontend se prevé adaptar `/equipos/[slug]/logros/nuevo` según el rol, mostrar «Mis propuestas»
y «Mis solicitudes de obtención» en `/equipos/[slug]/solicitudes`, y separar ambas colas de revisión
en las subrutas `/equipos/[slug]/admin/solicitudes` y `/equipos/[slug]/admin/propuestas`. Estas subrutas están acordadas pero pendientes de implementar. Persistencia, endpoints y soporte
de imágenes se definirán al implementar; esta decisión no describe funcionalidad ya disponible.

### Visibilidad entre equipos
Los logros de un equipo son **siempre privados a sus miembros** (y al SUPER_ADMIN). No hay flag
`esPublico` por equipo (decisión Phase 6). La reutilización entre equipos NO se hace abriendo el
equipo, sino **publicando logros concretos** a la comunidad (Phase 8.5): un logro publicado puede
ser *implementado* por otro equipo como copia independiente. Aislamiento entre tenants por defecto.

## Mapa de rutas (frontend)

```
PÚBLICO (sin sesión)
/                                Landing publicitaria de la plataforma
/solicitar-acceso                Formulario: un equipo pide su espacio
/login                           Iniciar sesión

ESPACIO DE EQUIPO (tenant) — /equipos/[teamSlug]/
/equipos/[slug]                  Dashboard del equipo:
                                   · Logros recientes obtenidos (feed)
                                   · Mini-ranking (top 3-5) → enlace a /ranking
                                   · Stats del equipo (widgets)
/equipos/[slug]/ranking          Ranking completo + stats detalladas
/equipos/[slug]/logros           Catálogo de logros del equipo (sala de trofeos)
/equipos/[slug]/logros/[id]      Detalle de un logro (quiénes lo tienen)
/equipos/[slug]/logros/nuevo     Crear (admin); previsto: proponer (cualquier miembro)
/equipos/[slug]/jugadores        Lista de jugadores del equipo
/equipos/[slug]/jugadores/[id]   Perfil de jugador (sus logros, puntos)
/equipos/[slug]/solicitudes      PLAYER: mis solicitudes de logro (estado)
                                 previsto: también mis propuestas de nuevos logros

COMUNIDAD (cross-team, requiere sesión)
/comunidad                       Galería de logros publicados por equipos
                                   · navegar/buscar ideas (cualquier usuario)
                                   · proponer publicar un logro propio
                                     (PLAYER propone → TEAM_ADMIN aprueba)
                                   · proponer implementar uno ajeno → copia
                                     independiente al catálogo, con atribución
/comunidad/[id]                  Detalle de un logro publicado (qué equipos
                                 lo han implementado)

ADMIN DE EQUIPO — TEAM_ADMIN del equipo
/equipos/[slug]/admin            Gestión: logros del equipo, jugadores,
                                 aprobar/rechazar solicitudes de logro
                                 previsto: revisar propuestas de nuevos logros por separado

SUBRUTAS ADMINISTRATIVAS PREVISTAS (pendientes de implementación)
/equipos/[slug]/admin                 Resumen y accesos al resto de áreas
/equipos/[slug]/admin/invitaciones    Crear y gestionar invitaciones
/equipos/[slug]/admin/jugadores       Gestionar miembros y roles
/equipos/[slug]/admin/logros          Gestionar catálogo y asignación directa
/equipos/[slug]/admin/solicitudes     Revisar solicitudes de obtención
/equipos/[slug]/admin/solicitudes/[id] Detalle y resolución de obtención
/equipos/[slug]/admin/propuestas      Revisar nuevos logros propuestos
/equipos/[slug]/admin/propuestas/[id] Detalle y resolución de propuesta

SUPER ADMIN
/admin                           Equipos de la plataforma, solicitudes de
                                 acceso de nuevos equipos
```

### Navegación administrativa prevista

La raíz administrativa pasará a ser un resumen. Solicitudes y propuestas podrán verse como pestañas con URLs propias; filtros y estados permanecerán dentro de cada apartado. Copiar invitación, cambiar rol, confirmar retirada y asignar logro son acciones dentro de una vista, sin rutas adicionales. Mantener Administración activa también en las subrutas y conservar el contexto del equipo. Esta división de páginas frontend no exige que las rutas API cambien de nombre. La autorización se mantiene por equipo y rol; una carpeta frontend no sustituye los controles de acceso.

Las referencias ya siguen este árbol; la aplicación aún conserva el panel único. Las imágenes existentes sirven y los ajustes menores de navegación/texto se harán al implementar.

### Stats del dashboard
- **Totales del equipo**: nº de jugadores, logros otorgados, puntos acumulados
- **Por logro**: más conseguido, más raro (menos jugadores lo tienen), último creado
- Los widgets serán **personalizables por el TEAM_ADMIN** (qué stats mostrar) — previsto, implementación en fase tardía

### Comunidad de logros — semántica de "implementar"
Al implementar un logro ajeno se crea una **copia independiente** en el catálogo del equipo
adoptante, con atribución al equipo autor ("idea de Los Tigres"). La copia es editable
localmente y no cambia si el original cambia. Esto preserva el aislamiento entre tenants.

> **Decisión revisable:** el alta de jugadores la gestionará el TEAM_ADMIN (invitación);
> el `/register` abierto actual evolucionará hacia ese modelo.

## Diagramas

| Diagrama | Ver |
|----------|-----|
| Arquitectura completa (nginx → Next.js / Express → Prisma → PostgreSQL) | [arquitectura.html](tutorial/diagramas/arquitectura.html) |
| Flujo de autenticación JWT (login → token → petición protegida) | [auth-jwt.html](tutorial/diagramas/auth-jwt.html) |
| Pipeline CI/CD (git push → Actions → GHCR → Watchtower → Proxmox) | [despliegue.html](tutorial/diagramas/despliegue.html) |
| Client vs Server Components + flujo /api/* | [flujo-api.html](tutorial/diagramas/flujo-api.html) |
| Modelo de datos actual y evolución multi-tenant (Phase 6+) | [modelo-datos.html](tutorial/diagramas/modelo-datos.html) |

## Overview
- Frontend: Next.js app (public pages + admin pages)
- Backend: Express REST API
- Database: PostgreSQL via Prisma
- Reverse proxy: Nginx

## Routing (default)
- Public site and admin are served by Next.js
- Backend API is exposed at: `/api` (Nginx -> Express)

## Data Flow
1. Browser loads Next.js pages
2. Next.js (client-side) requests data from backend API
3. Backend validates auth (for admin endpoints)
4. Backend reads/writes PostgreSQL via Prisma
5. Backend returns JSON

## Authentication Flow (implementado: Bearer token + localStorage)
1. Usuario hace login con email/password (`POST /auth/login`)
2. Backend valida credenciales (bcryptjs) y devuelve un JWT (expiración 7d)
3. El frontend guarda el JWT en `localStorage`
4. Las peticiones protegidas envían `Authorization: Bearer <token>`; `authMiddleware` lo verifica e inyecta `req.userId`

> **Mejora futura:** migrar a cookie HttpOnly. localStorage es accesible desde JS,
> por lo que un XSS podría robar el token; una cookie HttpOnly no es legible desde JS.
