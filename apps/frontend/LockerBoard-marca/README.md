# Inventario de referencias LockerBoard

Revisión: 2026-09-17.

## Organización

- `ReferenciasPaginas/` reproduce las rutas de `src/app/`; su raíz corresponde a `/`.
- Cada ruta tiene un README con referencia, panel y pendientes; las carpetas pendientes se conservan en Git mediante ese documento.
- `ReferenciasPaginas/_compartidas/` conserva las dos láminas que contienen varias rutas. Los README enlazan al original, sin duplicar ni recortar imágenes.
- `otros/` conserva marca, iconos, fondos, texturas y exploraciones hero existentes.
- Nombres: tema-dispositivo-vN.png. `v1` identifica el primer archivo inventariado, no una aprobación de diseño.

## Cobertura

28 archivos de imagen inventariados, incluidas versiones históricas; referencias vigentes revisadas visualmente: las 17 rutas activas tienen referencia de escritorio parcial y 1 ruta está aplazada (landing). Se han incorporado las 9 imágenes nuevas con los nombres y carpetas acordados. Por decisión del usuario, la landing queda fuera del alcance actual: no se modifica ni se piden referencias hasta que indique retomarla. Ninguna ruta se declara completa: faltan variantes móviles y estados. Las 18 rutas tienen un archivo page.tsx en src/app; esto no implica que todas sus funciones estén implementadas.

| Ruta | Referencia | Observación |
| --- | --- | --- |
| `/` | [Aplazada](ReferenciasPaginas/README.md) | Fuera del alcance actual por decisión del usuario. No tocar ni pedir imágenes hasta que indique retomarla. |
| `/login` | [Disponible, parcial](ReferenciasPaginas/login/README.md) | Panel 1. Incluye ideas futuras: recuperación de contraseña y acceso con Google/GitHub. |
| `/register` | [Disponible, parcial](ReferenciasPaginas/register/README.md) | Panel 2. |
| `/equipos` | [Disponible, parcial](ReferenciasPaginas/equipos/README.md) | Panel 3. |
| `/unirse` | [Disponible, parcial](ReferenciasPaginas/unirse/README.md) | Panel 4. |
| `/solicitar-acceso` | [Disponible, parcial](ReferenciasPaginas/solicitar-acceso/README.md) | Paneles 5 y 6: formulario y éxito. |
| `/equipos/[slug]` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/README.md) | Referencia principal. Contiene propuestas de temporadas, retos y progreso. |
| `/equipos/[slug]/logros` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/logros/README.md) | Vista de cuadrícula; falta la variante de lista mostrada como opción. |
| `/equipos/[slug]/logros/[id]` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/logros/[id]/README.md) | Panel izquierdo: logrado. Faltan variantes sin conseguir y solicitud. |
| `/equipos/[slug]/logros/nuevo` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/logros/nuevo/README.md) | Panel derecho: creación. Edición con datos disponible en editar-logro-desktop-v1.png. Ruta de edición por confirmar; no se inventa una ruta adicional. |
| `/equipos/[slug]/ranking` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/ranking/README.md) | Referencia futura conservada; tener imagen no confirma funcionalidad implementada. |
| `/equipos/[slug]/jugadores` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/jugadores/README.md) | Plantilla, búsqueda y filtros de rol disponibles. |
| `/equipos/[slug]/jugadores/[id]` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/jugadores/[id]/README.md) | Resumen de perfil disponible; otras pestañas y edición pendientes. |
| `/equipos/[slug]/solicitudes` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/solicitudes/README.md) | Lista del jugador con pendientes, aprobadas y rechazadas disponible; faltan formulario y detalle. |
| `/equipos/[slug]/admin` | [Disponible, parcial](ReferenciasPaginas/equipos/[slug]/admin/README.md) | Disponibles vista general, invitaciones, solicitudes, jugadores y gestión de logros. Organizadas en siete subrutas previstas; ver índice administrativo. |
| `/comunidad` | [Disponible, parcial](ReferenciasPaginas/comunidad/README.md) | Referencia futura; falta variante de lista. |
| `/comunidad/[id]` | [Disponible, parcial](ReferenciasPaginas/comunidad/[id]/README.md) | Detalle, criterios, origen e incorporación futura disponibles. |
| `/admin` | [Disponible, parcial](ReferenciasPaginas/admin/README.md) | Vista general de equipos y solicitudes. Faltan vistas específicas de usuarios, logros globales, actividad y configuración si se mantienen en el alcance futuro. |

