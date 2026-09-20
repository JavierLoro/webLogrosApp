# UI-G3-T01 — Análisis ejecutable del dashboard

Ruta objetivo: `/equipos/[slug]`

Referencia canónica: `dashboard-desktop-v1.png`

Rol canónico de captura: `PLAYER` (`ana@halcones.test`)

Estado: análisis cerrado; no se ha modificado código de pantalla, shell, backend ni control plane.

## 1. Decisión de implementación

El dashboard debe dejar de ser una portada del catálogo y pasar a consumir una única lectura real `GET /api/equipos/:slug/dashboard`.

La composición útil del bitmap se conserva en dos bandas de seis regiones:

1. participación del equipo, estadísticas y actividad reciente;
2. últimos logros añadidos, resumen personal y top 3.

La tercera banda del bitmap no se replica en esta fase. Está formada mayoritariamente por retos, progreso y fotografía decorativa, conceptos excluidos o media fuera de alcance. Los accesos rápidos aislados tampoco justifican introducir una banda de relleno: las mismas rutas ya están disponibles en la navegación congelada.

No se representará `progreso` como si existiera en el dominio. La región dominante reutiliza su geometría para una métrica aprobada y verificable: **participación**, definida como miembros con al menos un logro dividido entre miembros totales.

## 2. Evidencia inspeccionada

- Referencia original inspeccionada a detalle completo: `1536 × 1024`.
- Estado frontend actual inspeccionado mediante:
  - `apps/frontend/src/app/equipos/[slug]/page.tsx` y sus tres componentes de dashboard actuales;
  - captura final del shell `player-shell-iteration-2-1440x900.png`, a `1440 × 900`;
  - tokens y primitivas congeladas de UI-G2.
- Contrato funcional inspeccionado en `Architecture.md`, `Roadmap.md`, `Decisions`, `DATA_REQUIREMENTS.md` y el README del dashboard.
- Contrato real inspeccionado en `GET /equipos/:slug/dashboard`, `readTeam()` y el fixture versionado.

Límite de evidencia: no se arrancó un runtime nuevo para T01. La captura actual usada es la captura final versionada de UI-G2; coincide con el código vigente del cuerpo porque ese cuerpo no cambió durante las iteraciones del shell. T02/T03 deben aportar una captura fresca e inspección de interacción/teclado antes del gate visual.

## 3. Lectura visual de la referencia

Las medidas son aproximaciones tomadas sobre el PNG original. La implementación debe conservar relaciones, no copiar coordenadas absolutas.

### 3.1 Geometría

| Región | Medida observada | Regla ejecutable |
| --- | --- | --- |
| Sidebar | ~171 px | Ya congelado en `10.75rem` / 172 px; no tocar. |
| Cabecera tenant | ~152 px en la referencia | El shell aprobado mide ~129 px; se conserva sin excepción local. |
| Gutter del contenido | ~23 px | Usar `var(--lb-page-gutter)`. |
| Ancho útil | ~1321 px en la imagen de 1536 px | Fluido; usar todo el ancho después de sidebar y gutters, sin contenedor centrado estrecho. |
| Banda 1 | y ~153–479; ~327 px | Grid desktop `38% / 33% / 29%`, gap 12 px, min-height aproximado 20rem. |
| Banda 2 | y ~497–786; ~290 px | Grid desktop `38% / 27% / 35%`, gap 12 px, min-height aproximado 18rem. |
| Banda 3 | y ~797–1001 | No se implementa: su contenido principal está fuera de alcance. |
| Panels | radio ~8–10 px, borde 1 px | `TeamSurface`; padding 16–20 px. |
| Ritmo vertical | 12–18 px | Gap base 12 px entre paneles; padding superior/inferior de página con el gutter. |

### 3.2 Jerarquía tipográfica

- No existe un segundo hero ni un gran título de página debajo de la identidad tenant.
- Debe existir un `h1` accesible visualmente oculto: `Dashboard de {teamName}`.
- Títulos de panel: display condensada, 18–22 px, peso 800, normalmente en mayúsculas.
- Métrica dominante: display condensada, ~72–96 px en desktop, tabular.
- KPI normales: 26–34 px, tabulares.
- Texto de fila y cuerpo: 14–16 px; metadatos: 12–14 px.
- Enlaces de panel: rojo, 12–14 px, con texto explícito; no usar flechas sin nombre accesible.

