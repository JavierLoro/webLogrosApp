# UI-G5-T01 — Análisis ejecutable del ranking

Ruta objetivo: `/equipos/[slug]/ranking`

Referencia canónica: `ranking-desktop-v1.png` (`1536 × 1024`)

Rol canónico: `PLAYER` en Halcones

Estado: análisis cerrado; no se ha modificado la pantalla, el backend, el shell, las primitivas compartidas ni el control plane.

## 1. Decisión de implementación

La pantalla debe sustituir el placeholder actual por una única lectura tenant-scoped:

`GET /api/equipos/:slug/ranking`

La implementación conserva del bitmap cuatro relaciones visuales útiles:

1. cabecera de página compacta;
2. composición principal de aproximadamente `61% / 39%`;
3. podio visual `2–1–3`, con el ganador entre un 15% y un 20% más alto;
4. ranking tabular denso seguido de una tira de últimos logros por miembro, con estadísticas reales en el rail derecho.

No se implementan evolución semanal, rachas, mayor progreso mensual ni el rol ilustrativo “Capitana”. El endpoint no contiene series temporales, snapshots ni rachas. Esas regiones se omiten y el rail termina tras las estadísticas reales; no se rellenan con gráficos decorativos, números derivados sin significado o paneles vacíos.

No hace falta backend adicional. El contrato de UI-G1 ya incluye jugadores con cero, empate determinista, último logro y todos los totales necesarios.

## 2. Autoridad y evidencia inspeccionada

- `STATUS.md`, `TASKS.md` y `PLAN.md`: UI-G5-T01 está en curso y el gate exige jerarquía de top 3, filas y estadísticas sin P0/P1.
- `manifest.json`: la referencia vigente es `ranking-desktop-v1.png`, estado poblado, rol PLAYER; solo el interior pictórico de avatares es región ignorada.
- PNG original inspeccionado a resolución completa `1536 × 1024`.
- README funcional del ranking: cobertura visual parcial; móvil y estados no están acreditados por la imagen.
- `VISUAL_SYSTEM.md`: composición `61/39`, podio `2–1–3`, tabla densa y estadísticas reales; evolución y rachas quedan condicionadas a un read slice inexistente.
- `Architecture.md` y `Roadmap.md`: ranking completo y stats tenant-scoped para miembros; roles contextuales y equipos privados.
- `Decisions`: solo existen `PLAYER` y `TEAM_ADMIN` dentro del equipo; no hay rol “Capitana”.
- `DATA_REQUIREMENTS.md` y `UI-G1-T05-QA.md`: contrato, orden, aislamiento, ceros, empate y fixture ya validados.
- `apps/frontend/src/types/api.ts`: `DashboardPlayer` y `DashboardTotals` ya describen las dos piezas reutilizables del payload.
- Pantalla actual: `ranking/page.tsx` es un placeholder sin datos.

No se inspeccionó código backend porque el contrato aprobado y la evidencia HTTP de UI-G1 son suficientes para T01.

## 3. Lectura visual de la referencia

Las coordenadas son aproximadas y describen relaciones, no posiciones absolutas que deban copiarse.

### 3.1 Geometría global

| Región | Medida observada en 1536 px | Regla ejecutable a 1440 px |
| --- | --- | --- |
| Sidebar | x `0–170`, ~171 px | Shell congelado a 172 px; no tocar. |
| Contenido | x `201–1514`, ~1313 px | Usar ancho fluido y `var(--lb-page-gutter)`, sin contenedor centrado estrecho. |
| Cabecera/título | y `96–180`, ~84 px útiles | `PageHeader` existente, sin acción ni breadcrumb redundante; título y descripción breves. |
| Columna izquierda | x `201–995`, ~794 px | A `xl`, `minmax(0,61fr)`. |
| Rail derecho | x `1014–1514`, ~500 px | A `xl`, `minmax(20rem,39fr)`. |
| Gap principal | ~18–19 px | `var(--lb-panel-gap)`; no tocar tokens. |
| Podio | y `183–410`, ~227 px | Altura objetivo `13.5–15rem`; ganador 15–20% más alto que segundo/tercero. |
| Tabla | y `429–812`, ~383 px para 10 filas ilustrativas | Fila real de 44–48 px; con 12 miembros la página puede crecer y hacer scroll natural. |
| Tira inferior izquierda | y `826–988`, ~162 px | Cuatro items compactos; no forzar el documento a 1024 px si el contenido real necesita más altura. |
| Stats | y `179–411`, ~232 px | Panel 3×2 más una línea/medidor de participación si hace falta. |
| Evolución/rachas/progreso | y `425–813` | Omitir por falta de contrato; no reservar un hueco artificial de igual altura. |
| Banner fotográfico | y `826–989` | Conservar su geometría con un placeholder CSS local de ratio ~3:1–5:1; sin fotografía, texto ficticio ni asset nuevo. |