## Imágenes que pedir a continuación

### Cambio acordado: cualquier miembro puede proponer un logro

Pendiente de implementación. Toda propuesta pertenece al equipo actual desde el envío; el administrador aprueba su incorporación al catálogo o rechaza con motivo. Primero se aprueba e incorpora al catálogo; después el jugador puede solicitar su obtención desde el detalle. No hay solicitud simultánea ni automática. Ver [Architecture.md](../../../docs/Architecture.md).

Referencias recibidas y verificadas para el nuevo flujo:

- Formulario de propuesta: `ReferenciasPaginas/equipos/[slug]/logros/nuevo/nuevo-logro-desktop-v1.png`. El formulario es válido para el flujo secuencial; no necesita casilla de obtención.
- Historial personal: `ReferenciasPaginas/equipos/[slug]/solicitudes/solicitudes-desktop-v3.png` muestra solicitudes y propuestas con sus contenidos.
- Cola de propuestas: `ReferenciasPaginas/equipos/[slug]/admin/propuestas/solicitudes-propuestas-logros-desktop-v1.png`. Lista y detalle de revisión cubiertos; detalle en admin/propuestas/[id]/.

### Variantes restantes

Las pantallas principales de las 17 rutas activas ya tienen referencia de escritorio. La landing continúa aplazada.

1. Corregir catálogo (creación directa solo administrativa). El formulario de propuesta no requiere cambios por el flujo de obtención. Edición con datos existentes ya recibida.
2. Detalle de solicitud del jugador. El formulario de motivos/evidencia para obtener un logro existente es solo una opción futura; el flujo actual solicita desde el detalle con un botón. No confundirlo con el nuevo formulario de propuesta.
3. Detalles administrativos de obtención y propuesta recibidos; no pedirlos otra vez.
4. Confirmaciones y resultados de acciones administrativas.
5. Variantes móviles y estados compartidos loading/error/empty/401/403/404 donde correspondan.

Referencias futuras pendientes: pestañas secundarias del perfil, vistas específicas de superadministración y alternativas de lista del catálogo/comunidad. No amplían automáticamente el alcance funcional.

## Observaciones de las imágenes nuevas

- Mis solicitudes y revisión administrativa son dos imágenes distintas y están en sus carpetas correspondientes.
- La revisión administrativa resalta Solicitudes en el menú lateral, pero su breadcrumb indica Administración: navegación por unificar.
- La plantilla contiene cifras diferentes para el perfil propio en tarjeta y tabla. Las cifras y textos ilustrativos necesitan coherencia antes de implementar.
- Gestión de logros incluye asignación rápida; no hace falta pedir otra imagen para cubrir ese formulario base.
- Los botones de edición o detalle no cubren por sí solos las pantallas que abren.

## Futuro y límites de las referencias

Las referencias se conservan también para funcionalidades futuras. Las imágenes proponen login social, recuperación de contraseña, temporadas, retos, progreso, rareza, notificaciones, favoritos/comunidad y estadísticas avanzadas. Son ideas visuales por confirmar, no requisitos aprobados ni prueba de soporte del backend. No se crean rutas para estos conceptos sin definir su navegación.

## Problemas detectados y correcciones

- Cinco PNG carecían de extensión: se añadió .png verificando su firma real.
- Se normalizaron nombres, incluido el error `InterfcesAccesos`.
- Se sustituyó la carpeta plana por un árbol de rutas con enlaces a las láminas compartidas.
- No había imagen de landing completa: los hero existentes se registran como recursos, no como cobertura de la ruta.
- La lámina crear/editar muestra creación; no basta para dar la edición por cubierta.
- Superadministración y administración de equipo son pantallas distintas: la primera no cubre la segunda.
- Las ilustraciones internas de logros y banners están incrustadas en las referencias; no se consideran assets individuales disponibles.
- Ya existía un traslado de recursos a `otros/` antes de esta revisión (Git mostraba rutas antiguas eliminadas y nuevas sin seguimiento). Se preservó esa organización previa.

