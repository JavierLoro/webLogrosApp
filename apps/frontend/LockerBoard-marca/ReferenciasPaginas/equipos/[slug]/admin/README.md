# Administración del equipo

Ruta: /equipos/[slug]/admin.

Esta raíz corresponde al resumen administrativo. Referencia vigente: [Vista general v2](administracion-equipo-desktop-v2.png); v1 se conserva como histórico.

## Subrutas acordadas, pendientes de implementar

| Sufijo bajo /equipos/[slug]/admin | Apartado | Referencia |
| --- | --- | --- |
| /invitaciones | Crear y gestionar invitaciones | [Disponible](invitaciones/README.md) |
| /jugadores | Gestión de miembros y roles | [Disponible](jugadores/README.md) |
| /logros | Catálogo administrativo y asignación | [Disponible](logros/README.md) |
| /solicitudes | Solicitudes de obtención | [Disponible](solicitudes/README.md) |
| /solicitudes/[id] | Detalle y resolución de obtención | [Disponible](solicitudes/[id]/README.md) |
| /propuestas | Nuevos logros propuestos | [Disponible](propuestas/README.md) |
| /propuestas/[id] | Detalle y resolución de propuesta | [Disponible](propuestas/[id]/README.md) |

Solicitudes y propuestas pueden presentarse como pestañas enlazadas a sus propias URLs. Las acciones breves (copiar invitación, cambiar rol, confirmar retirada o asignar logro) se mantienen dentro de cada página. Filtros y estados no crean subrutas.

Las imágenes se han trasladado intactas a las carpetas correspondientes. Esta organización define navegación futura; las subrutas todavía no se han creado en src/app. /admin global sigue reservado a superadministración.

El flujo de propuestas es secuencial: proponer → aprobar e incorporar al catálogo → solicitar obtención desde el detalle del logro. No se solicita la obtención al proponer ni se concede automáticamente.

## Ajustes para implementar

Mantener Administración activa en el menú en todas las subrutas y ajustar breadcrumbs. La imagen de detalle de propuesta ya cubre el comentario de revisión y resolución; no hace falta otra por este motivo. Exigir motivo al rechazar. «Solicitar cambios», «En revisión», roles configurables e invitaciones por email son ideas visuales futuras, sin ampliar el alcance aprobado. Usar «miembros del equipo» cuando se hable de propuestas internas.

Detalle de solicitud de obtención recibido y revisado. Adaptación móvil y estados generales se concretarán al implementar; los estados vacíos no requieren imágenes propias. Los ajustes menores se realizan al montar las pantallas, sin regenerar las referencias.