En un viewport de 1440 px, el shell deja aproximadamente 1268 px; tras gutters queda cerca de 1219 px. La división `61/39` produce aproximadamente 734/469 px, suficiente para tabla y grid estadístico.

### 3.2 Podio

- Orden visual desktop: segundo a la izquierda, primero en el centro, tercero a la derecha.
- Orden semántico: `<ol>` con DOM `1, 2, 3`; CSS reposiciona visualmente los tres items. El lector de pantalla no empieza por el segundo.
- El ganador ocupa la columna central, comienza más arriba y tiene una superficie 15–20% más alta.
- Avatar de ganador: `PlayerAvatar size="podium"`; segundo y tercero pueden usar el mismo tamaño con escala/clase local, sin editar la primitiva.
- Placas `1`, `2`, `3`: oro/plata/bronce sobrios, texto siempre presente y contraste suficiente; el color no es la única señal.
- Cada card muestra nombre, puntos y número de logros. No muestra cargo, “Capitana”, racha, nivel ni progreso.
- Si solo existen uno o dos miembros, se renderizan únicamente esos puestos; no hay siluetas ni jugadores ficticios.

### 3.3 Tabla

La tabla ocupa todas las membresías actuales, incluidos `TEAM_ADMIN`; el encabezado y copy deben decir **miembros**, no “jugadores” cuando describan el total de población.

Columnas aprobadas:

| Columna | Campo | Presentación |
| --- | --- | --- |
| Posición | `position` | Número ordinal recibido del API; no recalcular ranking denso. |
| Miembro | `displayName`, `role` | `PlayerAvatar size="table"`, nombre visible y rol secundario “Jugador”/“Administrador”. |
| Puntos | `puntos` | Tabular, alineado a la derecha, unidad `pts`. |
| Logros | `logrosCount` | Tabular, alineado a la derecha. |
| Último logro | `ultimoLogro.nombre`, `ultimoLogro.fecha` | Nombre + fecha secundaria; `null` muestra “Sin logros todavía”. |

Se elimina la columna “Racha actual”. No existe en el contrato. Tampoco se añaden acciones por fila ni enlaces a perfil: la ruta de perfil actual sigue siendo un placeholder y UI-G5 no debe adelantar UI-G6.

La tabla usa `<table>`, `<thead>`, `<tbody>`, `<th scope="col">` y una descripción accesible. No hay paginación ni filtros: el fixture tiene 12 filas y ninguna de esas interacciones aparece aprobada para esta pantalla.

### 3.4 Tira de actividad veraz

El endpoint no devuelve un feed completo. Sí devuelve el último logro de cada miembro. Para conservar la geometría inferior sin falsear el dominio:

1. tomar jugadores con `ultimoLogro !== null`;
2. ordenar por `ultimoLogro.fecha desc` y, en empate, `player.id asc`;
3. mostrar hasta cuatro items;
4. titular la región **Últimos logros por miembro**, no “Toda la actividad”.

Cada item muestra `AchievementMedia variant="square"` en una miniatura compacta casi cuadrada, nombre del logro, nombre completo del miembro y fecha relativa/abreviada. La referencia no usa una media horizontal 2:1 en esta región. La lista representa como máximo una concesión reciente por miembro y no debe presentarse como historial exhaustivo. No hay enlace “Ver toda la actividad” porque no existe una ruta aprobada.

Si ningún miembro tiene logro, la tira conserva su superficie y muestra “Todavía no se han concedido logros”.

### 3.5 Estadísticas reales

El rail usa un único `TeamSurface` con `SectionHeader` y seis celdas compactas, seguido de contexto de participación si se necesita para no sobrecargar una celda.

Mapeo recomendado, fiel a los datos y cercano al 3×2 de la referencia:

1. **Miembros** — `totals.members`.
2. **Logros en catálogo** — `totals.catalog`.
3. **Puntos acumulados** — `totals.points`.
4. **Media de logros otorgados por miembro** — `totals.awards / totals.members`, una decimal y división segura; detalle “N otorgamientos en total”.
5. **Logros distintos conseguidos** — `totals.uniqueEarned`.
6. **Participación** — `totals.participants / totals.members`, porcentaje entero; detalle “X de Y miembros”.

La media siempre incluye unidad y significado. Nunca se muestra un `3,3` o `4,6` aislado. Participación es miembros con al menos un logro dividido entre miembros; no es progreso del catálogo.