### 3.3 Superficies y densidad

- Fondo profundo continuo, paneles petróleo con borde tenue y muy poco relieve.
- Paneles compactos; las filas de actividad y ranking no se convierten en tarjetas independientes.
- El rojo se reserva a selección, enlaces y acentos. Verde/ámbar solo expresan datos, no estados inexistentes.
- Sin imágenes nuevas, degradados ornamentales nuevos, glow global ni fondos pictóricos.

## 4. Diferencias actuales que T02 debe eliminar

La pantalla vigente:

- consulta `/logros`, no `/dashboard`;
- muestra un segundo encabezado de gran altura (`Catálogo de Halcones`) que no existe en la referencia;
- dedica todo el contenido a catálogo, puntos posibles y categorías;
- usa una cuadrícula `8/4`, no las bandas `38/33/29` y `38/27/35`;
- no muestra actividad real ni mini-ranking;
- ofrece `Crear logro` y `Crear el primer logro` también a PLAYER, contradiciendo permisos;
- calcula puntos posibles del catálogo, no puntos otorgados del equipo;
- usa skeletons redondeados y alturas que no reflejan las regiones finales.

Los componentes `TeamCatalogPulse` y `TeamQuickStats` también se usan en la landing aplazada. No deben reescribirse para T02: el dashboard debe incorporar componentes específicos nuevos y dejar la landing intacta.

## 5. Contrato tipado requerido

Añadir a `apps/frontend/src/types/api.ts` un contrato explícito equivalente al siguiente. No usar `any` ni inferir permanentemente desde el bitmap.

```ts
type DashboardTotals = {
  members: number
  catalog: number
  awards: number
  points: number
  uniqueEarned: number
  participants: number
}

type DashboardPlayer = {
  id: number
  displayName: string
  role: TeamRole
  joinedAt: string
  puntos: number
  logrosCount: number
  position: number
  ultimoLogro: { id: number; nombre: string; fecha: string } | null
}

type DashboardAchievement = Logro & {
  createdAt: string
  holdersCount: number
}

type DashboardAward = {
  id: number
  fecha: string
  user: { id: number; displayName: string }
  logro: Logro & { createdAt: string }
}

type TeamDashboard = {
  totals: DashboardTotals
  me: Pick<DashboardPlayer, "puntos" | "logrosCount" | "position">
  topPlayers: DashboardPlayer[]
  recentAchievements: DashboardAchievement[]
  recentAwards: DashboardAward[]
  mostEarned: DashboardAchievement | null
  rarestEarned: DashboardAchievement | null
}
```

Si el contrato backend real incluye propiedades adicionales de Prisma, el frontend debe seleccionar solo las que pinta. No se muestran `teamId`, criterios, emails ni propiedades internas en este dashboard.

## 6. Datos reales por región

| Región visual | Campos | Presentación y semántica |
| --- | --- | --- |
| Participación del equipo | `totals.participants`, `totals.members`, `totals.catalog`, `totals.awards`, `totals.uniqueEarned`, `totals.points` | Métrica grande `participants / members` convertida a porcentaje y etiquetada **Participación**, nunca Progreso. Helper: “X de Y miembros han conseguido al menos un logro”. Resumen inferior con catálogo, otorgados, logros distintos conseguidos y puntos acumulados. |
| Estadísticas del equipo | `totals.members`, `totals.awards`, `totals.points`; derivado `awards / members`; `mostEarned`, `rarestEarned` | Cuatro KPI compactos. La media se etiqueta “logros otorgados por miembro”, con una decimal y división segura cuando `members = 0`. Dos destacados inferiores: más conseguido y más raro; el raro siempre tiene `holdersCount > 0` por contrato. |
| Actividad reciente | `recentAwards[0..4]` | Lista semántica de hasta cinco concesiones: `{user.displayName} consiguió {logro.nombre}` y fecha relativa. No mostrar niveles, retos o altas de catálogo dentro del feed. El endpoint devuelve seis para permitir recorte estable; no crear una ruta “ver todo”. |
| Últimos logros añadidos | `recentAchievements[0..2]` | Tres elementos ordenados por `createdAt desc, id desc`, con `AchievementMedia`, nombre, descripción breve, categoría, puntos y fecha. `holdersCount = 0` es válido y no implica error. Enlace aprobado `Ver todos` → `/logros`. |
| Resumen personal | `me.position`, `me.puntos`, `me.logrosCount` | Sustituye “Próximo objetivo”. Título “Tu resumen”; tres cifras reales. No hay nivel, objetivo siguiente, secretos ni porcentaje de completado. |
| Top 3 | `topPlayers[0..2]` | `<ol>` con posición, `PlayerAvatar`, nombre, puntos y cantidad de logros. Enlace `Ver ranking` → `/ranking`. No asumir siempre tres filas. |

