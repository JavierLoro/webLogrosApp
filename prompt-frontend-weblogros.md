# Prompt de diseño del frontend de WebLogros

Diseña el frontend completo de **WebLogros**, una plataforma web multi-tenant donde equipos de trabajo, comunidades o grupos pueden crear una sala privada para reconocer avances, asignar logros a sus miembros y visualizar su progreso colectivo.

Cada equipo dispone de un espacio independiente bajo la ruta `/equipos/[slug]`. Los datos de un equipo nunca deben mezclarse con los de otro. Un usuario puede pertenecer a varios equipos y tener un rol diferente en cada uno:

- `SUPER_ADMIN`: administra toda la plataforma.
- `TEAM_ADMIN`: gestiona un equipo concreto.
- `PLAYER`: miembro o jugador del equipo.

## Objetivo del producto

WebLogros debe transformar el progreso cotidiano de un equipo en una **sala de trofeos viva**. La experiencia debe transmitir reconocimiento, pertenencia y celebración, evitando parecer un dashboard corporativo genérico o una aplicación infantil de gamificación.

## Dirección visual

Crear una identidad cálida, expresiva y editorial inspirada en:

- Salas de trofeos.
- Insignias coleccionables.
- Medallas y placas conmemorativas.
- Carteles de equipos y clubes.
- Álbumes donde se conserva una historia compartida.

La interfaz debe sentirse humana, alegre y distintiva, pero suficientemente sobria para equipos profesionales.

### Paleta

- Ink: `#18201F` — texto principal y elementos de alto contraste.
- Ink soft: `#52605D` — texto secundario.
- Paper: `#F5F0E7` — fondo principal, parecido a papel.
- Paper deep: `#E9E0D2` — superficies secundarias.
- Coral: `#E85D4F` — acciones principales y acentos.
- Coral dark: `#BB3E35` — estados hover.
- Gold: `#D99A32` — puntos, premios y logros destacados.
- Gold pale: `#F5D994` — fondos de insignias.
- Mint: `#B8DDCA` — estados positivos.
- White: `#FFFDF8` — tarjetas y superficies elevadas.

### Tipografía

- Space Grotesk para títulos y nombres de logros.
- DM Sans para textos, formularios y navegación.
- IBM Plex Mono para puntos, roles, etiquetas, categorías y metadatos.

Utilizar bordes visibles, sombras sólidas ligeramente desplazadas, tarjetas con personalidad y detalles geométricos sutiles. Evitar gradientes genéricos, *glassmorphism* excesivo y grandes bloques de métricas sin contexto.

El elemento visual característico será la **insignia viva**: una composición circular inspirada en una medalla, rodeada por pequeñas tarjetas de logros que representan cómo crece la historia del equipo.

## Requisitos generales

La aplicación se construye con Next.js, React y Tailwind CSS.

Debe ser:

- Mobile-first y completamente responsive.
- Utilizable con teclado.
- Accesible: landmarks semánticos, labels, contraste suficiente, foco visible y mensajes de error asociados a los controles.
- Clara en estados loading, error, vacío, 401, 403 y 404.
- Consistente en nombres de acciones y mensajes.
- Privada por defecto dentro de cada equipo.
- Capaz de diferenciar visualmente las funciones disponibles según el rol del usuario.

Las acciones deben utilizar textos claros como “Crear logro”, “Guardar logro”, “Solicitar logro”, “Aprobar solicitud” o “Unirme al equipo”. Evitar botones vagos como “Enviar” o “Continuar” cuando sea posible indicar la acción real.

## Estructura global

### Cabecera pública

- Logotipo o símbolo de WebLogros.
- Enlace a inicio.
- Botones “Iniciar sesión” y “Crear cuenta”.
- Cuando existe sesión: “Mis equipos”, “Unirse” y “Cerrar sesión”.

### Shell del equipo

- Identidad y nombre del equipo.
- Etiqueta “Sala de trofeos”.
- Navegación principal: Inicio, Logros, Ranking, Jugadores y Solicitudes.
- Entrada de administración visible solamente para `TEAM_ADMIN`.
- Navegación horizontal desplazable o menú compacto en móvil.
- Indicador claro de la sección activa.

## Pantallas públicas

### 1. Landing — `/`

Página publicitaria que explique el producto.

Hero:

- Etiqueta: “Sala de trofeos viva · WebLogros”.
- Titular: “Haz visible lo que vuestro equipo ya está consiguiendo”.
- Explicación breve sobre reconocer personas y convertir el progreso en una historia compartida.
- CTA principal: “Crear espacio de equipo”.
- CTA secundario: “Ver cómo funciona”.
- Una demostración visual de una sala con puntos e insignias.