No existe CTA “Ver detalles”: no hay destino adicional acordado y toda la información respaldada ya está en la vista.

## 4. Contrato tipado real

Reutilizar los tipos ya existentes y añadir solo el contenedor específico:

```ts
export interface TeamRanking {
  players: DashboardPlayer[]
  totals: DashboardTotals
}
```

Contrato efectivo:

```ts
interface DashboardPlayer {
  id: number
  displayName: string
  role: "TEAM_ADMIN" | "PLAYER"
  joinedAt: string
  puntos: number
  logrosCount: number
  position: number
  ultimoLogro: {
    id: number
    nombre: string
    fecha: string
  } | null
}

interface DashboardTotals {
  members: number
  catalog: number
  awards: number
  points: number
  uniqueEarned: number
  participants: number
}
```

### 4.1 Invariantes

- `players` ya llega ordenado por puntos desc, cantidad de logros desc y `userId` asc.
- `position` es ordinal y estable. Aunque dos miembros empaten a puntos, no se recalcula una posición compartida en React.
- La población son las membresías del tenant actual, incluidos administradores contextuales.
- Puntos y logros se agregan únicamente dentro del equipo de la URL.
- Un miembro con cero sigue apareciendo con `puntos = 0`, `logrosCount = 0` y `ultimoLogro = null`.
- `totals.participants <= totals.members`, `totals.uniqueEarned <= totals.catalog`; la UI no corrige silenciosamente una respuesta inválida.
- El frontend no necesita emails, `teamId`, criterios, imágenes ni datos globales.

## 5. Fixture canónico y casos límite

Las cifras siguientes son aserciones de QA contra el endpoint, no literales que deban escribirse en componentes:

- 12 miembros, incluidos 10 PLAYER y 2 TEAM_ADMIN;
- 14 logros de catálogo;
- 40 otorgamientos;
- 4.280 puntos acumulados;
- 7 logros distintos conseguidos;
- 10 participantes, participación redondeada al 83%;
- media de otorgamientos: `40 / 12 = 3,3` logros otorgados por miembro;
- top 3: Ana Fernández `790/7`, Marcos del Río `700/6`, Laura Sánchez `550/5`;
- dos miembros tienen cero logros;
- María/Carmen ejercitan un empate cuyo orden estable ya fue validado por UI-G1.

### 5.1 Empates

- Mostrar exactamente `player.position`.
- No asignar ex aequo, no saltar ni densificar posiciones en cliente.
- La tabla debe permitir dos puntuaciones iguales sin hacer parecer que el orden es aleatorio.
- No explicar el `userId` de desempate en la interfaz; es una regla técnica estable, no contenido de producto.

### 5.2 Ceros

- `0 pts` y `0 logros` son valores, no estados loading.
- `ultimoLogro: null` muestra texto explícito y no una celda vacía.
- Los miembros con cero no se excluyen del podio si el equipo entero está a cero: prevalece el orden recibido.
- Con `members = 0`, media y participación son `0`; aunque la autorización normal vuelve este caso inalcanzable, no se divide entre cero.

### 5.3 Nombres y números largos

- Probar `Álex Moreno de la Fuente` en tabla y tira.
- Nombre completo disponible en texto accesible y `title` cuando el layout visual necesite truncado.
- `min-w-0` en celdas flex; cifras y unidades no encogen.
- Formatear con `Intl.NumberFormat("es-ES")`; no fijar anchuras que fallen con cinco o más dígitos.

## 6. Componentes y límites de escritura para T02

### Reutilizar sin editar

- `TeamShell`, `TeamNavigation`, `TeamIdentity` desde el layout.
- `PageHeader` para “Ranking del equipo” y “La constancia también puntúa.”; sin introducir una segunda identidad tenant.
- `TeamSurface` y `SectionHeader`.
- `PlayerAvatar` en tamaños `table` y `podium`.
- `AchievementMedia variant="square"` para las miniaturas compactas de la tira.
- `MaterialIcon` solo cuando aporta significado.

### Estructura local propuesta

- `apps/frontend/src/app/equipos/[slug]/ranking/page.tsx`
  - petición cancelable única, estados, composición principal;
  - consumo de `useTeamContext()` solo para contexto existente, sin segunda petición.
- `apps/frontend/src/app/components/ranking/TeamRankingView.tsx`
  - `RankingPodium`;
  - `RankingTable`;
  - `MemberLatestAchievements`;
  - `RankingStats`.
- `apps/frontend/src/types/api.ts`
  - solo `TeamRanking`; reutilizar `DashboardPlayer` y `DashboardTotals`.