### 6.1 Fixture Halcones esperado

Valores derivados del seed versionado y del mismo algoritmo que usa `/dashboard`:

- 12 miembros;
- 14 logros en catálogo;
- 40 concesiones;
- 4.280 puntos acumulados;
- 7 logros distintos conseguidos;
- 10 participantes;
- participación: 83% al redondear `10 / 12`;
- Ana: posición 1, 790 puntos y 7 logros;
- top 3: Ana Fernández (790/7), Marcos del Río (700/6), Laura Sánchez (550/5);
- más conseguido: `Primer vuelo`, 10 miembros;
- más raro conseguido: `Racha impecable`, 2 miembros; el empate se resuelve por id ascendente;
- últimos añadidos: `Guía para el siguiente vuelo`, `Organización compartida`, `Una victoria compartida`;
- el feed más reciente contiene concesiones persistidas de Álex Moreno de la Fuente y Carlos Torres.

No hardcodear estos valores en React. Son aserciones de captura contra la respuesta real.

## 7. Componentes y primitivas

### 7.1 Congelados y reutilizados sin editar

- `TeamShell`, `TeamNavigation`, `TeamIdentity`: llegan desde el layout; cero cambios.
- `TeamSurface`: raíz de cada panel.
- `SectionHeader`: títulos y enlaces de panel.
- `AchievementMedia`: variante `landscape` en los tres últimos logros.
- `PlayerAvatar`: tamaño `table` en actividad/top 3.
- `MaterialIcon`: iconografía existente cuando aporte significado.

### 7.2 Congelados que no deben forzarse

- `PageHeader`: no se usa visualmente porque crearía una segunda cabecera ausente en la referencia. Se aporta `h1.sr-only`.
- `KpiStrip/KpiItem`: su composición lineal no coincide con el grid 2×2 de estadísticas; no modificar la primitiva para resolver esta pantalla.
- `TeamToolbar` y `TeamStatus`: no corresponden a esta vista.

### 7.3 Estructura local propuesta

- `apps/frontend/src/app/equipos/[slug]/page.tsx`
  - fetch único, estados y composición de bandas;
  - consume `useTeamContext()` para el nombre accesible, sin otra petición de contexto.
- `apps/frontend/src/app/components/dashboard/TeamDashboardPanels.tsx`
  - `TeamParticipationPanel`;
  - `TeamStatsPanel`;
  - `RecentAwardsPanel`;
  - `RecentAchievementsPanel`;
  - `PersonalSummaryPanel`;
  - `TopPlayersPanel`.
- `apps/frontend/src/types/api.ts`
  - contrato `TeamDashboard` y tipos auxiliares.

Mantener componentes locales de presentación puros. El dominio llega como props; no crear seis hooks ni seis llamadas de red.

## 8. Estados

### Loading

- Un solo skeleton con las mismas dos bandas y proporciones finales.
- Alturas reservadas equivalentes a los paneles poblados para evitar layout shift.
- `role="status"`, texto `sr-only` y `aria-live="polite"`.
- No reutilizar cuatro bloques genéricos `8/4` ni radios de 24 px.

### Error

- Una superficie visible al inicio del contenido con mensaje y `Reintentar`.
- No mezclar datos parciales antiguos con error: la lectura es atómica.
- 401: “Tu sesión ha caducado” + enlace a login.
- 403: “No tienes acceso a este equipo” + enlace a equipos.
- 404: “No encontramos este equipo”; normalmente lo resolverá antes el `TeamShell`, pero el componente debe ser seguro.
- Resto: mensaje de conexión + retry.

### Empty/zero

No existe un “equipo completamente vacío” mientras el usuario sea miembro. Se resuelve por región:

