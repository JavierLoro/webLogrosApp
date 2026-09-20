# UI-G6-T01 — Análisis ejecutable de jugadores

Ruta: `/equipos/[slug]/jugadores`

Referencia: `jugadores-desktop-v1.png` (`1672 × 941`)

Estado: análisis cerrado; sin cambios de frontend, backend, shared ni control plane.

## 1. Decisión

Sustituir el placeholder actual por una sola lectura real:

`GET /api/equipos/:slug/jugadores`

La pantalla tendrá:

1. cabecera compacta con cuatro métricas derivadas;
2. grid desktop `40/60`;
3. izquierda: identidad propia y bloque de administradores, ambos de solo lectura;
4. derecha: búsqueda, filtros locales de rol y tabla completa;
5. banner inferior panorámico mediante placeholder CSS.

No se implementan perfiles, presencia, última conexión, actividad/inactividad, edición de roles, retirada de miembros, orden interactivo ni paginación. La ruta `[id]` sigue siendo un placeholder y UI-G6 no debe convertirla en feature ni enlazar filas hacia ella.

## 2. Geometría de referencia

| Región | Medida aproximada | Contrato de T02 |
| --- | --- | --- |
| Contenido | x `199–1650`, ~1451 px | Ancho fluido tras shell, con `var(--lb-page-gutter)`. |
| Columna izquierda | x `199–780`, ~581 px | `minmax(0,40fr)`. |
| Columna derecha | x `799–1650`, ~851 px | `minmax(0,60fr)`. |
| Gap principal | ~18–19 px | `var(--lb-panel-gap)`. |
| Perfil propio | y `241–530`, ~289 px; ~2:1 | Hero local ~2:1, avatar `identity`, sin foto real. |
| Administradores | y `542–749`, ~207 px | Dos filas compactas de lectura. |
| Tabla | y `241–799`, ~558 px | Toolbar integrada y filas de 44–48 px. |
| Banner inferior | x `199–1650`, y `813–925`; ~1451/112 | Placeholder local ~12–13:1, sin texto ni fotografía. |

No repetir cabeceras descriptivas dentro de cada panel. Usar `h2` locales compactos, sin grandes divisores/copy redundante, para conservar la densidad de la referencia.

### Prevención del bug de ancho de G5

- Grid base siempre `grid-cols-[minmax(0,1fr)]`.
- Desktop `xl:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]`.
- Root, columnas, paneles y toolbar con `min-w-0`.
- La tabla conserva overflow horizontal **interno**; nunca `overflow-x-hidden` global.
- Los tamaños tipográficos mediante variables usan `text-[length:var(...)]`.

## 3. Contrato de datos

El endpoint devuelve `DashboardPlayer[]`; no hace falta backend ni un modelo duplicado:

```ts
interface DashboardPlayer {
  id: number
  displayName: string
  role: "TEAM_ADMIN" | "PLAYER"
  joinedAt: string
  puntos: number
  logrosCount: number
  position: number
  ultimoLogro: { id: number; nombre: string; fecha: string } | null
}
```

La identidad propia se resuelve con `useTeamContext().me.id` contra el array. No hardcodear a Ana, Diego ni ningún ID.

### Resumen derivado del array completo

| Métrica | Cálculo |
| --- | --- |
| Miembros | `players.length` |
| Jugadores | `role === "PLAYER"` |
| Administradores | `role === "TEAM_ADMIN"` |
| Logros otorgados | suma de `logrosCount` |

No mostrar “Capitanía”: no es un rol real. Los filtros no cambian estas métricas.

Fixture esperado para captura: 12 miembros, 10 jugadores, 2 administradores y 40 otorgamientos. Son aserciones contra el payload, no literales de React.

## 4. Regiones

### 4.1 Cabecera y resumen

- `PageHeader`: “Jugadores” y copy breve que diga **miembros** al describir la población completa.
- Tira compacta de cuatro métricas reales, preferiblemente en la misma banda visual de entrada.
- Sin botones de invitación, alta o gestión: pertenecen a UI-G8.