Secciones posteriores:

- Cómo funciona: elegir lo que importa, reconocer el avance y contemplar la historia del equipo.
- Ejemplos de insignias y logros.
- Explicación de privacidad: cada equipo dispone de su propia sala.
- CTA final para crear una cuenta o solicitar acceso.

### 2. Solicitar acceso — `/solicitar-acceso`

Formulario para que una organización solicite un espacio:

- Nombre del equipo.
- Nombre y email de contacto.
- Breve descripción.
- Número aproximado de miembros.
- Estado de envío, validación y confirmación.

### 3. Iniciar sesión — `/login`

Formulario sencillo con:

- Email.
- Contraseña.
- Botón “Entrar”.
- Enlace para crear una cuenta.
- Errores de credenciales y conexión.
- Estado de carga.
- Al iniciar sesión, si el usuario pertenece a un equipo, llevarlo a ese equipo; si pertenece a varios, llevarlo a “Mis equipos”.

### 4. Crear cuenta — `/register`

Formulario con email y contraseña:

- Validaciones visibles.
- Requisitos de contraseña.
- Error de cuenta existente.
- Confirmación y redirección al login.

### 5. Mis equipos — `/equipos`

Selector para usuarios que pertenecen a varios equipos:

- Tarjetas con nombre y rol en cada equipo.
- Acceso a la sala seleccionada.
- Estado vacío cuando todavía no pertenece a ningún equipo.
- CTA “Usar invitación”.

### 6. Unirse a un equipo — `/unirse`

Permitir pegar un token o abrir un enlace de invitación:

- Campo para el código.
- Vista previa del nombre del equipo.
- Caducidad o usos disponibles cuando corresponda.
- Botón “Confirmar y unirme”.
- Estados de invitación inválida, caducada o agotada.
- Al completar la unión, redirigir al dashboard del equipo.

## Pantallas del espacio de equipo

### 7. Dashboard — `/equipos/[slug]`

Resumen visual de la sala del equipo.

Versión inicial:

- Bienvenida e identidad del equipo.
- Número de logros disponibles.
- Muestra de logros recientes del catálogo.
- Accesos directos al catálogo y a crear un logro.
- Mensaje explícito cuando todavía no existen logros.

Versión completa futura:

- Feed de logros obtenidos recientemente.
- Mini-ranking con los 3–5 mejores jugadores.
- Estadísticas: jugadores, logros otorgados y puntos acumulados.
- Logro más conseguido.
- Logro más raro.
- Último logro creado.
- Widgets configurables por el administrador.

### 8. Catálogo de logros — `/equipos/[slug]/logros`

Presentarlo como una auténtica sala de trofeos:

- Cabecera “Catálogo de logros”.
- Grid responsive de tarjetas.
- Cada tarjeta muestra icono o emoji, nombre, descripción, categoría y puntos.
- En el futuro, mostrar cuántos jugadores lo han conseguido.
- Acción “Crear logro” visible solamente cuando el usuario tenga permiso.
- Loading mediante skeletons.
- Estado vacío con CTA para crear el primer logro.
- Error de carga con opción para reintentar.
- Estado 401 para sesión caducada.
- Estado 404 cuando el equipo no existe.

### 9. Detalle de logro — `/equipos/[slug]/logros/[id]`

Página centrada en una insignia:

- Icono grande.
- Nombre.
- Descripción.
- Categoría.
- Puntos.
- Fecha de creación.
- Lista de jugadores que lo han conseguido.
- Estado vacío si todavía nadie lo posee.
- Acción para solicitarlo si el usuario es `PLAYER`.
- Acciones administrativas para editarlo, asignarlo o eliminarlo en fases futuras.
- Navegación “Volver al catálogo”.
- Estado 404 si el logro no existe dentro de ese equipo.

### 10. Crear logro — `/equipos/[slug]/logros/nuevo`

Formulario para `TEAM_ADMIN`:

- Nombre del logro.
- Descripción.
- Categoría.
- Icono o emoji.
- Puntos, como número entero igual o mayor que cero.
- Vista previa de la insignia.
- Botón “Guardar logro”.
- Validaciones inline.
- Estado de guardado.
- Error 401 si la sesión caducó.
- Error 403 si el usuario no administra ese equipo.
- Tras guardar, regresar al catálogo.

## Pantallas planificadas

Estas pantallas deben formar parte del sistema visual, pero pueden mostrarse como funciones próximamente disponibles si todavía no existe backend.