- `catalog = 0`: panel de últimos añadidos con “Aún no hay logros en el catálogo”; PLAYER no recibe CTA de creación.
- `recentAwards = []`: actividad con “Todavía no se han concedido logros”.
- `mostEarned/rarestEarned = null`: destacado “Sin datos todavía”.
- `topPlayers` con 1–2 miembros: renderizar solo las filas existentes, sin placeholders ficticios.
- `members = 0`: división segura a 0, aunque la autorización normal hace este estado inalcanzable.

Los paneles vacíos conservan altura y geometría; no desaparecen y no desplazan el grid.

## 9. Responsive base inferido

No existe referencia móvil; estas reglas son inferencias, no autoridad visual adicional.

- `>= 1280 px`: dos bandas exactas `38/33/29` y `38/27/35`.
- `768–1279 px`: dos columnas. Participación/estadísticas comparten fila; actividad ocupa ancho completo. Últimos añadidos ocupa ancho completo; resumen personal y top 3 comparten fila cuando quepan.
- `< 768 px`: una columna en orden de lectura: participación, estadísticas, actividad, últimos añadidos, resumen personal, top 3.
- Las tres cards de últimos añadidos bajan progresivamente de tres a una columna.
- Actividad y ranking usan listas, no tablas, por lo que no necesitan overflow horizontal.
- Nombres largos usan `min-w-0` y truncado solo en la línea secundaria; el nombre accesible completo permanece en el contenido/atributo adecuado.
- Enlaces y controles conservan objetivo mínimo de 44 px en móvil.
- Cero overflow global a 320, 768, 1024 y 1440 px.

## 10. Regiones ignoradas y placeholders

| Región de referencia | Tratamiento |
| --- | --- |
| Avatares de sesión y ranking | `PlayerAvatar`; se evalúan tamaño/alineación, no contenido pictórico. |
| Imágenes de logros | `AchievementMedia`; se evalúan 16:9, borde y alineación. |
| Banner tenant | Ya sustituido por superficie CSS del shell congelado. |
| Brush, fotografía deportiva y banner inferior | No cargar ni generar assets. El banner inferior pertenece a la tercera banda excluida. |
| Iconos ilustrativos de logros | Usar placeholder/iconografía existente, nunca URLs o emoji como fuente visual nueva del dashboard. |

Las únicas regiones ignoradas por el crítico deben ser el interior pictórico de media/avatar y la decoración ausente; geometría, contraste, ratio y alineación sí forman parte del gate.

## 11. Conceptos dibujados pero excluidos

- temporada y selector 2024/25;
- campana/notificaciones;
- progreso general o personal del catálogo;
- logros “en progreso” y secretos;
- niveles;
- retos activos, calendario y cuenta atrás;
- próximo objetivo/Maratonianos;
- rachas, evolución o comparaciones temporales;
- actividad de retos, niveles o comunidad;
- personalización de widgets;
- Comunidad y Ajustes;
- fotografía, banners y media reales;
- CTA de creación directa para PLAYER;
- nueva ruta de actividad por imitar “Ver todo”.

No se renombran estos conceptos para ocultar datos inventados. Se sustituyen únicamente por regiones respaldadas por `/dashboard` o se omiten.

## 12. Variantes PLAYER / TEAM_ADMIN permitidas

- La geometría y el orden de los seis paneles son idénticos.
- El resumen personal cambia con el usuario autenticado; no es una variante de layout.
- El fixture canónico PLAYER usa Ana; una captura TEAM_ADMIN puede mostrar Diego y, por tanto, otras cifras personales.
- La navegación administrativa pertenece al shell congelado y no altera el cuerpo.
- El dashboard no muestra CTA de crear/proponer ni acceso administrativo contextual. Esas acciones pertenecen a G4/G8.
- SUPER_ADMIN no activa una tercera variante; manda la membresía contextual.

## 13. Plan concreto para UI-G3-T02

1. Añadir los tipos `TeamDashboard` y auxiliares.
2. Sustituir la petición `/logros` por una petición cancelable `/dashboard` con retry y limpieza de error al reintentar.
3. Eliminar del dashboard el header de catálogo y los CTAs de creación.
4. Crear las seis regiones puras en `TeamDashboardPanels.tsx` reutilizando solo primitivas congeladas compatibles.
5. Componer las dos bandas con grid proporcional desktop y orden lógico DOM.
6. Añadir formateadores locales de número/fecha:
   - `Intl.NumberFormat("es-ES")` para puntos;
   - `Intl.RelativeTimeFormat("es-ES")` o equivalente estable para feed;
   - captura con reloj congelado `2026-09-20T12:00:00Z`, locale `es-ES`, timezone `Europe/Madrid`.