No editar tokens, shell, navegación, identidad ni primitivas compartidas. Si una diferencia visual exige cambiar una primitiva congelada, T02 debe devolver bloqueo al Coordinator.

## 7. Estados

### Loading

- Un solo skeleton que reserva `PageHeader`, grid `61/39`, podio, panel de stats, cabecera de tabla y filas.
- `role="status"`, `aria-live="polite"` y copy `sr-only`.
- No mostrar un spinner solitario ni reutilizar el placeholder de fase.

### Error

- Lectura atómica: no mezclar ranking anterior con un error nuevo.
- 401: “Tu sesión ha caducado” + enlace a `/login`.
- 403: “No tienes acceso a este equipo” + enlace a `/equipos`.
- 404: “No encontramos este equipo” + enlace a `/equipos`.
- Resto: “No pudimos cargar el ranking” + botón `Reintentar`.
- `AbortError` al desmontar no se presenta como fallo.

### Empty/zero

- `players.length === 0`: no dibujar podio ni filas falsas; mostrar superficie “Todavía no hay miembros en el ranking” y stats seguras a cero.
- `players.length` 1–2: podio parcial, sin huecos simulados.
- `players.length >= 3`: podio con los tres primeros; la tabla conserva todos los miembros, incluido top 3, como en la referencia.
- Actividad sin `ultimoLogro`: empty regional, sin eliminar la superficie.
- Totales cero se muestran como cero, no como guion.

## 8. Responsive y accesibilidad

No hay referencia móvil; estas reglas son inferencia documentada:

- `>= 1280 px`: grid principal exacto `61/39`; rail alineado arriba.
- `768–1279 px`: una columna; stats después del podio y antes de la tabla para mantener contexto sin comprimir columnas.
- `< 640 px`: podio en orden visual/DOM `1, 2, 3` como filas compactas; no mantener tres cards ilegibles.
- `>= 640 px`: podio visual `2–1–3` mediante `grid-template-areas`/colocación, sin alterar DOM.
- Tabla con scroll horizontal **interno** y ancho mínimo aproximado de 42–46 rem; nunca overflow global.
- En móvil, la tira baja de cuatro a una columna; en tablet usa dos.
- Touch targets de controles de error/retry de al menos 44 px.
- Un solo `h1`; cada panel usa `h2`; cabeceras de tabla son semánticas.
- Placeholders decorativos mantienen `aria-hidden`; nombre del miembro/logro vive fuera del placeholder.
- Colores de podio siempre acompañados por posición textual.
- Cero overflow global en 390, 768, 1024 y 1440 px.

## 9. Variantes por rol

- PLAYER y TEAM_ADMIN comparten idéntica geometría, endpoint y contenido de ranking.
- TEAM_ADMIN aparece como miembro cuando corresponde; eso no crea controles administrativos en esta pantalla.
- La navegación Administración pertenece al shell congelado.
- SUPER_ADMIN no crea una tercera variante; prevalece la membresía contextual devuelta por `/contexto`.
- No hay CTA de creación, asignación, edición o gestión desde ranking.

## 10. Regiones ignoradas y exclusiones

| Concepto de la referencia | Tratamiento |
| --- | --- |
| Fotos de jugadores | `PlayerAvatar`; se evalúa geometría 1:1, no contenido pictórico. |
| Miniaturas de logros | `AchievementMedia`; se evalúa ratio/alineación, no arte. |
| Banner tenant y fotografía inferior | Shell existente y placeholder CSS local inferior de ratio ~3:1–5:1; no asset real ni texto inventado. |
| Temporada 2024/25 | Excluida; no hay temporadas aprobadas. |
| Evolución de 8 semanas | Excluida; no hay snapshots temporales. |
| Racha actual / racha más larga | Excluida; no hay contrato de rachas. |
| Mayor progreso mensual | Excluido; no hay comparación mensual. |
| “Capitana” | Excluida; los roles reales son PLAYER/TEAM_ADMIN. |
| Comunidad/Ajustes del sidebar ilustrado | No modificar navegación congelada. |
| “Ver detalles” / “Ver toda la actividad” | Omitidos; no hay destino funcional aprobado. |
| Perfil por fila | No enlazar durante G5; la pantalla de perfil sigue fuera de esta fase. |

## 11. Plan concreto para UI-G5-T02

