# Cuentas de prueba

El seed de desarrollo crea estas cuentas:

| Cuenta | Equipo | Permiso de plataforma |
|---|---|---|
| `test@halcones.com` | Halcones (`TEAM_ADMIN`) | `SUPER_ADMIN` |
| `ana@halcones.test` | Halcones (`PLAYER`) | — |
| `marcos@halcones.test` | Halcones (`PLAYER`) | — |
| `lucia@lobos.test` | Lobos (`PLAYER`) | — |

Todas comparten la contraseña local definida en
`apps/backend/.env.seed.local`. Ese archivo está ignorado por Git para que cada
entorno tenga su propia clave.

## Preparar un entorno nuevo

Desde la raíz del proyecto, genera una contraseña local aleatoria y limita los
permisos del archivo:

```bash
cd apps/backend
umask 077
printf 'SEED_USER_PASSWORD=' > .env.seed.local
openssl rand -hex 12 >> .env.seed.local
chmod 600 .env.seed.local
```

Después, de nuevo desde la raíz del proyecto, levanta la base de datos, aplica
las migraciones y ejecuta el seed:

```bash
docker compose up -d db
cd apps/backend
npx prisma migrate deploy
npm run seed:dev
```

`npm run seed:dev` lee automáticamente `.env.seed.local`. El archivo no debe
copiarse entre máquinas: se genera uno distinto en cada entorno.

Para consultar la contraseña desde el directorio raíz del proyecto:

```bash
sed -n 's/^SEED_USER_PASSWORD=//p' apps/backend/.env.seed.local
```

Para crear o restaurar las cuentas y el contenido de prueba:

```bash
cd apps/backend
npm run seed:dev
```

El comando restablece todas las cuentas de la tabla a la misma contraseña local.
Puede repetirse sin duplicar equipos, logros, usuarios ni asignaciones.

## Ejecutarlo dentro de Docker

Cuando el backend ya está levantado mediante Compose, se puede pasar una clave
temporal al contenedor sin crear el archivo dentro de la imagen:

```bash
read -s SEED_USER_PASSWORD
export SEED_USER_PASSWORD
docker compose exec -e SEED_USER_PASSWORD backend npm run seed
unset SEED_USER_PASSWORD
```

`read -s` evita mostrar la clave mientras se escribe. `unset` la retira de la
sesión del shell cuando termina el seed.
