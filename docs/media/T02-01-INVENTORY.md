# 7.10 / T02.01 — Inventario de partida

Fecha: 2026-09-28. Inventario de código y entorno local; no es una instalación ni una prueba de almacenamiento.

## Lo que existe

| Zona | Situación comprobada | Implicación para 7.10 |
| --- | --- | --- |
| Datos | `User` no tiene avatar; `Team` no tiene logo; `TeamMembership` conserva alias/rol sin avatar. `Logro.icono String?` contiene un emoji de texto. `PropuestaLogro` no tiene imagen ni trabajo asociado (`apps/backend/prisma/schema.prisma`). | Añadir referencias de imagen y estados sin interpretar los emoji existentes como archivos. La propuesta necesita imagen antes de crear un logro de catálogo. |
| Escrituras | La creación directa de logro y la aprobación de propuesta crean `Logro` sin imagen (`src/routes/equipos.ts`, `src/routes/propuestas.ts`). `POST /propuestas` crea directamente `PENDING`; desde el 2026-09-28 limita a cinco por jugador/equipo con transacción. | Borrador, imagen lista y publicación requieren contratos nuevos. El límite actual necesitará reutilizarse al enviar un borrador. |
| Lecturas | Catálogo/detalle devuelven el modelo de `Logro`; no hay endpoint de imagen, variante ni estado del trabajo. | Diseñar lectura privada y caché con autorización antes de conectar pantallas. |
| Frontal | `apps/frontend/src/types/api.ts` tipa `icono` como texto; `AchievementCard.tsx` y `TeamCatalogSelection.tsx` lo tratan como emoji. `AchievementMedia.tsx` y `PlayerAvatar.tsx` usan placeholders/iniciales. | Mantener la presentación heredada hasta conectar URLs protegidas y estados reales; no reinterpretar `icono` como clave S3. |
| Configuración | `src/config/env.ts` y `.env.example` solo declaran DB/sesión. Los compose local y de producción no tienen media; el backup de producción cubre PostgreSQL, no objetos. | Configuración separada de endpoint/bucket/credenciales; backups se diseñarán al desplegar, según la decisión del usuario. |

No se encontraron receptor multipart, procesador de imágenes, cliente de objetos, rutas de subida ni campos de avatar/logo/media. `Logro.icono` llegó como `TEXT` nullable en la migración `20260727151535_add_multitenancy`; los registros existentes pueden seguir mostrando emoji durante una transición aditiva. La propuesta de nuevos logros tiene hoy estados `PENDING`/`ACCEPTED`/`REJECTED`, sin `DRAFT` ni `CANCELLED`.

## Entorno y evidencias existentes

- Punto de trabajo: Windows local; PostgreSQL de UI previsto en contenedor aislado `weblogros_ui_windows`, puerto `127.0.0.1:55437` según `docs/ui-workstream/LOCAL_WINDOWS.md`. Su encabezado conserva un estado UI histórico; `docs/ui-workstream/STATUS.md` manda para el estado actual.
- Foto de esta sesión: Node `v24.14.0`; puertos 3000/3001/55437 sin escucha detectada; servicio Docker Desktop detenido y `docker ps` sin conexión al motor. Memoria libre aproximada 17.736 MiB; disco C libre aproximado 83,7 GiB. Son medidas del equipo de desarrollo, no del servidor futuro ni un presupuesto validado para SeaweedFS.
- `docs/phase-7.9/RESULT.md` acredita temporadas y retirada del campo legado localmente, incluida migración `20260924180000_remove_legacy_user_display_name`. `docs/issue-30/RESULT.md` acredita progreso/secretos #29/#30. No repetir sus migraciones ni pruebas como parte del inventario. El último build TypeScript del backend pasó tras el ajuste del límite de propuestas; la prueba HTTP/concurrente de ese ajuste sigue pendiente por ausencia de PostgreSQL local.
- Se conserva el destino de prueba acordado en `docs/MEDIA-PLAN.md`: un SeaweedFS aislado, bucket privado, volumen propio y acceso S3 solo en loopback. No existe aún ese contenedor, volumen, bucket ni credenciales de media.

## Consecuencias para el siguiente diseño

1. T02.02 debe elegir versiones y componentes concretos, y presupuestar memoria/disco/transitorios con mediciones; los 83,7 GiB libres del portátil no equivalen a capacidad de producción.
2. T02.03 debe modelar trabajos persistidos, cola 2 + 10, interrupción, cancelación y asociación final antes de que el catálogo o la revisión vean una imagen.
3. T03 debe añadir datos de manera compatible con logros existentes sin imagen y emoji en `icono`; definir permisos y referencias de propuesta, catálogo, equipo y avatar. La relación persona/equipo al salir depende de `PLAYER-LC-T01`.
4. El contrato de borrador y envío debe distinguir validación parcial de completa. La cuota de cinco es por pareja jugador/equipo; la de tres borradores por persona se conserva separada. No publicar ni enviar a revisión sin imagen lista.

T02.01 queda cerrado como **inventario documental**. T02.02–T02.04, T03, implementación y pruebas de media siguen pendientes.
