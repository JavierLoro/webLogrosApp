# UI-G2-T05 — Visual Critic — Iteración 0

## Alcance y evidencia

- Viewport evaluado: `1440 × 900`.
- Implementación: `player-shell-1440x900.png` y `team-admin-shell-1440x900.png`.
- Referencias comparadas: dashboard, catálogo, ranking, jugadores, solicitudes y resumen de administración.
- Juicio limitado al shell compartido: sidebar, cabecera/identidad tenant, navegación, gutters, densidad, superficies, variante por rol y overflow. El cuerpo del dashboard se ignora salvo cuando impide comprobar el shell.
- Regiones de avatar/media se ignoran conforme al manifest. La geometría de sus slots sí se evalúa.

## Resultado

Ambas capturas muestran un estado estable y comparten la misma geometría. TEAM_ADMIN conserva marca, identidad `HALCONES`, navegación común, cabecera, sesión y contenido, y añade `Administración` respecto a PLAYER. No queda ningún P0 en la variante por rol. La base de color, borde, ancho de sidebar y gutter es consistente, pero todavía no converge con la jerarquía del shell canónico por los P1 siguientes.

## Deltas

### P1 — cabecera tenant demasiado baja y sin identidad visual dominante

- **Elemento:** cabecera superior compartida.
- **Referencia:** banda panorámica de aproximadamente 120–180 px, identidad de equipo claramente dominante a la izquierda y sesión a la derecha. El sistema permite omitir banner/temporada/campana, pero exige conservar la geometría y el equilibrio.
- **Implementación observada:** en PLAYER la cabecera termina alrededor de `y=97`; la identidad se reduce a un icono de 48 px y dos líneas pequeñas (`ESPACIO DEL EQUIPO / HALCONES`).
- **Diferencia:** se percibe como una topbar SaaS compacta, no como el encabezado tenant de las referencias; pierde jerarquía y deja la sesión como único foco visual.
- **Corrección esperada:** elevar la franja a al menos 120 px, usar el placeholder panorámico oscuro previsto y ampliar la presencia del nombre/identidad de equipo, manteniendo las omisiones funcionales ya decididas.

### P1 — lockup principal desborda el sidebar

- **Elemento:** marca superior del sidebar PLAYER.
- **Referencia:** lockup vertical contenido dentro de la columna, con icono, `LOCKERBOARD` y subtítulo centrados y con aire; nunca invade la cabecera tenant.
- **Implementación observada:** el icono rojo y el wordmark horizontal ocupan más de los 172 px; `LOCKERBOARD` alcanza/cruza visualmente el divisor y colisiona con el bloque de identidad que empieza junto a él.
- **Diferencia:** la primera lectura del shell mezcla dos identidades y rompe el límite rígido sidebar/contenido.
- **Corrección esperada:** usar una composición vertical/compacta dentro de 172 px o reducir el lockup hasta conservar padding lateral y separación inequívoca respecto a la cabecera.

### P1 — bloque de equipo actual trunca un nombre corto

- **Elemento:** selector/identidad inferior del equipo.
- **Referencia:** el nombre del equipo es legible completo dentro de una tarjeta compacta, con icono y chevron.
- **Implementación observada:** `Halcones` aparece como `Halco...` aunque el término es corto y la tarjeta ocupa casi todo el ancho disponible.
- **Diferencia:** el shell oculta información primaria sin necesidad y debilita la continuidad entre cabecera y selector de equipo.
- **Corrección esperada:** redistribuir icono, texto y chevron; reservar anchura suficiente para nombres de esta longitud y usar truncado solo cuando sea realmente inevitable.

### P2 — navegación común algo ligera respecto a la referencia

- **Elemento:** tipografía y densidad de los enlaces laterales PLAYER.
- **Referencia:** labels más condensadas y con algo más de peso/contraste, manteniendo filas compactas.
- **Implementación observada:** los labels inactivos se leen más livianos y abiertos.
- **Diferencia:** reduce levemente la contundencia editorial del shell, aunque la jerarquía y el estado activo siguen siendo claros.
- **Corrección esperada:** ajustar peso/contraste/condensación mediante los tokens ya definidos, sin aumentar el alto de fila.

## Comprobaciones positivas

- El ancho visual del sidebar PLAYER es aproximadamente 172 px y su divisor permanece fijo.
- El estado activo usa rojo sin contaminar las acciones secundarias.
- Fondo, superficies y bordes están dentro de la familia azul-negra/petróleo documentada.
- El gutter de contenido PLAYER y la alineación izquierda son coherentes.
- No se aprecia overflow horizontal en la captura PLAYER; el scroll vertical visible es compatible con contenido de altura natural.
- El avatar de sesión conserva una geometría circular 1:1 y la etiqueta de rol está visible.
- TEAM_ADMIN mantiene el shell común completo y añade Administración sin cambiar el ancho del sidebar ni los gutters.

## Límite de la evidencia

Las capturas estáticas no validan foco, teclado, landmarks ni reflow. El P0 inicialmente anotado se retiró tras reabrir el PNG completo —`1440 × 900`, SHA-256 `0A0A42B4287C064A14BB6289585F939FBEA8656DFB00F05EF2D0F788EEE053D8`— con detalle original: la lectura anterior procedía de una previsualización incompleta, no del archivo renderizado.

VERDICT: ITERATE