### 4.2 Identidad propia

- Panel hero ~2:1 con `PlayerAvatar size="identity"` y textura/superficie CSS local.
- Nombre completo, marcador textual “Tú”, rol contextual, puntos, logros y posición.
- Fecha `joinedAt` como “En el equipo desde …”, con `Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid" })`.
- No botón “Ver perfil”; no foto, banner o asset real.
- Si `me.id` no aparece pese a un contexto autorizado, mostrar estado seguro “No encontramos tu membresía” sin fabricar cifras.

### 4.3 Administradores del equipo

- Filtrar `role === "TEAM_ADMIN"` sobre el mismo payload.
- Dos filas esperadas en Halcones; no asumir el número en el componente.
- Cada fila: avatar de tabla/sesión, nombre, puntos y logros.
- Solo lectura: sin editar rol, retirar, menú, flecha ni enlace a perfil.
- Si no hay administradores, mostrar empty regional explícito sin ocultar el panel.

### 4.4 Toolbar local

- Búsqueda por `displayName`, normalizada con locale español.
- Filtros mutuamente excluyentes: `Todos`, `Jugadores`, `Administradores`.
- `aria-pressed` y objetivo táctil de al menos 40–44 px.
- No sort, toggles, estado online ni filtros de actividad.
- Cero resultados conserva panel y ofrece `Limpiar filtros`.

### 4.5 Tabla

Columnas aprobadas:

| Columna | Datos |
| --- | --- |
| Posición | `position`, ordinal recibido del API |
| Miembro | avatar, `displayName`, `joinedAt`; badge “Tú” si `id === me.id` |
| Rol | Jugador / Administrador |
| Puntos | `puntos`, tabular y unidad `pts` |
| Logros | `logrosCount`, tabular |

La tabla mantiene el orden del endpoint. No recalcular posiciones, ordenar en cliente ni convertir el empate estable en ex aequo. Las 12 filas se muestran sin paginación.

Semántica: `<table>`, caption accesible, headings con `scope`, fila de 44–48 px. El nombre completo permanece en `title`/texto accesible cuando se trunque visualmente.

## 5. Casos límite

- Dos miembros con `0 puntos`, `0 logros` y `ultimoLogro = null` permanecen visibles.
- María/Carmen conservan las posiciones ordinales del API en su empate.
- `Álex Moreno de la Fuente` prueba truncado local y accesibilidad del nombre completo.
- Números se formatean con `Intl.NumberFormat("es-ES")`.
- `players = []`: métricas a cero, sin identidad falsa, tabla empty y filtros seguros.
- Una búsqueda sin coincidencias no se confunde con equipo vacío.
- Fechas inválidas muestran fallback textual, nunca `Invalid Date`.

## 6. Responsive

- `>= 1280 px`: grid exacto `40/60`; tabla a la derecha, identidad/admin a la izquierda; banner full-span abajo.
- `768–1279 px`: una columna; identidad, admins, toolbar/tabla y banner en orden de lectura.
- `< 640 px`: métricas 2×2, identidad compacta, toolbar apilada y tabla con scroll horizontal interno.
- Banner: aproximadamente `4:1` móvil, `8:1` tablet y `12–13:1` desktop para conservar presencia sin quedar ilegible o excesivamente alto.
- Sin overflow global a 390, 768, 1024 y 1440 px.

Orden DOM: cabecera → métricas → identidad propia → administradores → miembros → banner. La colocación desktop no debe alterar este orden accesible.

## 7. Estados

### Loading

- Un skeleton único con cabecera, métricas, grid 40/60, filas y banner.
- Mismas columnas `minmax(0,1fr)` que el estado poblado.
- `role="status"`, `aria-live="polite"`, texto `sr-only`.

### Error

- 401: sesión caducada + login.
- 403: sin acceso + equipos.
- 404: equipo no encontrado + equipos.
- Otros: mensaje de conexión + reintento.
- Petición cancelable; `AbortError` no se presenta.

### Vacíos