1. Añadir `TeamRanking` reutilizando tipos existentes.
2. Reemplazar el placeholder por una petición cancelable única a `/api/equipos/:slug/ranking`.
3. Implementar loading/error/retry y vacíos antes de componer el estado poblado.
4. Añadir `PageHeader` local y el grid `61/39` sin tocar el shell.
5. Implementar podio semántico con DOM `1–2–3` y posición visual `2–1–3` en desktop.
6. Implementar tabla completa con las cinco columnas aprobadas y scroll interno responsive.
7. Derivar de forma pura la tira de hasta cuatro últimos logros por miembro.
8. Conservar el banner inferior como placeholder CSS local, decorativo y de ratio ~4:1.
9. Implementar stats reales, media con unidad y participación con división segura.
10. Añadir formateadores locales `es-ES`; las fechas relativas de captura usan reloj QA congelado.
11. Verificar cero/empate/nombre largo mediante checks dirigidos, luego lint/build/diff.

## 12. Riesgos y mitigaciones

| Riesgo | Mitigación |
| --- | --- |
| Recalcular posiciones y romper el empate estable | Renderizar `position` del API; no ordenar ni rankear de nuevo para tabla/podio. |
| Confundir jugadores con población total | Etiquetar “miembros”; incluir TEAM_ADMIN. |
| Inventar actividad completa desde un único último logro | Título explícito “Últimos logros por miembro” y máximo uno por miembro. |
| Presentar la media sin significado | “logros otorgados por miembro”, una decimal, con total de otorgamientos como detalle. |
| Tabla demasiado estrecha en 61% | Min-width interno y scroll del panel; sin overflow del documento. |
| Podio visual altera orden accesible | DOM 1–2–3 y solo colocación CSS visual. |
| Forzar altura del bitmap con paneles futuros | Altura natural; omitir evolución/rachas/progreso y fotografía. |
| Duplicar trabajo de G6 | Filas no enlazadas; sin perfil, búsqueda ni administración de miembros. |
| Diferencia local exige tocar shared | Detener y elevar al Coordinator; componentes de UI-G2 están congelados. |

## 13. Criterio de captura UI-G5-T03

### Captura canónica

- Ruta: `/equipos/halcones/ranking`.
- Usuario: Ana Fernández / PLAYER.
- Viewport: `1440 × 1024`.
- Locale/timezone: `es-ES`, `Europe/Madrid`.
- Reloj: `2026-09-20T12:00:00.000Z` si se usan fechas relativas.
- Seed determinista y respuestas `/contexto` + `/ranking` en 200.
- Esperar fuentes, payload y layout estable.

### Aserciones previas a screenshot

- exactamente una petición de pantalla a `/ranking`; ninguna petición a `/dashboard`, `/jugadores` o `/logros`;
- cero errores de consola, HTTP o red;
- sidebar 172 px y cabecera tenant ~129 px, sin cambio;
- contenido útil aproximadamente `61/39` a 1440;
- podio visual 2–1–3 y ganador 15–20% más alto;
- Ana/Marcos/Laura y totales del fixture coinciden con el payload;
- tabla con 12 filas, incluidos dos miembros `0/0`;
- empate María/Carmen conserva las posiciones/orden del API;
- `Álex Moreno de la Fuente` no rompe la fila y su nombre completo sigue accesible;
- media visible con unidad y participación “10 de 12”/83%;
- no aparecen temporada, evolución, racha, progreso, Capitana, fotografía real ni CTAs administrativos;
- el banner inferior mantiene ratio ~3:1–5:1 mediante CSS, sin contenido textual o pictórico inventado;
- `document.documentElement.scrollWidth === window.innerWidth`;
- ningún panel tiene clipping u overflow vertical oculto.

### Capturas/checks adicionales

- smoke TEAM_ADMIN a `1440 × 1024`: misma geometría y datos de ranking; solo cambia identidad/navegación contextual del shell.
- smoke PLAYER a `390 × 844`: podio 1–2–3 compacto, tabla con scroll interno y cero overflow global.
- estados loading, error y empty mediante interceptación/check dirigido, sin mutar el seed.
- telemetría de anchos del grid, altura relativa del podio, filas de tabla y overflow interno/global.

### Gate visual

- cero P0/P1 en jerarquía top 3, orden 2–1–3, densidad de filas, stats y relación 61/39;
- datos/roles/empates/ceros correctos;
- shell pixel-estable;
- placeholders ignorados solo en su interior pictórico, no en tamaño/alineación;
- exclusiones futuras aceptadas como omisiones deliberadas, no como paneles incompletos.

## 14. Cierre del análisis

El contrato existente es suficiente y el diseño puede converger sin backend, media real ni cambios compartidos. T02 queda acotada a la pantalla del ranking, un tipo contenedor y componentes locales. La principal disciplina será preservar el orden ordinal del API y resistir la tentación de rellenar el rail con métricas temporales que el dominio no soporta.
