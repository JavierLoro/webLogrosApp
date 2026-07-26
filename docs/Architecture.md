# Architecture

## Concepto de la app

**Plataforma multi-tenant de logros.** El dueño de la plataforma (SUPER_ADMIN) la ofrece a equipos;
cada equipo aceptado recibe su **espacio propio** (`/equipos/[slug]`) con sus jugadores, su catálogo
de logros, su ranking y sus stats. Un visitante sin sesión solo ve la landing publicitaria y cómo
solicitar acceso para su equipo.

### Roles
| Rol | Quién | Qué puede hacer |
|-----|-------|-----------------|
| `SUPER_ADMIN` | Dueño de la plataforma | Crear equipos, aprobar solicitudes de acceso, ver todo |
| `TEAM_ADMIN` | Capitán/admin de un equipo | Gestionar logros y jugadores de SU equipo, aprobar solicitudes de logro y propuestas de comunidad |
| `PLAYER` | Jugador de un equipo | Ver su espacio, solicitar logros, proponer publicar/implementar logros de la comunidad |

### Cómo se gana un logro
1. **Asignación directa**: el TEAM_ADMIN lo asigna a un jugador.
2. **Solicitud + aprobación**: el PLAYER lo reclama ("yo hice esto") y el TEAM_ADMIN aprueba o rechaza.

### Visibilidad entre equipos
Flag `esPublico` por equipo: privado → solo miembros (y SUPER_ADMIN); público → visible en
lectura para cualquier usuario logueado.

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
/equipos/[slug]/jugadores        Lista de jugadores del equipo
/equipos/[slug]/jugadores/[id]   Perfil de jugador (sus logros, puntos)
/equipos/[slug]/solicitudes      PLAYER: mis solicitudes de logro (estado)

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

SUPER ADMIN
/admin                           Equipos de la plataforma, solicitudes de
                                 acceso de nuevos equipos
```

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