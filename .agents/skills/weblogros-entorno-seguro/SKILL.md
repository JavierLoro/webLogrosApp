---
name: weblogros-entorno-seguro
description: "Levanta, revisa, detiene y diagnostica el entorno local de WebLogros en CT 112 sin duplicar servicios Docker y Node ni agotar RAM/swap. Usar cuando se pida arrancar el entorno de desarrollo o pruebas, comprobar o lanzar el seed, dejar la app accesible para revisión, apagar lo iniciado, o investigar un bloqueo/OOM ocurrido durante el arranque. No usar para producción ni CT 114."
---

# WebLogros: entorno seguro

Opera únicamente el entorno de desarrollo CT 112. Lee primero el `AGENTS.md` del repositorio. Si hay síntomas del CT, OOM, sesiones retenidas o hace falta consultar Proxmox, carga también `homelab-operations`.

## Principio rector

Ejecuta un solo modo de aplicación a la vez:

- **Local (predeterminado para revisar código actual):** PostgreSQL en Docker y backend/frontend como procesos locales.
- **Contenedores (smoke test):** el stack de `docker-compose` y ningún backend/frontend local.

Nunca mezcles el stack de aplicación en Docker con procesos Node locales. No repitas un arranque mientras no sepas si el anterior sigue vivo.

## 1. Preflight obligatorio

Antes de iniciar compiladores o servidores, ejecuta:

```bash
.agents/skills/weblogros-entorno-seguro/scripts/preflight.sh local dev
```

El primer argumento elige `local` o `containers`; el segundo expresa la operación:

- `runtime`: comprobar o iniciar un stack ya construido; exige 1024 MiB disponibles.
- `dev`: ejecutar compiladores con recarga; exige 2560 MiB disponibles.
- `build`: reconstruir imágenes o ejecutar un build de Next; exige 3072 MiB disponibles.

La reserva es `consumo estimado de la operación + margen de seguridad`, y se compara con `MemAvailable`, que incluye RAM recuperable del caché del kernel. Se puede ajustar con `WEBLOGROS_REQUIRED_AVAILABLE_MIB` si existe una medición más precisa para una operación concreta.

La ocupación de swap se muestra como advertencia e indicio histórico, pero no bloquea mientras `MemAvailable` cubra la reserva calculada. El script es de solo lectura y falla de forma cerrada si no puede verificar Docker, si detecta modos mezclados o si falta RAM disponible para la operación solicitada.

Si falla:

1. No arranques nada ni reintentes compiladores.
2. Expón qué condición falló y qué procesos/contenedores ocupan el modo elegido.
3. Pide aprobación antes de detener contenedores ajenos a la sesión, terminar sesiones retenidas, reiniciar el CT, alterar swap/RAM o cambiar infraestructura.
4. Tras cualquier recuperación aprobada, repite el preflight desde cero.

No uses `pkill node`, patrones amplios ni cierres sesiones por inferencia.

## 2. Elegir el modo

### Revisión estable del código actual

Prefiere modo local con la base de datos como único servicio Docker. Para una revisión visual sin HMR, usa el frontend compilado (`npm run build` seguido de `npm start`); suele mantener menos compiladores residentes que `next dev`. Usa desarrollo con HMR solo si el trabajo activo lo necesita.

Antes de detener `weblogros_backend`, `weblogros_frontend` o `weblogros_nginx` para liberar el modo local, informa de los objetivos exactos y pide aprobación. Deja `weblogros_db` activo salvo petición contraria.

### Smoke test de contenedores

Usa exclusivamente `docker compose`. No añadas procesos `next`, `ts-node` o `nodemon` locales. Aclara si las imágenes representan el código actual. Antes de reconstruirlas usa `preflight.sh containers build`; construye una sola vez y preferentemente de forma secuencial.

## 3. Base de datos y seed

1. Comprueba que PostgreSQL está sano antes de consultar datos.
2. Verifica datos de prueba mediante conteos o identificadores esperados, sin imprimir variables de entorno, credenciales, hashes ni tokens.
3. Ejecuta `npm run seed:dev` desde `apps/backend` solo si faltan los datos esperados y existe la configuración local necesaria.
4. No relances el seed por rutina: aunque sea idempotente, puede restablecer contraseñas de prueba.
5. Después, vuelve a comprobar los registros esperados y reporta solo datos no sensibles.

## 4. Arranque supervisado

- Conserva en la misma sesión los identificadores de todos los procesos iniciados.
- Inicia cada servicio una sola vez y espera su health check con timeout antes de continuar.
- Verifica backend y frontend con peticiones HTTP acotadas; una conexión fallida no autoriza un segundo arranque hasta comprobar el proceso y el puerto.
- Mantén una única instancia de frontend. No alternes Turbopack/Webpack acumulando intentos.
- Si el frontend necesita desarrollo, respeta el script del repositorio (`next dev --webpack`) y no introduzcas otra variante improvisada.
- Si un proceso muere o la sesión pierde control, pausa y repite inventario de procesos, puertos, Docker y memoria antes de actuar.

## 5. Parada y entrega

Detén únicamente los PID o la sesión creados durante el arranque actual. Verifica que los puertos hayan quedado libres. No detengas la base de datos salvo que el usuario lo pida.

Al entregar, indica:

- modo utilizado;
- servicios y URLs realmente saludables;
- si se ejecutó el seed y por qué;
- memoria/swap del preflight;
- cómo se supervisan y cómo detener exactamente los procesos iniciados.

## 6. Diagnóstico de bloqueo u OOM

No concluyas que el CT se reinició solo porque desaparecieron procesos. Recoge, en este orden:

1. `uptime`, memoria y swap actuales;
2. contadores `memory.events` disponibles;
3. journal de OOM y sesiones dentro del CT;
4. procesos de mayor RSS y sesiones retenidas;
5. estado e inspección OOM de contenedores;
6. cronología de los intentos de arranque.

Distingue hechos de inferencias. El nombre exacto del proceso víctima puede requerir el journal del host Proxmox; si no hay acceso, dilo y no lo inventes.

No reinicies CT 112, no ejecutes `swapoff`, no cambies límites del CT y no actúes sobre CT 114 sin petición y aprobación explícitas.