## Trazabilidad de los originales

- `InterfcesAccesos-Onboarding.png` → [_compartidas/acceso-onboarding-desktop-v1.png](ReferenciasPaginas/_compartidas/acceso-onboarding-desktop-v1.png).
- `InterfazDetalleLogro-editar` → [_compartidas/detalle-y-formulario-logro-desktop-v1.png](ReferenciasPaginas/_compartidas/detalle-y-formulario-logro-desktop-v1.png).
- `InterfazEquipo.png` → [equipos/[slug]/dashboard-desktop-v1.png](ReferenciasPaginas/equipos/[slug]/dashboard-desktop-v1.png).
- `InterfazLogros` → [equipos/[slug]/logros/catalogo-desktop-v1.png](ReferenciasPaginas/equipos/[slug]/logros/catalogo-desktop-v1.png).
- `InterfazRanking` → [equipos/[slug]/ranking/ranking-desktop-v1.png](ReferenciasPaginas/equipos/[slug]/ranking/ranking-desktop-v1.png).
- `InterfazComunidadLogros` → [comunidad/comunidad-desktop-v1.png](ReferenciasPaginas/comunidad/comunidad-desktop-v1.png).
- `InterfazSuperAdmin` → [admin/superadministracion-desktop-v1.png](ReferenciasPaginas/admin/superadministracion-desktop-v1.png).


## Última revisión del flujo de propuestas

Vigentes: catálogo v2, administración general v2, solicitudes personales v3, solicitudes administrativas v3, cola de propuestas v1 y formularios de propuesta/edición v1. Las versiones anteriores se conservan como histórico.

Correcciones: catálogo de jugador no debe ofrecer creación directa; propuesta aprobada debe indicar incorporación al catálogo, no una incorporación aplazada. «En revisión» y «Sugerir cambios» quedan como ideas visuales pendientes de decisión. En propuestas internas usar «miembros del equipo», evitando confundirlas con comunidad cross-team.

No se requiere crear tres pantallas nuevas independientes: las variantes y tablas recibidas cubren los apartados propuestos. Permanece pendiente el detalle de solicitud de obtención, variantes móviles y estados generales; revisión de propuesta ya recibida. La landing sigue aplazada.

## Navegación administrativa reorganizada

Las 18 rutas originales se amplían con 7 subrutas previstas de administración: 25 rutas en el mapa objetivo, 24 activas en este trabajo y la landing aplazada. Las 7 nuevas aún no existen en src/app. Las referencias de las 7 subrutas administrativas están disponibles, incluido el detalle de solicitud de obtención.

Ver [índice de administración](ReferenciasPaginas/equipos/[slug]/admin/README.md). La raíz contiene el resumen; invitaciones, jugadores, logros, solicitudes y propuestas tienen carpeta propia. Solicitudes y propuestas disponen de [id] para sus detalles. El resto de las rutas y la superadministración global mantienen su ubicación. Las versiones históricas se conservan junto a su vista, sin duplicar imágenes.

## Pendientes tras la última comprobación

Todas las pantallas principales del equipo y los detalles administrativos tienen referencia de escritorio. Detalle de mi propuesta del jugador recibido. No se localiza archivo del detalle personal de solicitud de obtención; confirmar guardado antes de pedir regenerarlo. Puede adaptarse del administrativo al implementar.

No se requieren referencias de estados vacíos ni correcciones menores; se resolverán al montar las pantallas. Landing aplazada. Vistas futuras opcionales: áreas secundarias de superadministración y pestañas secundarias del perfil. Las variantes móviles pueden resolverse con criterios responsive o una referencia representativa; no exigir una imagen por ruta.