7. Implementar skeleton geométrico y vacíos por región.
8. Verificar PLAYER y TEAM_ADMIN sin modificar shell.
9. Ejecutar lint, build y checks dirigidos de overflow/semántica antes de entregar a QA.

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Confundir participación con progreso | Etiqueta y helper explícitos; cálculo exclusivamente `participants / members`. |
| Duplicar/alterar la landing | No modificar `TeamCatalogPulse` ni `TeamQuickStats`; crear componentes específicos. |
| Drift del contrato API | Tipo explícito y una única petición; comprobar nulls de `mostEarned/rarestEarned`. |
| Fecha relativa no determinista | QA congela reloj/locale/timezone definidos en `DATA_REQUIREMENTS.md`. |
| “Más raro” muestra un logro no conseguido | Usar solo el campo backend `rarestEarned`, nunca recalcular incluyendo ceros. |
| Nombres largos rompen filas | Grid/flex con `min-w-0`, cifra fija y prueba con `Álex Moreno de la Fuente`. |
| Skeleton produce layout shift | Mismas columnas y min-heights que el estado poblado. |
| El crítico pide recuperar la tercera banda futura | Mantener exclusión funcional; no inventar. Cualquier sustitución adicional vuelve al Coordinator. |
| Cambio local parece requerir tocar tokens/shell | Registrar bloqueo; UI-G2 está congelado. |

## 15. Criterio de captura UI-G3-T03

### Captura canónica

- Ruta: `/equipos/halcones`.
- Usuario: Ana Fernández / PLAYER.
- Viewport: `1440 × 1024` según manifest.
- Reloj: `2026-09-20T12:00:00.000Z`.
- Locale/timezone: `es-ES`, `Europe/Madrid`.
- Seed Halcones reproducido y `/contexto` + `/dashboard` en 200.
- Esperar fuentes, respuesta y layout estable antes de capturar.

### Aserciones previas

- no errores de consola ni respuestas 4xx/5xx;
- no petición `/logros` desde el dashboard;
- `document.documentElement.scrollWidth === window.innerWidth`;
- sidebar 172 px y cabecera tenant ~129 px, sin cambios respecto al shell congelado;
- dos bandas visibles en orden correcto;
- valores Halcones coinciden con la sección 6.1;
- actividad contiene solo concesiones reales;
- Ana encabeza top 3 y su resumen muestra 790/7/posición 1;
- placeholders conservan ratios y no cargan imágenes reales;
- no aparecen Temporada, Reto, Progreso, Nivel, Secreto, Comunidad, Ajustes ni “Crear logro”.

### Capturas/checks adicionales

- smoke visual TEAM_ADMIN a mismo viewport para comprobar geometría idéntica y cifras personales contextuales;
- check móvil representativo a 390 px para overflow/orden, sin exigir convergencia contra imagen inexistente;
- estados loading, error y vacíos comprobados por test dirigido o interceptación, no mediante cambios al seed canónico.

### Gate del crítico

- cero P0/P1 materiales en las dos bandas, gutters, tipografía, densidad y jerarquía;
- shell pixel-estable respecto a UI-G2;
- diferencias con la tercera banda registradas como exclusión funcional, no como región implementada a medias;
- contenido pictórico de placeholders ignorado, pero su geometría sí evaluada.

## 16. Pasos de auditoría y salud

1. **Referencia original:** saludable y suficientemente detallada; mezcla geometría válida con features futuras claramente identificables.
2. **Pantalla actual:** requiere sustitución del cuerpo; shell saludable y congelado, dashboard funcionalmente obsoleto respecto al nuevo read slice.
3. **Contrato `/dashboard`:** saludable para las seis regiones previstas; no necesita backend adicional.
4. **Fixture Halcones:** saludable y determinista para populated state, nombres largos, ceros, empates y orden.
5. **Estados y responsive:** especificados para implementación; todavía no verificados en runtime y quedan como obligación de T02/T03.