- Equipo vacío: resumen a cero y empty principal; no filas/personas ficticias.
- Sin admins: empty regional.
- Usuario propio ausente: aviso local, resto de lista permanece utilizable.
- Filtro vacío: mensaje de cero resultados y limpiar filtros.

## 8. Roles y permisos

- PLAYER y TEAM_ADMIN consumen el mismo endpoint y geometría.
- El rol mostrado procede de cada membresía, no de `isSuperAdmin`.
- El bloque de administradores aparece a ambos roles como información pública del equipo.
- TEAM_ADMIN no recibe acciones de escritura aquí; gestión pertenece a `/admin/jugadores` en UI-G8.
- SUPER_ADMIN no crea tercera variante; manda la membresía contextual.

## 9. Shared y estructura propuesta

Reutilizar sin editar:

- `TeamShell`, `TeamNavigation`, `TeamIdentity`;
- `PageHeader`, `TeamSurface`, `TeamToolbar` si su geometría encaja;
- `PlayerAvatar` en tamaños `identity`, `session` y `table`;
- `MaterialIcon`.

Estructura local:

- `equipos/[slug]/jugadores/page.tsx`: fetch, estados y filtros.
- `components/players/TeamPlayersView.tsx`: resumen, identidad, admins, tabla y banner.
- No cambiar `types/api.ts` salvo alias estrictamente útil; `DashboardPlayer[]` ya es el contrato real.

Si una corrección exige editar shared congelado, detener y elevar al Coordinator.

## 10. Exclusiones

- presencia online, última conexión e inactividad;
- fotos, banners o avatares reales;
- perfiles y navegación a `[id]`;
- alta, invitación, edición de rol o retirada de miembros;
- rol Capitana/capitán separado;
- paginación, “mostrar más”, sort y toggles sin contrato;
- estadísticas copiadas del bitmap;
- tabs de perfil, actividad u otros slices.

El banner inferior se conserva solo como geometría CSS decorativa `aria-hidden`, sin texto ficticio.

## 11. Plan T02

1. Sustituir placeholder por GET cancelable `/jugadores`.
2. Derivar métricas, identidad propia y admins del mismo array/contexto.
3. Crear vista local con roots y columnas `minmax(0,1fr)` desde el primer commit.
4. Implementar búsqueda/filtro local sin alterar el orden del payload.
5. Implementar tabla de cinco columnas y scroll interno móvil.
6. Añadir banner CSS responsive ~4/8/12–13:1.
7. Implementar loading/error/empty/no-results.
8. Validar ceros, empate, nombre largo, rol y ausencia de acciones/perfiles.
9. Ejecutar lint, build y checks dirigidos; entregar a QA/critic.

## 12. Captura y gate

### Captura canónica

- `/equipos/halcones/jugadores`.
- Ana Fernández / PLAYER.
- `1440 × 1024`, `es-ES`, `Europe/Madrid`.
- `/contexto` y una sola GET de pantalla `/jugadores`, ambas 200.

### Aserciones

- shell 172/129 sin cambios;
- grid útil aproximadamente 40/60;
- métricas 12/10/2/40;
- identidad propia coincide con `me.id` y muestra 790 puntos, 7 logros, posición 1 para Ana;
- dos admins reales en bloque de lectura;
- tabla de 12 filas, incluidos dos `0/0`, empate estable y nombre largo accesible;
- filtros locales no generan nuevas peticiones;
- banner desktop ~12–13:1, sin imagen o texto;
- cero enlaces a perfiles y cero controles administrativos;
- cero errores, clipping u overflow global.

Checks adicionales:

- TEAM_ADMIN `1440 × 1024`: misma geometría, identidad propia contextual.
- PLAYER `390 × 844`: métricas 2×2, orden de lectura y scroll solo dentro de tabla.
- loading/error/empty/no-results mediante interceptación, sin mutar seed.

Gate: cero P0/P1 en densidad, alineación 40/60, identidad/admins, tabla, responsive y banner; datos y permisos correctos; shared pixel-estable.