### 11. Ranking — `/equipos/[slug]/ranking`

- Podio visual para los tres primeros: oro, plata y bronce.
- Ranking completo con posición, jugador, logros y puntos.
- Estadísticas generales del equipo.
- Responsive: tabla en escritorio y filas o tarjetas en móvil.
- Estado vacío cuando todavía no hay puntuaciones.

### 12. Jugadores — `/equipos/[slug]/jugadores`

- Listado o grid de miembros.
- Avatar o iniciales.
- Nombre, rol, puntos y cantidad de logros.
- Búsqueda y filtros.
- Acceso al perfil individual.

### 13. Perfil de jugador — `/equipos/[slug]/jugadores/[id]`

- Identidad del jugador.
- Puntos totales.
- Colección de logros conseguidos.
- Historial de actividad.
- Progreso y posición en el ranking.
- Estado vacío para jugadores sin logros.

### 14. Mis solicitudes — `/equipos/[slug]/solicitudes`

Pantalla para `PLAYER`:

- Solicitudes de logros realizadas.
- Estados claramente diferenciados: pendiente, aprobada y rechazada.
- Fecha, logro solicitado y posible respuesta del administrador.
- Acción para solicitar un nuevo logro.

### 15. Administración del equipo — `/equipos/[slug]/admin`

Pantalla exclusiva para `TEAM_ADMIN`:

- Resumen administrativo.
- Gestión de logros.
- Gestión de jugadores.
- Invitaciones con caducidad y límite de usos.
- Generar, copiar y revocar invitaciones.
- Solicitudes de logros pendientes.
- Acciones “Aprobar” y “Rechazar”.
- Confirmaciones antes de operaciones destructivas.

### 16. Comunidad — `/comunidad`

Galería cross-team accesible con sesión:

- Logros publicados por distintos equipos.
- Búsqueda, categorías y filtros.
- Autoría visible.
- Acción para proponer la publicación de un logro propio.
- Acción para proponer implementar un logro ajeno.
- Explicar que implementar crea una copia independiente en el equipo y conserva la atribución.

### 17. Detalle de comunidad — `/comunidad/[id]`

- Presentación completa del logro publicado.
- Equipo o autor original.
- Equipos que lo han implementado.
- CTA “Proponer para mi equipo”.
- Confirmación de que la copia podrá editarse y no cambiará si cambia el original.

### 18. Administración global — `/admin`

Pantalla exclusiva para `SUPER_ADMIN`:

- Equipos registrados.
- Solicitudes de nuevos espacios.
- Estado de cada solicitud.
- Crear, activar o revisar equipos.
- Vista general de la plataforma.
- Acciones administrativas claramente separadas de las del equipo.

## Estados transversales

Diseñar variantes reutilizables para:

- Loading: skeletons que conserven la estructura final.
- Empty: explicar qué falta y ofrecer la siguiente acción.
- Error: indicar qué ocurrió y cómo reintentar.
- 401: “Tu sesión ha caducado” con acceso al login.
- 403: explicar que el usuario no tiene permiso.
- 404: diferenciar equipo inexistente y logro inexistente.
- Éxito: confirmaciones breves y coherentes.
- Próximamente: identificar funciones bloqueadas sin simular datos reales.

No ocultar silenciosamente los fallos. Cada estado debe orientar al usuario hacia una acción concreta.

## Componentes reutilizables

Crear un sistema consistente con:

- Header público.
- Navegación del equipo.
- `AchievementCard`.
- Insignia o medalla.
- Tarjetas de estadísticas.
- Podio de ranking.
- Feed de actividad.
- Formularios accesibles.
- Botones primario, secundario y destructivo.
- Badges de estado y rol.
- Skeletons.
- `EmptyState`.
- `ErrorState`.
- Modales de confirmación.
- Toasts de éxito y error.

## Entrega

Generar diseños de alta fidelidad para escritorio y móvil. Mantener una identidad visual consistente en todas las páginas, preservar la separación entre equipos y mostrar solamente las acciones permitidas por el rol actual.

Priorizar primero las pantallas que ya tienen funcionalidad real:

1. Landing.
2. Login y registro.
3. Mis equipos y unirse mediante invitación.
4. Shell del equipo.
5. Dashboard básico.
6. Catálogo de logros.
7. Detalle de logro.
8. Crear logro.

Representar ranking, jugadores, solicitudes, comunidad y paneles administrativos como la evolución del mismo sistema, sin asumir que sus endpoints ya están disponibles.
