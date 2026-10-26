# Apuntes — webLogrosApp

## Multi-equipo e invitaciones

La relación entre usuarios y equipos se modela con `TeamMembership`, una tabla intermedia
que permite que una persona pertenezca a varios equipos y tenga un rol distinto en cada uno.
La pareja `userId + teamId` es única para evitar membresías duplicadas.

`TeamInvitation` representa un código compartible. La API devuelve el token plano una sola vez,
pero almacena SHA-256 en la base de datos. `expiresAt`, `revokedAt`, `maxUses` y `uses` permiten
caducarlo, revocarlo y limitar sus usos. El enlace y la entrada manual terminan en el mismo
endpoint `POST /invitaciones/join`.

El login devuelve `teams`, no `teamSlug`: una lista vacía significa que todavía no hay equipo,
una lista de un elemento permite entrar directamente y varias requieren un selector en el cliente.

Para volver a mostrar un código al administrador no basta con `tokenHash`, porque un hash es
irreversible. Se conserva el hash para validar y una segunda copia cifrada con AES-256-GCM para
recuperarla solo tras comprobar el rol `TEAM_ADMIN`. Las invitaciones creadas antes de añadir la
columna cifrada siguen siendo válidas, pero su código original no puede reconstruirse.

## JavaScript moderno

### Variables
```js
const nombre = "valor"   // no cambia
let contador = 0         // puede cambiar
```

### Arrow functions
```js
// Una línea (return implícito)
const sumar = (a, b) => a + b

// Varias líneas
const saludar = (nombre) => {
  const mensaje = `Hola ${nombre}`
  return mensaje
}
```

### Template literals
```js
const nombre = "Javier"
const mensaje = `Hola ${nombre}`   // backticks ` y ${variable}
```

### Objetos y arrays
```js
const usuario = {
  nombre: "Javier",
  puntos: 150
}
console.log(usuario.nombre)   // acceder a una propiedad

const logros = ["Primer login", "Primera tarea"]
console.log(logros[0])        // índice empieza en 0
console.log(logros.length)    // número de elementos
```

### async / await
```js
// Cuando el código tiene que esperar (BD, APIs, etc.)
const obtenerUsuario = async (id) => {
  const usuario = await consultarBaseDeDatos(id)
  return usuario
}
```

### Módulos (CommonJS)
```js
// usuarios.js — exportar
module.exports = { obtenerUsuario }

// server.js — importar
const { obtenerUsuario } = require("./usuarios")
```

---

## Node.js

Permite ejecutar JavaScript fuera del navegador.

### Comandos
```bash
node archivo.js       # ejecutar un archivo
node --version        # ver versión instalada
npm --version         # ver versión de npm
```

---

## npm

Gestor de paquetes de Node.js. Registra las librerías del proyecto en `package.json`.

### Comandos
```bash
npm init -y                        # inicializar proyecto (crea package.json)
npm install express                # instalar librería (dependencia de producción)
npm install --save-dev nodemon     # instalar librería solo para desarrollo
npm run dev                        # ejecutar script "dev" del package.json
```

### package.json — scripts útiles
```json
"scripts": {
  "dev": "nodemon server.js"
}
```

---

## Express

Librería de Node.js para crear servidores web y APIs REST.

### Estructura básica
```js
const express = require("express")
const app = express()

app.use(express.json())   // middleware para leer JSON en req.body

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000")
})
```

### Rutas
```js
// GET — obtener datos
app.get("/logros", (req, res) => {
  res.json([...])
})

// GET con parámetro dinámico
app.get("/logros/:id", (req, res) => {
  const id = req.params.id
  res.json({ id })
})

// POST — recibir datos
app.post("/logros", (req, res) => {
  const { nombre, puntos } = req.body
  res.status(201).json({ nombre, puntos })
})
```

### Códigos de estado HTTP
| Código | Significado |
|--------|-------------|
| 200 | OK (por defecto) |
| 201 | Creado correctamente |
| 400 | Error en la petición (datos incorrectos) |
| 404 | No encontrado |
| 500 | Error interno del servidor |

### Rutas en archivos separados (Router)
```js
// routes/logros.js
const express = require("express")
const router = express.Router()

router.get("/", ...)
router.get("/:id", ...)
router.post("/", ...)

module.exports = router

// server.js
const logrosRouter = require("./routes/logros")
app.use("/logros", logrosRouter)   // todas las rutas bajo /logros
```

---

## nodemon

Reinicia el servidor automáticamente al guardar cambios. Solo se usa en desarrollo.

```bash
npm install --save-dev nodemon
npm run dev   # arranca el servidor con nodemon
```

---

## TypeScript

JavaScript con tipos. Detecta errores antes de ejecutar el código.

### Instalación
```bash
npm install --save-dev typescript ts-node @types/node @types/express
npx tsc --init   # genera tsconfig.json
```

### tsconfig.json (configuración para backend Node.js)
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "rootDir": "./src",
    "outDir": "./dist",
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "sourceMap": true
  }
}
```

- `rootDir` — dónde está el código fuente TypeScript
- `outDir` — dónde se genera el JavaScript compilado
- `strict` — activa todas las comprobaciones de tipos
- `esModuleInterop` — permite usar `import` con librerías CommonJS

### Tipos básicos
```ts
const nombre: string = "Javier"
const puntos: number = 150
const activo: boolean = true
const PORT: number = 3000
```

### Interfaces — definir la forma de un objeto
```ts
interface Logro {
  id: number
  nombre: string
  puntos: number
}

const logro: Logro = { id: 1, nombre: "Primer login", puntos: 10 }
const logros: Logro[] = [...]   // array de Logros
```

### Tipos en funciones
```ts
const sumar = (a: number, b: number): number => a + b
```

### Módulos en TypeScript
```ts
// exportar
export default router

// importar
import logrosRouter from "./routes/logros"
import express, { Request, Response } from "express"
```

### Express con TypeScript
```ts
import express, { Request, Response } from "express"

const router = express.Router()

router.get("/", (req: Request, res: Response) => {
  res.json(logros)
})

router.post("/", (req: Request, res: Response) => {
  const { nombre, puntos }: { nombre: string; puntos: number } = req.body
  // ...
})
```

### Script dev actualizado en package.json
```json
"scripts": {
  "dev": "nodemon --exec ts-node src/server.ts"
}
```

---

---

## Docker

Permite ejecutar servicios (como PostgreSQL) en contenedores aislados sin instalarlos en la máquina.

### Comandos básicos
```bash
docker compose up -d        # levantar contenedores en segundo plano
docker compose down         # detener y eliminar contenedores
docker ps                   # ver contenedores corriendo
docker exec -it <nombre> psql -U <user> -d <db>   # entrar a la BD
```

### docker-compose.yml (ejemplo PostgreSQL)
```yaml
services:
  db:
    image: postgres:16
    container_name: weblogros_db
    environment:
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: admin123
      POSTGRES_DB: weblogros
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- `image` — imagen Docker a usar
- `ports` — `"local:contenedor"` — expone el puerto del contenedor al host
- `volumes` — persiste los datos aunque el contenedor se detenga

---

## PostgreSQL — SQL básico

```sql
\l                          -- listar bases de datos
\dt                         -- listar tablas

CREATE TABLE logros (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  puntos INTEGER NOT NULL
);

INSERT INTO logros (nombre, puntos) VALUES ('Primer login', 10);
SELECT * FROM logros;

\q                          -- salir de psql
```

---

## Prisma (ORM)

Permite hacer consultas a la BD desde TypeScript sin escribir SQL a mano.

### Instalación (Prisma 7)
```bash
npm install prisma @prisma/client @prisma/adapter-pg pg dotenv
npm install --save-dev @types/pg
npx prisma init              # genera prisma/schema.prisma, prisma.config.ts y .env
```

### .env
```
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/nombre_bd"
```

### prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
}

model Logro {
  id     Int    @id @default(autoincrement())
  nombre String
  puntos Int
}
```

### prisma.config.ts — URL para migraciones (CLI)
```ts
import "dotenv/config"
import { defineConfig } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env["DATABASE_URL"],
  },
})
```

### src/lib/prisma.ts — cliente para runtime
```ts
import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"]! })
const prisma = new PrismaClient({ adapter })

export default prisma
```

> En Prisma 7 el cliente runtime necesita un adapter explícito. El `.env` lo lee dotenv, no Prisma directamente.

### Comandos de migración
```bash
npx prisma migrate dev --name nombre   # crear y aplicar migración
npx prisma migrate reset --force       # resetear BD (solo desarrollo)
npx prisma generate                    # regenerar el cliente TypeScript
```

> **Nota Windows:** `prisma migrate dev` usa un binario (`schema-engine-windows.exe`) que puede ser bloqueado por Windows Defender o OneDrive. Workaround: aplicar el SQL directamente al contenedor Docker y luego ejecutar `prisma generate`.
>
> ```bash
> # Aplicar SQL manualmente al contenedor
> docker exec weblogros_db psql -U admin -d weblogros -c "CREATE TABLE ..."
> # Regenerar el cliente sin necesitar el schema engine
> npx prisma generate
> ```

### Queries básicas
```ts
import prisma from "../lib/prisma"

// Leer todos
const logros = await prisma.logro.findMany()

// Leer uno por id
const logro = await prisma.logro.findUnique({ where: { id } })

// Crear
const nuevo = await prisma.logro.create({
  data: { nombre, puntos }
})
```

---

## Next.js

Framework de React para el frontend. Combina React (componentes de UI) con un servidor, rutas automáticas y renderizado en servidor.

### Instalación
```bash
npx create-next-app@latest apps/frontend
# Opciones recomendadas: TypeScript, ESLint, Tailwind CSS, src/, App Router
```

### Arrancar el servidor de desarrollo
```bash
cd apps/frontend
npm run dev   # http://localhost:3000
```

### App Router — rutas por archivos

La carpeta `src/app/` define las rutas automáticamente:

```
src/app/page.tsx              →  /
src/app/logros/[id]/page.tsx  →  /logros/1, /logros/2, ...
```

- Cada `page.tsx` es una página
- Los corchetes `[id]` son rutas dinámicas — capturan el valor del segmento

### Server Components

Por defecto los componentes se ejecutan en el servidor (no en el navegador). Se puede hacer `fetch` directamente, sin `useEffect`:

```tsx
async function getLogros() {
  const res = await fetch("http://localhost:3001/logros")
  return res.json()
}

export default async function Home() {
  const logros = await getLogros()
  return <ul>{logros.map(l => <li key={l.id}>{l.nombre}</li>)}</ul>
}
```

### Rutas dinámicas

El valor del segmento dinámico llega como `params`:

```tsx
export default async function LogroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  // usar id para buscar el logro...
}
```

### Componente Link

Navegación entre páginas sin recargar el navegador:

```tsx
import Link from "next/link"

<Link href={`/logros/${logro.id}`}>Ver detalle</Link>
```

### Tailwind CSS

Clases de utilidad directamente en el HTML. No hay archivos CSS separados:

```tsx
<h1 className="text-3xl font-bold mb-6">Logros del equipo</h1>
<span className="text-blue-600 font-semibold">{logro.puntos} pts</span>
```

---

## JWT — Autenticación

HTTP no tiene memoria: cada petición es independiente. JWT permite que el cliente demuestre quién es en cada petición.

### ¿Qué es un token JWT?

Una cadena con tres partes separadas por puntos:
```
eyJhbGciOiJIUzI1NiJ9 . eyJ1c2VySWQiOjF9 . abc123xyz
      CABECERA               DATOS (payload)      FIRMA
```

El servidor firma el token con una clave secreta. Sin esa clave, nadie puede falsificarlo.

### Flujo completo

```
POST /auth/register  { email, password }  →  crea usuario (password hasheado)
POST /auth/login     { email, password }  →  devuelve token JWT
GET  /logros                              →  público
POST /logros         Authorization: Bearer <token>  →  protegido
```

### Librerías

```bash
npm install jsonwebtoken bcryptjs
npm install --save-dev @types/jsonwebtoken @types/bcryptjs
```

- **bcryptjs** — hashea contraseñas (nunca guardar password en texto plano)
- **jsonwebtoken** — crea y verifica tokens JWT

### Hashear una contraseña con bcrypt

```ts
import bcrypt from "bcryptjs"

// Al registrar
const hash = await bcrypt.hash(password, 10)   // 10 = rounds de encriptación
await prisma.user.create({ data: { email, password: hash } })

// Al hacer login
const esValido = await bcrypt.compare(passwordRecibido, hashGuardado)
```

### Crear un token JWT

```ts
import jwt from "jsonwebtoken"

const SECRET = process.env["JWT_SECRET"]!

// Generar token (incluye el userId en el payload)
const token = jwt.sign({ userId: user.id }, SECRET, { expiresIn: "7d" })

// Verificar token
const payload = jwt.verify(token, SECRET) as { userId: number }
```

### Middleware de autenticación

```ts
// src/middleware/auth.ts
import { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

const SECRET = process.env["JWT_SECRET"]!

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = req.headers["authorization"]           // "Bearer <token>"
  const token = header?.split(" ")[1]

  if (!token) {
    res.status(401).json({ error: "Token requerido" })
    return
  }

  try {
    const payload = jwt.verify(token, SECRET) as { userId: number }
    (req as any).userId = payload.userId
    next()   // continuar a la ruta
  } catch {
    res.status(401).json({ error: "Token inválido" })
  }
}
```

### Proteger una ruta

```ts
import { authMiddleware } from "../middleware/auth"

router.post("/", authMiddleware, async (req, res) => {
  // solo llega aquí si el token es válido
})
```

### Variable de entorno

```
JWT_SECRET="una_clave_secreta_larga_y_aleatoria"
```

---

## CORS — Cross-Origin Resource Sharing

El navegador tiene una política de seguridad que **bloquea peticiones entre orígenes distintos** (dominio, puerto o protocolo diferente). Esto se llama CORS.

### ¿Por qué aparece?

- El frontend corre en `http://localhost:3000`
- El backend corre en `http://localhost:3001`
- Son puertos distintos → orígenes distintos → el navegador bloquea la petición

**Importante:** Thunder Client y `curl` no tienen esta restricción porque no son navegadores. Un endpoint puede funcionar perfectamente en Thunder Client y fallar en el navegador por CORS.

### Solución — middleware manual en Express

```ts
// src/server.ts — añadir antes de express.json()
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "http://localhost:3000")
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") {
    res.sendStatus(200)
    return
  }
  next()
})
```

- `Access-Control-Allow-Origin` — qué origen puede hacer peticiones
- `Access-Control-Allow-Headers` — hay que incluir `Authorization` para enviar el token JWT
- `OPTIONS` — el navegador envía una "preflight request" antes de la petición real para preguntar si está permitida

### Preflight request

Antes de hacer un `POST` con cabeceras personalizadas, el navegador envía automáticamente un `OPTIONS` al mismo endpoint. El servidor debe responder 200 para que el navegador continúe con la petición real.

---

## Next.js — Client Components

Las páginas de listado y detalle son **Server Components** (se ejecutan en el servidor). Pero para formularios e interactividad se necesitan **Client Components**.

### Diferencia clave

| | Server Component | Client Component |
|---|---|---|
| Ejecución | Servidor | Navegador |
| `useState`, `useEffect` | ✗ No disponible | ✓ |
| `localStorage` | ✗ No disponible | ✓ |
| fetch | ✓ Sin CORS | ✓ Con CORS |
| Directiva | (ninguna, por defecto) | `"use client"` al inicio |

### Cuándo usar Client Component

- Formularios (login, registro, crear logro)
- Componentes que reaccionan a eventos del usuario
- Cualquier cosa que use `useState`, `useEffect`, `useRouter`
- Cuando necesites acceder a `localStorage` o `cookies`

### Estructura de un formulario con fetch

```tsx
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    try {
      const res = await fetch("/api/auth/login", {  // ruta relativa (ver sección "URLs relativas")
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })

      if (!res.ok) {
        setError("Email o contraseña incorrectos")
        return
      }

      const data = await res.json()
      localStorage.setItem("token", data.token)  // guardar token en el navegador
      router.push("/")                            // redirigir al inicio
    } catch (err) {
      setError("No se pudo conectar con el servidor")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={email} onChange={(e) => setEmail(e.target.value)} />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p>{error}</p>}
      <button type="submit">Entrar</button>
    </form>
  )
}
```

### localStorage — guardar el token en el navegador

```ts
localStorage.setItem("token", data.token)   // guardar
const token = localStorage.getItem("token") // leer
localStorage.removeItem("token")            // borrar (logout)
```

El token persiste aunque cierres el navegador (hasta que lo borres o expire).

### useRouter — redirigir desde código

```ts
import { useRouter } from "next/navigation"

const router = useRouter()
router.push("/")          // navegar a /
router.push("/login")     // navegar a /login
```

### try/catch en fetch

Siempre envuelve el `fetch` en `try/catch`. Si el servidor no responde (está caído, CORS bloqueado, etc.), `fetch` lanza una excepción que sin `try/catch` se convierte en un error no controlado:

```ts
try {
  const res = await fetch("...")
  // ... manejar respuesta
} catch (err) {
  setError("No se pudo conectar con el servidor")
}
```

### useEffect — ejecutar código en el navegador

`useEffect` ejecuta código después de que el componente se renderiza. Es necesario para acceder a APIs del navegador como `localStorage`, que no existen en el servidor:

```tsx
useEffect(() => {
  // esto solo corre en el navegador
  const token = localStorage.getItem("token")
  setLogueado(!!token)
}, [])  // [] = solo al montar el componente
```

El array de dependencias controla cuándo se re-ejecuta el efecto:
- `[]` — solo al montar (una vez)
- `[valor]` — cada vez que `valor` cambia
- sin array — en cada render (evitar)

### usePathname — detectar cambios de ruta

`usePathname()` devuelve la ruta actual (`/`, `/login`, etc.). Útil para re-ejecutar un `useEffect` cuando el usuario navega:

```tsx
import { usePathname } from "next/navigation"

const pathname = usePathname()

useEffect(() => {
  setLogueado(!!localStorage.getItem("token"))
}, [pathname])  // se re-ejecuta cada vez que cambia la ruta
```

**Por qué es necesario:** El Header nunca se desmonta al navegar en Next.js App Router. Sin `pathname` como dependencia, el `useEffect` no vuelve a correr y el estado de sesión queda desactualizado hasta recargar.

### router.refresh() — refrescar datos del servidor

Después de crear o modificar datos, `router.refresh()` le dice a Next.js que vuelva a ejecutar los Server Components de la página actual y traiga datos frescos, sin navegar a otra ruta:

```tsx
const router = useRouter()

// tras crear un logro con éxito:
router.refresh()  // recarga la lista de logros (Server Component)
```

### Mezclar Server y Client Components

Un Server Component puede importar un Client Component. El Client Component se "hidrata" en el navegador:

```
page.tsx (Server Component)
  └── NuevoLogro.tsx ("use client") — se ejecuta en el navegador
```

El fetch de `page.tsx` sigue corriendo en el servidor (sin CORS). El formulario de `NuevoLogro.tsx` corre en el navegador (con token de localStorage).

### cache: "no-store" en fetch del servidor

Por defecto Next.js cachea los resultados de `fetch` en Server Components. Para datos que cambian frecuentemente, desactiva la caché:

```ts
const res = await fetch("http://localhost:3001/logros", { cache: "no-store" })
```

---

## Problemas comunes en desarrollo

### nodemon — proceso zombie en el puerto

**Síntoma:** nodemon muestra `clean exit - waiting for changes before restart` justo después de iniciar el servidor. El servidor responde peticiones pero los cambios de código no se aplican.

**Causa:** Al cerrar nodemon con `Ctrl+C`, a veces el proceso hijo (`ts-node`) no muere correctamente. La siguiente vez que arrancas `npm run dev`, nodemon intenta iniciar en el mismo puerto, falla silenciosamente, y el proceso viejo (sin los cambios) sigue respondiendo.

**Diagnóstico:**
```bash
netstat -ano | grep :3001   # ver qué proceso ocupa el puerto
```

**Solución:**
```powershell
# PowerShell
Stop-Process -Id <PID> -Force

# CMD
taskkill /PID <PID> /F
```

Después vuelve a lanzar `npm run dev`. El servidor debería iniciar y mantenerse activo sin mostrar `clean exit`.

### Next.js monorepo — error de resolución de Tailwind

**Síntoma:** `Error: Can't resolve 'tailwindcss' in 'C:\...\apps'` al arrancar el frontend.

**Causa:** Next.js detecta la estructura de monorepo (`apps/frontend`) y usa el directorio padre (`apps/`) como contexto para webpack, pero no hay `package.json` ahí y no puede resolver módulos.

**Solución** en `next.config.ts` (Next.js 16 — fuera de `experimental`):
```ts
import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, "../../"),
}

export default nextConfig
```

> **Nota:** En versiones anteriores de Next.js esto estaba dentro de `experimental`. En Next.js 16 se movió al nivel raíz.

### TypeScript — prisma.config.ts fuera de rootDir

**Síntoma:** `error TS6059: File 'prisma.config.ts' is not under 'rootDir' './src'` al ejecutar `tsc`.

**Causa:** `prisma.config.ts` está en la raíz del backend, pero `tsconfig.json` tiene `rootDir: "./src"`. TypeScript intenta compilarlo y falla.

**Solución** — añadir `exclude` en `tsconfig.json`:
```json
{
  "compilerOptions": { ... },
  "exclude": ["prisma.config.ts", "node_modules", "dist"]
}
```

---

## Nginx

Servidor web que actúa como **reverse proxy**: recibe todas las peticiones y las redirige a la aplicación correcta según la URL.

### Sin Nginx vs con Nginx

```
Sin Nginx:
  Navegador → localhost:3000  (Next.js)
  Navegador → localhost:3001  (Express)

Con Nginx:
  Navegador → localhost:80
                   │
                [Nginx]
               /        \
          /api/*          /*
            │               │
         Express         Next.js
        (interno)        (interno)
```

### ¿Para qué sirve?

- **Un único punto de entrada** (puerto 80) en lugar de exponer varios puertos
- **SSL/HTTPS** — gestiona certificados sin que las apps lo necesiten saber
- **En producción** — las apps no están expuestas directamente al exterior

### nginx.conf

```nginx
events {}

http {
  server {
    listen 80;

    location /api/ {
      proxy_pass http://backend:3001/;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
      proxy_pass http://frontend:3000;
      proxy_set_header Host $host;
      proxy_set_header X-Real-IP $remote_addr;
    }
  }
}
```

- `events {}` — bloque obligatorio, vacío = valores por defecto
- `listen 80` — escucha en el puerto HTTP estándar
- `location /api/` — rutas más específicas primero; redirige al backend
- `location /` — todo lo demás va al frontend
- `proxy_pass http://backend:3001` — `backend` es el nombre del contenedor Docker (no `localhost`)
- `proxy_set_header` — pasa la IP y el host real al destino

### Dockerfiles

**Backend** (`apps/backend/Dockerfile`):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma      # necesario antes de npm install (postinstall ejecuta prisma generate)
RUN npm install
COPY . .
RUN npm run build         # compila TypeScript → dist/
EXPOSE 3001
CMD ["node", "dist/server.js"]
```

**Frontend** (`apps/frontend/Dockerfile`):
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build         # genera build de producción Next.js
EXPOSE 3000
CMD ["npm", "run", "start"]
```

- `node:20-alpine` — imagen ligera de Linux (~5MB)
- `COPY package*.json` antes del resto — Docker cachea capas; si no cambia `package.json`, reutiliza `npm install`
- `EXPOSE` — documenta el puerto, no lo abre (eso lo hace `docker-compose.yml`)

### .dockerignore

Evita copiar archivos innecesarios al contenedor:

```
# backend/.dockerignore
node_modules
dist
.env

# frontend/.dockerignore
node_modules
.next
.env
```

Sin esto, `COPY . .` copiaría `node_modules` local (miles de archivos) encima de los instalados en el contenedor.

### Variables de entorno en Docker

Las variables del `.env` local no entran al contenedor (están en `.dockerignore`). Se definen en `docker-compose.yml`:

```yaml
backend:
  environment:
    DATABASE_URL: postgresql://admin:admin123@db:5432/weblogros
    JWT_SECRET: clave_secreta_muy_larga_y_aleatoria

frontend:
  environment:
    BACKEND_URL: http://backend:3001   # nombre del contenedor, no localhost
```

El frontend usa la variable en Server Components:
```ts
const res = await fetch(`${process.env.BACKEND_URL ?? "http://localhost:3001"}/logros`)
```

- En Docker: usa `http://backend:3001` (comunicación interna entre contenedores)
- En local: usa el fallback `http://localhost:3001`

### postinstall — automatizar prisma generate

Script especial de npm que se ejecuta automáticamente tras `npm install`:

```json
"scripts": {
  "postinstall": "prisma generate"
}
```

Así el Dockerfile no necesita un paso extra — `prisma generate` se ejecuta solo al instalar dependencias.

---

## Estructura del proyecto

```
webLogrosApp/
├── apps/
│   ├── backend/               # Express + TypeScript + Prisma
│   │   ├── prisma/
│   │   │   ├── schema.prisma  # modelos de la BD
│   │   │   └── migrations/    # historial de cambios en la BD
│   │   ├── src/
│   │   │   ├── server.ts      # punto de entrada (puerto 3001)
│   │   │   ├── lib/
│   │   │   │   └── prisma.ts  # cliente Prisma singleton
│   │   │   └── routes/
│   │   │       └── logros.ts  # rutas del recurso logros
│   │   ├── prisma.config.ts   # configuración Prisma CLI
│   │   ├── .env               # variables de entorno (no se sube a git)
│   │   ├── tsconfig.json      # configuración TypeScript
│   │   └── package.json
│   └── frontend/              # Next.js (puerto 3000)
│       ├── next.config.ts     # outputFileTracingRoot para monorepo
│       └── src/
│           └── app/
│               ├── page.tsx              # /  (lista de logros) — Server Component
│               ├── logros/[id]/page.tsx  # /logros/:id (detalle) — Server Component
│               ├── login/page.tsx        # /login — Client Component
│               ├── register/page.tsx     # /register — Client Component
│               ├── components/
│               │   ├── Header.tsx        # cabecera global (sesión + nav)
│               │   └── NuevoLogro.tsx    # formulario crear logro (protegido)
│               ├── layout.tsx            # estructura HTML base
│               └── globals.css           # estilos globales Tailwind
├── infra/
│   └── nginx/
│       └── nginx.conf         # configuración del reverse proxy
├── _legacy/                   # archivos JS descartados (referencia)
├── docker-compose.yml         # db + backend + frontend + nginx
└── docs/
    └── apuntes.md             # este archivo
```

---

## URLs relativas — por qué el frontend nunca debe apuntar a `localhost:3001`

Al principio, los formularios del frontend hacían `fetch("http://localhost:3001/auth/login")`.
Eso funciona **solo en tu máquina** y es un bug grave en producción. La clave es entender
**dónde se ejecuta cada tipo de componente** (ver la tabla de Server vs Client Components):

| | Dónde corre el `fetch` | Qué significa `localhost` |
|---|---|---|
| **Server Component** (`page.tsx`, detalle) | En el **servidor** de Next.js | La propia máquina del servidor → `localhost:3001` sí es el backend |
| **Client Component** (`login`, `register`, `NuevoLogro`) | En el **navegador del visitante** | La máquina *del visitante* → `localhost:3001` sería el PC del usuario, **no** tu backend |

Por eso un Client Component que llama a `http://localhost:3001` falla para cualquiera que
no sea tú: el navegador del visitante intenta conectarse a *su propio* puerto 3001, que no existe.

### La solución: rutas relativas + un proxy

Los Client Components usan **rutas relativas** (`/api/auth/login`, `/api/logros`). El navegador
las resuelve contra el mismo host que sirvió la página, y alguien las reenvía al backend:

- **En producción:** **nginx** (`infra/nginx/nginx.conf`) — `/api/` → `http://backend:3001/`
  (la barra final del `proxy_pass` elimina el prefijo `/api`).
- **En desarrollo:** el `rewrites()` de `next.config.ts` hace de proxy equivalente:

```ts
async rewrites() {
  return [
    { source: "/api/:path*", destination: "http://localhost:3001/:path*" },
  ];
}
```

Así el **mismo código** (`fetch("/api/...")`) funciona en dev y en prod sin cambios.
Los **Server Components** son distintos: corren en el servidor, así que usan
`process.env.BACKEND_URL ?? "http://localhost:3001"` (red interna de Docker) — a esos **no** se les toca.

**Regla mental:** ¿el `fetch` está en un componente con `"use client"`? → ruta relativa `/api/...`.
¿Corre en el servidor? → variable de entorno `BACKEND_URL`.

---

## Migraciones de Prisma — el *drift* entre schema e historial

Al levantar el proyecto desde cero en otra máquina, el registro y login daban error 500:
`The table public.User does not exist`. La causa fue un **desajuste (drift)** entre las dos
fuentes de verdad de Prisma:

| Fuente | Qué es | Contenía |
|---|---|---|
| `prisma/schema.prisma` | Lo que **quieres** que sea la BD | `Logro` **y** `User` |
| `prisma/migrations/` | Historial de cambios SQL **ya aplicados** (va en git) | solo `init` → crea `Logro` |

El modelo `User` estaba en el schema pero **nunca se generó su migración**. En el servidor
antiguo la tabla existía porque se creó con `prisma db push` (aplica el schema directo, **sin**
dejar migración). Al reproducir el repo limpio, ese cambio no versionado se perdió.

- **`prisma db push`** → aplica el schema a la BD al momento. Rápido para prototipar, pero
  **no deja rastro en git**. Peligroso: crea drift.
- **`prisma migrate dev --name <nombre>`** → genera un `migration.sql` versionado **y** lo aplica.
  Es lo correcto para que el cambio sea reproducible.
- **`prisma migrate deploy`** → en producción / CI, reproduce las migraciones pendientes del
  historial sobre la BD. No genera nada nuevo.

El arreglo fue generar la migración que faltaba:

```bash
npx prisma migrate dev --name add_user_model   # crea 20260723112540_add_user_model + CREATE TABLE "User"
```

**Regla mental:** cada cambio de `schema.prisma` se acompaña de un `migrate dev`. `db push`
solo para experimentos desechables. Si un clon limpio + `migrate deploy` no reproduce tu BD,
tienes drift.

---

## Hardening — validación de configuración y *fail-fast*

### El problema: el `!` de TypeScript no valida nada

En varios sitios teníamos `process.env["JWT_SECRET"]!`. El `!` es el **non-null assertion
operator**: una promesa al *compilador* ("esto nunca será `undefined`"), pero **sin ninguna
comprobación en runtime**. Si la variable falta de verdad, el fallo ocurre **tarde y lejos**:
el servidor arranca "sano" y revienta más tarde, dentro de una petición, con un error críptico
(`jwt.sign(payload, undefined)` peta cuando un usuario hace login).

### La solución: *fail-fast* — validar al arrancar

**Fail-fast** = comprobar la configuración **una sola vez, al inicio**, y si falta algo,
**crashear inmediatamente** con un mensaje claro y `exit(1)`. Así un despliegue mal configurado
no llega a aceptar peticiones: se cae en el log de arranque señalando qué falta.

Módulo `src/config/env.ts`:

```ts
import "dotenv/config"   // línea 1: carga el .env ANTES de leer nada (ver "orden de carga")

function requerida(nombre: string): string {
  const value = process.env[nombre]
  if (!value) {
    console.error(`Environment variable ${nombre} is not defined.`)
    process.exit(1)
  }
  return value
}

export const DATABASE_URL = requerida("DATABASE_URL")
export const JWT_SECRET = requerida("JWT_SECRET")
```

El resto del código importa `{ DATABASE_URL, JWT_SECRET }` de aquí, ya validados y tipados
como `string` — sin `!`.

### Por qué `return value` compila sin `!` (tipo `never` y *narrowing*)

`process.exit(1)` tiene tipo **`never`** ("nunca devuelve, corta la ejecución aquí").
TypeScript razona: *si se llegó al `return`, es imposible haber pasado por el `if`, luego
`value` no puede ser `undefined`* → lo estrecha (*narrowing*) a `string`. Por eso no hace
falta `!`. (Un bucle `for` que valide **no** consigue esto: TS no sigue esa lógica; una función
con `never` en la rama de error, sí.)

### El código de salida importa (`exit(1)` vs `exit(0)`)

Convención universal: **`0` = éxito, distinto de `0` = error**. Docker y los orquestadores
miran ese código: con `1` saben que el contenedor arrancó mal (no lo marcan sano, disparan la
política de reinicio). Con `0` pensarían que terminó bien.

### La trampa del orden de carga de dotenv

Los `import` se ejecutan **de arriba abajo**. `dotenv` rellena `process.env` desde el `.env`
como *efecto secundario* de `import "dotenv/config"`. Si un módulo lee `process.env` **antes**
de que dotenv corra, verá las variables vacías → falso positivo del fail-fast. Solución: que
`env.ts` cargue dotenv como **su primera línea**, y que `server.ts` importe `./config/env`
como **su primera línea** — así la validación es lo primero que ocurre, pase lo que pase.

**Regla mental:** nunca leas `process.env` con `!` disperso por el código. Centraliza en un
módulo `config` que valide al arrancar y exporte valores ya tipados.

---

## Manejo de errores centralizado (Express + clases de error)

### El problema

Sin manejo de errores, cualquier `await prisma...` que falle **borbotea** hasta el manejador
por defecto de Express, que devuelve una **página HTML con el stack trace completo**. Dos males:
**fuga de información** (el cliente ve tus internals) y **formato roto** (una API debe devolver
JSON, no HTML). Además, las validaciones tipo `res.status(400).json(...)` estaban repetidas por
todas las rutas.

### Pieza A — clase de error propia (`errors/AppError.ts`)

```ts
export class AppError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message)
  }
}
```

- `extends Error`: reutiliza el error nativo (`.message`, `.stack`, lo detecta `instanceof`)
  y solo añade `statusCode`. Separa el **qué** (hubo un 404) del **cómo se responde**.
- `super(message)`: inicializa el `Error` padre; sin él, `.message`/`.stack` no funcionarían.
- `public statusCode` (*parameter property*): declara + asigna el campo en un gesto (azúcar TS).

### Pieza B — error handler global (`middleware/errorHandler.ts`)

```ts
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message })   // esperado: seguro de mostrar
  } else {
    console.error(err)                                        // inesperado: log REAL en servidor
    res.status(500).json({ error: "Internal server error" })  // ...y genérico al cliente
  }
}
```

Se monta **el último** en `server.ts`: `app.use(errorHandler)` tras las rutas.

- `err: unknown` (no `any`): en JS se puede lanzar cualquier cosa → TS **obliga** a comprobar
  con `instanceof` antes de tocar `.statusCode`. Mueve el error a **tiempo de compilación**.
- **Defensa en profundidad:** el error real se loguea en el servidor (para ti); al cliente solo
  el genérico. Nunca los dos mezclados.

### Cómo Express distingue un error handler: `fn.length`

Express **es quien llama** a tus middlewares (inversión de control: *"no nos llames, te
llamamos"*). Mira **cuántos parámetros declaraste** y eso define tu ROL:

| Parámetros | Rol | Cómo lo llama Express |
|---|---|---|
| `(req, res)` / `(req, res, next)` | Middleware/ruta normal | en cada petición |
| `(err, req, res, next)` — **4** | **Error handler** | solo cuando hay error |

No existe un middleware "normal" de 4 argumentos: si declaras 4, Express lo trata como manejador
de errores. Los 4 slots son fijos (`err, req, res, next`); no puedes meter un dato propio ahí
(para eso se usa `req`, como con `req.userId` en el authMiddleware).

### Cómo llega el error de Prisma solo al handler (Express 5)

1. La ruta es `async` → siempre devuelve una **Promise**.
2. `await prisma...` falla → esa Promise **se rechaza** con el error.
3. **Express 5** engancha automáticamente un `.catch(next)` a la Promise que devuelve tu ruta
   → llama `next(error)` por ti. (En **Express 4** esto NO pasaba: había que `try/catch` +
   `next(err)` a mano en cada ruta.)
4. `next(error)` con argumento = "hay un error" → Express salta los middlewares normales y busca
   el de 4 parámetros → tu `errorHandler`.

**Regla mental:** en Express 5, `throw` dentro de una ruta async basta para llegar al error
handler. `unknown` + `instanceof` para distinguir esperado de inesperado. El handler, siempre
el último.

---

## Validación de entrada con Zod

### El problema: `if (!email)` solo mira presencia, no forma

La validación manual (`if (!email || !password) res.status(400)`) solo detecta valores *falsy*.
No comprueba **tipo** (un número donde va string → Prisma lanza → `500`), ni **formato**
(`"noesunemail"` se guardaba), ni **restricciones** (password de 1 carácter pasaba), ni descarta
**campos extra** (mass assignment). Además: entrada mala del cliente producía un `500` (culpa
fingida del servidor) en vez del `400` correcto (culpa del cliente). Y el `: { email: string }`
sobre `req.body` es una **mentira al compilador**: `req.body` es `any`; TS no ve al otro lado de
la frontera de la red. La validación es lo que hace que el tipo sea cierto en runtime.

### La solución: un esquema (contrato ejecutable)

```ts
// schemas/auth.ts
export const registerSchema = z.object({
  email: z.email(),              // v4: formato top-level (z.string().email() está deprecado)
  password: z.string().min(6),
})
```

- **Valida en runtime** (`.parse()` lanza / `.safeParse()` devuelve `{ success, data, error }`).
- **Infiere el tipo:** `type X = z.infer<typeof registerSchema>` → una sola fuente de verdad.
- **z.object descarta claves extra** por defecto (mata el mass assignment).
- Validadores de número: `.int()`, `.positive()` (>0), `.nonnegative()` (>=0), `.negative()`, `.nonpositive()`.

### El enganche: middleware `validate(schema)` (función de orden superior)

```ts
// middleware/validate.ts
export function validate(schema: ZodType) {
  return (req, _res, next) => {                    // ← closure: recuerda `schema`
    const result = schema.safeParse(req.body)
    if (!result.success) {
      throw new AppError(400, result.error.issues.map(i => i.message).join(", "))
    }
    req.body = result.data                          // datos limpios y tipados
    next()
  }
}
```

- **Función de orden superior + closure:** `validate` no es el middleware; **devuelve** uno.
  Express llama a los middlewares con args fijos `(req, res, next)` — no hay hueco para el
  esquema, así que se "hornea" vía closure (la "mochila"). `validate(registerSchema)` recuerda
  su esquema; `validate(loginSchema)` recuerda el suyo.
- **Reutiliza el errorHandler sin tocarlo:** el middleware lanza `AppError(400)`, que el handler
  global ya sabe traducir. El `ZodError` se convierte en la frontera y nunca llega al handler.
- **`req.body = result.data`** es clave: sustituye el body crudo por el validado (sin campos extra).

### Uso en las rutas (el orden importa)

```ts
router.post("/register", validate(registerSchema), handler)
router.post("/login",    validate(loginSchema),    handler)
router.post("/",         authMiddleware, validate(crearLogroSchema), handler)  // auth ANTES
```

En `/logros`, `authMiddleware` va **antes** que `validate`: no se gasta esfuerzo validando el
cuerpo de alguien sin token (sin token → 401, ni se valida). Login usa un esquema más laxo
(sin `.min`): un usuario ya registrado puede tener cualquier contraseña.

**Regla mental:** un esquema por entrada, `validate(schema)` como middleware, y el error de
validación se traduce a `AppError(400)` para reaprovechar el error handler.

## Rate limiting (protección contra abuso por IP)

`express-rate-limit` cuenta peticiones **por IP** dentro de una ventana de tiempo y corta con
**429 Too Many Requests** al superar el máximo — sin llegar a tu handler. Defensa básica contra
fuerza bruta y creación masiva de cuentas.

- **Es una factoría (mismo patrón que `validate`):** `rateLimit({...})` no es el middleware;
  **devuelve** uno `(req, res, next)` que "recuerda" su config vía closure. Cada llamada crea
  una **instancia con su propio contador** → por eso hay un limiter por ruta.

```ts
// middleware/rateLimit.ts
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 5,          // 5 intentos / 15 min (estricto: fuerza bruta)
  message: { error: "Demasiados intentos..." },
  standardHeaders: true,  // cabeceras RateLimit-* (estándar moderno)
  legacyHeaders: false,   // quita las viejas X-RateLimit-*
})
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,          // 10 / hora (laxo: registro es acción rara)
  ...
})
```

- **Login vs register llevan limiters distintos:** el abuso del login es *fuerza bruta de
  contraseñas* (estricto); el del registro es *creación masiva de cuentas* (laxo). Instancias
  y contadores independientes.
- **Orden en la cadena — va PRIMERO:** `loginLimiter → validate → handler`. El limiter es el
  filtro **más barato** (solo mira IP + contador en memoria); descarta al atacante antes de
  gastar Zod y `bcrypt.compare` (que es lento a propósito). Regla: *cuanto más barato el filtro
  y más peticiones descarta, más arriba en la cadena.*
- **`message` como objeto `{ error: ... }`:** así la respuesta 429 tiene el MISMO formato JSON
  que el resto de errores (los que emite tu `errorHandler`). Coherencia de la API.

### La trampa de nginx: `trust proxy`

Detrás de nginx, **todas** las peticiones llegan a Express con la IP interna del proxy
(`172.x` de Docker). Si el limiter cuenta por esa IP, contaría a *todo el mundo como una sola*
→ bloquearías a usuarios legítimos. nginx pasa la IP real en `X-Forwarded-For`; para que
Express se fíe:

```ts
app.set("trust proxy", 1)   // confía en 1 salto de proxy por delante (nginx)
```

Se pone **`1`, no `true`**: con `true` confiarías en *cualquier* `X-Forwarded-For`, y un
atacante podría falsear su IP para saltarse el límite. Además `express-rate-limit` avisa del
riesgo al arrancar si detecta la incoherencia.

**Verificación en vivo:** 6 `POST /auth/login` seguidos → los 5 primeros `401`, el 6º `429`
con cabeceras `RateLimit-Policy: 5;w=900`, `RateLimit-Remaining: 0`, `Retry-After: <seg>`.

## Healthchecks (arranque ordenado y monitorización)

Resuelve el bug clásico: **el backend arranca antes de que Postgres esté listo** → `ECONNREFUSED`.
Hay que distinguir DOS healthchecks:

### 1. Endpoint `GET /health` en el backend (readiness)

Un health endpoint puede responder a dos preguntas:
- **Liveness** ("¿estoy vivo?") → el proceso responde. Trivial: `res.json({ status: "ok" })`.
- **Readiness** ("¿estoy listo para trabajar?") → además compruebo que **llego a la BD**.

Elegimos readiness porque es el útil: una query trivial que solo confirma la conexión.

```ts
app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`   // no lee tablas; solo fuerza a Postgres a responder
    res.status(200).json({ status: "ok" })
  } catch (error) {
    res.status(503).json({ status: "error" })   // 503 Service Unavailable, no 500
  }
})
```

- **503 (no 500):** no es un bug de programación, es un estado temporal de indisponibilidad.
- Va **antes de los routers y sin rate limiter** (un monitor debe poder consultarlo libremente).
- **Verificado en vivo:** BD arriba → `200 {"status":"ok"}`; `docker stop` de la BD → `$queryRaw`
  lanza `ECONNREFUSED` → el catch responde `503 {"status":"error"}`.

### 2. Healthchecks en Docker Compose (arranque ordenado)

El fallo sutil: `depends_on: - db` (sintaxis **corta**, una lista) solo espera a que db
**ARRANQUE**, no a que esté **LISTO**. Por eso el backend petaba en el arranque.

**db** — healthcheck con `pg_isready` (viene en la imagen postgres):

```yaml
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER} -d ${POSTGRES_DB}"]
      interval: 5s
      timeout: 3s
      retries: 5
```

**backend** — sintaxis **larga** de `depends_on` (mapa, sin guion) con `condition`:

```yaml
    depends_on:
      db:
        condition: service_healthy   # espera a que db esté SANO, no solo arrancado
```

**Healthcheck del backend (opcional, da uso al /health):** la trampa → la imagen Node no trae
`curl`/`wget`, pero sí Node (v18+ tiene `fetch` global). El exit code es el idioma: 0=sano, ≠0=enfermo.

```yaml
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://localhost:3001/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"]
      interval: 10s
      timeout: 5s
      retries: 5
      start_period: 10s   # margen inicial: los fallos NO cuentan como retries mientras arranca
```

Luego `frontend` y `nginx` esperan a `backend: condition: service_healthy`.

**Conceptos clave:**
- **exit code** = idioma del healthcheck (0 sano / ≠0 enfermo).
- **`start_period`** da margen de arranque sin marcar `unhealthy` por pings tempranos.
- **corta vs larga en `depends_on`:** corta = lista (solo *started*); larga = mapa con `condition`
  (permite *service_healthy*).
- **`CMD` vs `CMD-SHELL`:** `CMD` ejecuta el binario directo; `CMD-SHELL` pasa por un shell
  (necesario para expandir `${VARIABLES}`).

## Backup automático de PostgreSQL (`pg_dump`)

**Por qué es el item más crítico:** todo lo demás (imágenes, contenedores) es *recreable* desde
el código; **los datos son lo único irrecuperable**. Y Watchtower **auto-despliega** cada 30s →
una migración destructiva podría llegar sola y arrasar la BD sin que estés mirando. El backup es
la red de seguridad.

**`pg_dump` = backup LÓGICO:** no copia los ficheros binarios de Postgres, genera un **script SQL**
(`CREATE TABLE` + `COPY/INSERT`) que *recrea* la BD. Portable entre versiones, restaurable con
`psql`/`pg_restore`. (Verificado: el dump contenía `CREATE TABLE "Logro"/"User"` + `COPY ... FROM stdin`.)

**Matiz honesto sobre "dónde":** guardar el dump en un volumen del host protege de desastres
*lógicos* (migración mala, borrado) pero **NO de un fallo físico del disco** (mueren BD y backups
juntos). La protección real es *offsite* (otra máquina / S3). Para este proyecto, volumen local
es el alcance pragmático; offsite = siguiente nivel.

### Sidecar DIY (servicio en Compose)

```yaml
  backup:
    image: postgres:16                 # misma versión que db → pg_dump compatible
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      PGPASSWORD: ${POSTGRES_PASSWORD}  # libpq la lee sola → no va en el comando
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - ./backups:/backups             # dump persiste en el host, no en el contenedor
    depends_on:
      db:
        condition: service_healthy      # no dumpear una BD que aún no acepta conexiones
    entrypoint: >
      bash -c "while true; do
      pg_dump -h db -U $$POSTGRES_USER -d $$POSTGRES_DB | gzip > /backups/weblogros-$$(date +%Y%m%d-%H%M%S).sql.gz;
      find /backups -name '*.sql.gz' -mtime +7 -delete;
      sleep 86400;
      done"
```

**Piezas:**
- **Bucle** `while true; do ... sleep 86400; done` → backup diario (86400s = 24h).
- **`| gzip`** → comprime el dump al vuelo (los SQL comprimen muchísimo).
- **`find -mtime +7 -delete`** → **retención casera**: borra dumps de más de 7 días (si no, llenas
  el disco).
- **`-h db`** → resuelve el servicio `db` por DNS interno de Docker.

### ⚠️ La trampa del `$$` (Compose vs shell)

Compose **también** usa `$` para sus variables. Un `$(date)` o `$POSTGRES_USER` en el `entrypoint`
lo interpretaría **Compose** (y lo estropea). Regla: **todo `$` destinado al shell del contenedor
se escribe doble `$$`** → `$$POSTGRES_USER`, `$$(date ...)`. En `environment:` sí usas `${...}`
(ahí quieres que Compose lo lea del `.env`). Compruébalo con `docker compose config`: el `$$` sale
como `$` en la config resuelta.

**Extra:** `backups/` va al `.gitignore` (`backups/*` + `!backups/.gitkeep`) — nunca subir dumps
con datos reales al repo.

### Copias offsite — pasos manuales (pendiente de montar en el host)

El sidecar da **1 copia** en el mismo disco: protege de desastres *lógicos*, no de fallo *físico*
del disco. La **regla 3-2-1** (3 copias, 2 medios, 1 offsite) se completa con estos pasos, que
NO van en el compose (son del host Proxmox, no de la imagen que despliega Watchtower):

**A) Cronjob → copiar los dumps a otro disco / otro CT (LXC) del Proxmox**

```bash
# En el host (o en el CT que corre docker): editar el crontab
crontab -e

# Cada día a las 04:00, sincroniza los dumps a otro disco montado localmente...
0 4 * * * rsync -av --delete /ruta/al/repo/backups/ /mnt/otro-disco/weblogros-backups/

# ...o a otro CT/máquina por SSH (requiere clave SSH sin passphrase para el cron):
0 4 * * * rsync -av /ruta/al/repo/backups/ usuario@otro-ct:/backups/weblogros/
```
- `rsync -av` = copia solo lo nuevo/cambiado, preservando permisos y fechas (incremental).
- `--delete` (opcional) espeja el origen: borra en destino lo que ya no está en origen.
- Requisito para SSH: `ssh-keygen` + `ssh-copy-id` al destino, para que el cron entre sin
  contraseña.

**B) Opción: copia a Google Drive con `rclone`**

```bash
# Instalar y configurar el remoto una sola vez (interactivo):
apt install rclone            # o curl https://rclone.org/install.sh | bash
rclone config                 # crear un remoto tipo "drive" → lo llamamos p.ej. gdrive

# Subida manual:
rclone copy /ruta/al/repo/backups/ gdrive:weblogros-backups/

# Automatizar en cron (cada noche a las 04:30):
30 4 * * * rclone copy /ruta/al/repo/backups/ gdrive:weblogros-backups/
```
- `rclone config` guarda el token OAuth de Google Drive; luego el cron sube sin interacción.
- `rclone copy` es incremental (no re-sube lo ya presente). Para espejar usa `rclone sync`.

**Restauración (recordatorio):** para recuperar un dump →
`gunzip -c weblogros-<fecha>.sql.gz | docker exec -i weblogros_db psql -U <user> -d <db>`.

## Prisma — Relaciones y multi-tenancy (Phase 6)

**Multi-tenancy = "cada fila tiene dueño".** Varios equipos comparten la BD pero cada uno solo ve
lo suyo. La pieza técnica: cada fila sabe a qué equipo pertenece (una **clave foránea**, FK). "Dame
los logros de leones" = `WHERE teamId = <id de leones>`.

**Relación = una tabla apunta a otra guardando su PK en una columna (la FK).**

### Los tres tipos de relación

**1:N (uno a muchos)** — un `Team` tiene muchos `Logro`; cada `Logro` pertenece a un `Team`. La FK
vive en el lado "muchos". Se escribe en **ambos** modelos:

```prisma
model Team {
  logros Logro[]   // lado "uno": VIRTUAL (no es columna), permite team.logros
}
model Logro {
  teamId Int                                             // FK REAL (columna en la BD)
  team   Team @relation(fields: [teamId], references: [id])  // navegación VIRTUAL
}
```

- Solo `teamId` es columna real. `team` y `logros` son **campos de navegación** (Prisma los usa
  para `include: { team: true }` / `team.logros`, pero no ocupan espacio).
- Prisma **exige los dos lados** para entender la relación.

**El `?` = decisión de dominio, no sintaxis.** `Logro.teamId Int` (sin `?`, obligatorio → no hay
logros huérfanos). `User.teamId Int?` (opcional → el SUPER_ADMIN no tiene equipo, y un usuario recién
registrado tampoco). Misma forma técnica, distinta regla de negocio. En la relación opcional el `?`
va en **ambos**: `teamId Int?` y `team Team? @relation(...)`.

**N:M (muchos a muchos) → tabla puente.** Un `User` gana muchos `Logro` y un `Logro` lo ganan muchos
`User`. Una columna FK no guarda "muchos" → tabla intermedia donde **cada fila es un cruce**:

```prisma
model UserLogro {
  id      Int      @id @default(autoincrement())
  userId  Int
  user    User     @relation(fields: [userId], references: [id])
  logroId Int
  logro   Logro    @relation(fields: [logroId], references: [id])
  fecha   DateTime @default(now())      // dato DEL CRUCE (cuándo se ganó)

  @@unique([userId, logroId])           // no ganar el mismo logro dos veces
}
```

- **Puente explícito vs implícito:** Prisma puede crear la tabla puente oculta (`Logro[]` en ambos
  lados), PERO no admite campos extra. Como necesitamos `fecha` (dato del cruce), el puente debe ser
  **explícito** (modelo propio `UserLogro`). Regla: si la relación tiene atributos → puente explícito.
- **`@@` (doble arroba) = atributo a nivel de MODELO** (varios campos), frente a `@` (un campo).
  `@@unique([userId, logroId])` = **unicidad compuesta**: el *par* es único (cada uno por separado
  se repite). La BD garantiza la integridad sola.
- User y Logro **no se referencian entre sí**: ambos referencian a `UserLogro`. La N:M = dos 1:N
  contra el puente.

### Migración: añadir una FK obligatoria a una tabla con datos

Problema clásico: `Logro.teamId` es `NOT NULL` pero ya había filas → Postgres no sabe qué equipo
poner → la migración falla. Dos caminos:
- **Reset (solo dev):** borra todo y re-aplica desde cero. `npx prisma migrate reset`. Datos de
  prueba desechables.
- **Backfill (producción):** nunca resetear en prod. 3 tiempos: añadir columna nullable → `UPDATE`
  asignando un equipo por defecto → cambiar a `NOT NULL`.
- **Regla de oro:** en dev puedes resetear; en producción, JAMÁS.

**Prisma tiene un guardarraíl anti-agente:** `migrate reset`/comandos destructivos se niegan a
correr desde Claude Code sin consentimiento explícito (o se ejecutan en un shell normal del usuario).

### Cómo se traduce a SQL (verificado con `\d`)

| Prisma | SQL |
|---|---|
| `@@unique([userId, logroId])` | `UNIQUE btree (userId, logroId)` |
| `@relation(fields: [x], references: [id])` | `FOREIGN KEY (x) REFERENCES ...` |
| `@default(now())` | `DEFAULT CURRENT_TIMESTAMP` |
| `teamId Int` (sin `?`) | `NOT NULL` |

**`ON DELETE RESTRICT`** (default de Prisma en las FKs): no puedes borrar un `Team` con logros, ni
un `User`/`Logro` con filas en `UserLogro` → evita huérfanos. Cambiable a `CASCADE` si se necesita.

### El schema tipado como "lista de tareas"

Tras cambiar el schema + `prisma generate`, TypeScript marca **en compilación** cada línea que quedó
incoherente (ej.: `logro.create({ nombre, puntos })` sin `teamId` → `Property 'team' is missing`).
El compilador te dice qué actualizar; sin tipos, reventaría en runtime en producción.
⚠️ `migrate dev` normalmente regenera el cliente, pero si el build pasa "sospechosamente" tras un
cambio de schema, fuerza `npx prisma generate` (el cliente estaba cacheado).

---

## Endpoints scoped por equipo (Phase 6)

Con multi-tenancy, cada `Logro` pertenece a un `Team`. Los endpoints dejan de ser globales
(`/logros`) y pasan a estar **acotados a un equipo** vía la URL: `/equipos/:slug/logros`. El
`:slug` decide de qué equipo hablamos y **todas** las consultas se filtran por ese equipo.

### Routers anidados + `mergeParams`

En `server.ts` montamos el router bajo un prefijo que incluye el param:

```ts
app.use("/equipos/:slug", equiposRouter)
```

El `:slug` vive en el **prefijo del padre**, no dentro del router hijo (el hijo solo conoce
`/logros`, `/logros/:id`…). Pero por defecto un router hijo **no ve los params del padre** →
`req.params.slug` sería `undefined`. Se arregla con la opción del constructor:

```ts
const router = express.Router({ mergeParams: true })   // hereda los params del padre
```

Es el hermano en tiempo de ejecución del genérico `Request<{ slug: string }>` de `resolveTeam`:
uno rellena el valor, el otro lo tipa.

### `router.use(resolveTeam)` — resolver el equipo una sola vez

```ts
router.use(resolveTeam)   // corre ANTES de cualquier ruta del router
```

`resolveTeam` traduce `:slug → req.team` (o lanza 404). Puesto a nivel de router, se aplica a
todas las rutas sin repetirlo. Por eso, dentro de los handlers, `req.team!.id` usa `!` con
**legitimidad**: `resolveTeam` garantiza por construcción que `req.team` existe (o nunca llegas
al handler). Contrasta con el `!` de `JWT_SECRET`, que tapaba un fallo real.

### El scoping en sí

```ts
// Lista — SOLO los logros de ESTE equipo
prisma.logro.findMany({ where: { teamId: req.team!.id } })
```

### `findUnique` vs `findFirst` (detalle de seguridad)

Para el detalle (`GET /logros/:id`) hay que filtrar por **id Y teamId** a la vez, si no un
usuario podría leer un logro de otro equipo poniendo su id (fuga entre tenants):

```ts
prisma.logro.findFirst({ where: { id, teamId: req.team!.id } })
```

Se usa `findFirst` y **no** `findUnique` porque `findUnique` solo acepta campos únicos en el
`where`; `teamId` no es único (un equipo tiene muchos logros). `findFirst` acepta cualquier
combinación de condiciones.

### El `teamId` en el POST viene de la URL, no del body

```ts
prisma.logro.create({ data: { nombre, puntos, teamId: req.team!.id } })
```

El cliente **no** elige el equipo (sería un fallo de seguridad): lo dicta el `:slug` de la URL,
ya resuelto en `req.team`. Añadir `teamId` aquí es lo que arregla el `Property 'team' is missing`
que rompía el build tras la migración.

### Antes (plano) vs después (scoped)

| Antes (`routes/logros.ts`, borrado) | Después (`routes/equipos.ts`) |
|---|---|
| `app.use("/logros", logrosRouter)` | `app.use("/equipos/:slug", equiposRouter)` |
| `express.Router()` | `express.Router({ mergeParams: true })` + `router.use(resolveTeam)` |
| `logro.findMany()` | `logro.findMany({ where: { teamId: req.team!.id } })` |
| `logro.findUnique({ where: { id } })` | `logro.findFirst({ where: { id, teamId: req.team!.id } })` |
| `create({ data: { nombre, puntos } })` | `create({ data: { nombre, puntos, teamId: req.team!.id } })` |

> El archivo viejo se borró (git conserva el historial): `git show HEAD:apps/backend/src/routes/logros.ts`.

---

## Next.js — Esqueleto de rutas multi-tenant (Phase 6)

El backend ya era scoped (`/equipos/:slug/logros`); el frontend seguía en el mundo plano y
apuntaba a endpoints borrados. Se rehízo la estructura bajo `app/equipos/[slug]/`.

### Segmento dinámico `[slug]`

Una **carpeta** con corchetes captura ese trozo de la URL. Es el gemelo frontend del `:slug` de
Express: `/equipos/halcones` → `params = { slug: "halcones" }`.

```tsx
const { slug } = await params   // en Next 16 params es una Promise → await
```

### Layout anidado — el concepto clave

Un `layout.tsx` puede ir en **cualquier** carpeta, no solo en la raíz, y envuelve a todas las
páginas de esa carpeta y sus hijas. Se **anidan**:

```
RootLayout (html, body, Header)
  └── TeamLayout (equipos/[slug]/layout.tsx — nav del equipo)
        └── page.tsx  |  logros/page.tsx  |  ranking/page.tsx ...
```

Ventaja: el nav del equipo se escribe **una vez** y aparece en todas sus páginas. Es el mismo
principio que `router.use(resolveTeam)` en Express — lo pones a un nivel y aplica a lo que cuelga.

Dos reglas: recibe `children` **y** puede recibir `params` (si está dentro de `[slug]`), y
**debe renderizar `{children}`** o las páginas de dentro no se ven (el layout es el marco,
`children` el cuadro).

### `<Link>` vs `<a>`

`<Link href={...}>` de `next/link` navega **sin recargar la página entera** (Next carga solo lo
que cambia → sensación de app instantánea). Un `<a>` recargaría todo el sitio y perdería el
estado del cliente.

### Alias `@/` en vez de `../../../`

`tsconfig.json` define `"@/*": ["./src/*"]`, así que `@/app/components/Placeholder` funciona
desde cualquier profundidad. Evita el infierno de rutas relativas al anidar carpetas.

### Trampa: caché generada de `.next`

Tras borrar `app/logros/[id]/page.tsx`, `tsc` seguía fallando… en `.next/dev/types/validator.ts`,
un archivo **generado** por una ejecución anterior que aún referenciaba la página borrada.
No era código fuente. Se arregla con `rm -rf .next`.
**Regla:** si un error apunta a un archivo dentro de `.next/` (o cualquier carpeta generada), el
problema es caché obsoleta, no tu código.

### Props — los parámetros de un componente

Un componente React **es una función** que en vez de un número devuelve JSX. Y como toda función,
puede recibir datos. A esos datos se les llama **props**.

La única particularidad: React no los pasa sueltos, los mete **todos en un único objeto**. Los
atributos que escribes en el JSX se convierten en las claves de ese objeto:

```tsx
<Placeholder titulo="Ranking" fase="Phase 6" />
// React llama internamente a:
Placeholder({ titulo: "Ranking", fase: "Phase 6" })
```

Es la misma relación que hay entre el body de un `POST` y el `req.body` que recibes en Express.

**Se desestructuran en la firma**, igual que `const { nombre, puntos } = req.body`:

```tsx
function Placeholder({ titulo, fase, descripcion }: PlaceholderProps) { ... }
```

Anatomía que confunde al principio: `{ titulo, fase, descripcion }` es **desestructuración**
(JavaScript) y `: PlaceholderProps` tipa el **objeto entero** (TypeScript). No se tipa campo a
campo ahí: TS deduce cada pieza a partir del tipo del paquete.

### Definición ≠ uso

El error más fácil de cometer: meter el ejemplo de uso **dentro** de la propia definición.

```tsx
export default function Placeholder() {   // ← definición
  return <Placeholder titulo="..." />     // ← se llama a sí mismo → recursión infinita
}
```

Los valores concretos (`"Catálogo de logros"`) **nunca aparecen dentro del componente**. Dentro
solo existen los *nombres* de las props, como huecos: `{titulo}`. Los textos viven en quien lo
usa, es decir, en cada página. Idéntico al backend: `crearLogro("Primer gol", 10)` se escribe
donde se llama, no dentro de `function crearLogro(nombre, puntos)`.

### `type` — un alias para una forma

`type` no es un concepto nuevo: es **poner nombre** a un tipo de objeto que ya sabes escribir
inline (en `equipos.ts` ya se escribió uno: `const { nombre, puntos }: { nombre: string; puntos: number }`).

```ts
type PlaceholderProps = { titulo: string; fase: string; descripcion: string }
```

Se hace por: (1) no repetir la forma en varios sitios, (2) que la firma quepa en pantalla, y
(3) que el editor pueda navegar a ella.

**Un `type` no existe en tiempo de ejecución.** `tsc` lo borra al compilar; no genera ni una línea
de JS. Por eso no se puede hacer `new PlaceholderProps()` ni `instanceof PlaceholderProps` — para
eso hace falta una **clase** (`AppError` sí lo es, por eso el error handler puede usar `instanceof`).

| | `type` | `interface` |
|---|---|---|
| Reabrir/fusionar declaraciones | ❌ error de duplicado | ✅ se fusionan |
| Uniones (`"A" \| "B"`) | ✅ | ❌ |
| Uso típico | props de React (cerradas) | ampliar tipos de terceros |

Por eso `types/express.d.ts` usa `interface Request` (se le **añade** `team` a la Request que ya
define Express) y las props usan `type` (nadie debe ampliarlas desde fuera).

### `?` opcional: ajustar el rigor a la vida útil del código

`descripcion?: string` acepta que no venga; sin `?` la exige siempre. En `Placeholder` se dejó
**obligatoria** aun siendo lo contrario de lo que parecería "más flexible": las 13 páginas la
pasan y el componente es temporal, así que añadir el `?` más adelante cuesta una línea. Misma
clase de decisión que marcar un campo opcional en un schema de Zod.

Si fuera opcional, dentro se pintaría con **renderizado condicional**:

```tsx
{descripcion && <p>{descripcion}</p>}
```

`A && B` en JavaScript **no devuelve un booleano**: devuelve `A` si es falsy, y si no `B`. Como
React ignora `undefined`, `null` y `false`, cuando la prop no viene no se pinta nada.
⚠️ **Trampa:** si `A` es el número `0`, la expresión vale `0` y React **sí lo pinta**. Con
strings vacíos no pasa. Cuidado al condicionar por `puntos`.

## Prisma — seed idempotente para datos de prueba

Un **seed** llena una base de desarrollo con un escenario conocido. No sustituye a una
migración: la migración crea la estructura de las tablas y el seed crea filas útiles para
probar la aplicación.

El comando del proyecto es:

```bash
cd apps/backend
npm run seed:dev
```

La contraseña compartida por las cuentas de prueba vive en `.env.seed.local`, un archivo
ignorado por Git. Se puede consultar localmente siguiendo [cuentas-prueba.md](cuentas-prueba.md),
pero no se publica junto al código. El script aplica *fail-fast* si `SEED_USER_PASSWORD` falta o
tiene menos de seis caracteres, y bcrypt guarda únicamente su hash.

El seed es **idempotente**, es decir, se puede repetir sin multiplicar el contenido:

- `Team` y `User` usan `upsert` sobre sus claves únicas (`slug` y `email`).
- Cada usuario declara también `isSuperAdmin`; el `upsert` mantiene ese permiso global
  sincronizado sin mezclarlo con su rol contextual dentro de un equipo.
- Cada logro se busca por nombre dentro de su equipo y después se actualiza o crea.
- `UserLogro` usa índices únicos parciales para evitar duplicados permanentes y por temporada.
- Todo se ejecuta en una transacción; un error revierte el conjunto completo.

Esto permite refrescar nombres, descripciones, iconos y contraseñas de prueba conservando
identificadores existentes siempre que sea posible.

## Solicitudes de nuevos equipos

Crear cuenta no crea automáticamente un equipo. Un usuario autenticado puede enviar una
`TeamRequest`, que empieza en `PENDING` y después queda `ACCEPTED` o `REJECTED` por decisión del
`SUPER_ADMIN`. La relación con `User` evita confiar en un email escrito en el formulario y
permitirá que la aprobación cree el equipo y la membresía `TEAM_ADMIN` en una transacción.
El mensaje es obligatorio y se limita a 1500 caracteres, pero no exige una longitud mínima:
la calidad de la información forma parte de la revisión humana, no de la validación técnica.
La solicitud también exige `officialEmail`, normalizado a minúsculas, como señal adicional para
contrastar que el equipo existe. Validar su formato no prueba que el solicitante controle el
buzón; para eso haría falta un flujo posterior de verificación por correo.

El índice `status + createdAt` coincide con la cola del panel administrativo: filtrar por estado
y ordenar las solicitudes cronológicamente.

`POST /api/equipos/solicitudes` encadena autenticación, validación Zod y persistencia. La API
toma el usuario del JWT, no del body, y responde `409 Conflict` cuando ese usuario ya tiene una
solicitud `PENDING`. Las solicitudes aceptadas o rechazadas no bloquean una nueva petición.

La autenticación y la autorización son barreras distintas. `authMiddleware` verifica el JWT y
establece quién hace la petición; `requireSuperAdmin` consulta después el permiso actual en la
base de datos. La ausencia de sesión produce `401`, mientras que un usuario autenticado sin el
permiso requerido produce `403`.

El slug público del equipo se deriva de `teamName` al aprobar la solicitud. `normalize("NFD")`
separa las letras de sus marcas diacríticas; después se eliminan los acentos, se pasa a minúsculas
y cada grupo de caracteres no alfanuméricos se reduce a un guion. Así `Club Atlético Norte` se
convierte en `club-atletico-norte` sin añadir una dependencia externa.

### Aceptación transaccional

`POST /api/equipos/solicitudes/:id/aceptar` valida primero que el parámetro de ruta sea un entero
positivo. Después ejecuta como una única transacción la lectura de la solicitud, la creación del
equipo, la membresía `TEAM_ADMIN` del solicitante y el cambio de estado a `ACCEPTED` con su fecha
de revisión. Dentro del callback se usa `tx`, el cliente Prisma asociado a esa transacción.

La transacción solo hace *commit* cuando termina el callback. Si cualquiera de sus consultas
lanza un error, Prisma hace *rollback* y ninguna escritura queda aplicada. El equipo se crea antes
que la membresía porque esta necesita su `id`; la solicitud solo se marca aceptada después. Si el
slug derivado ya pertenece a otro equipo, se añade el identificador de la solicitud para mantener
la restricción única.

`POST /api/equipos/solicitudes/:id/rechazar` aplica la otra transición posible:
`PENDING → REJECTED`. Como solo actualiza una fila, el `update` de PostgreSQL ya es atómico y no
necesita una transacción adicional. La ruta reutiliza las mismas comprobaciones de identificador,
existencia y estado; responde `409 Conflict` si la solicitud ya había sido procesada y guarda
`reviewedAt` como fecha de la decisión.

El panel global consulta `GET /api/equipos`, protegido también por `requireSuperAdmin`. Prisma
permite incluir `_count` para que PostgreSQL calcule cuántos `miembros` y `logros` tiene cada
equipo sin traer todas esas filas por la red. Es una agregación ligera que entrega al frontend el
resumen `{ ...equipo, _count: { miembros, logros } }` y mantiene los equipos ordenados por nombre.

## Solicitudes de logro

`SolicitudLogro` reutiliza la máquina de estados `PENDING → ACCEPTED | REJECTED` para representar
que un jugador reclama un logro del catálogo. Relaciona directamente `User` y `Logro`; no guarda
otro `teamId`, porque el tenant ya se obtiene de `logro.teamId` y duplicarlo permitiría datos
contradictorios.

No existe una clave única permanente para `userId + logroId`: una solicitud rechazada no debe
impedir intentarlo de nuevo. La API será responsable de evitar dos solicitudes pendientes iguales.
Los índices por usuario/fecha y estado/fecha responden a las dos lecturas previstas: historial del
jugador y cola de revisión administrativa.

La creación de una solicitud obtiene el usuario del JWT y localiza el logro usando simultáneamente
su `id` y el `teamId` resuelto desde la URL. Antes de crear comprueba que el jugador no tenga ya el
logro ni otra solicitud `PENDING`. `GET /equipos/:slug/solicitudes` filtra por usuario y atraviesa
la relación `logro.teamId`; la cola `/admin/solicitudes` aplica el mismo aislamiento y queda
protegida por `requireTeamAdmin`.

Al aceptar, una transacción cambia la solicitud a `ACCEPTED` y crea `UserLogro`. El cambio de
estado usa una actualización condicionada por `PENDING`, equivalente a un *compare-and-set*:
si dos administradores revisan a la vez, solo uno puede completar la transición. El `upsert` de
`UserLogro` mantiene idempotente la asignación. Rechazar solo cambia el estado a `REJECTED` y la
asignación directa vuelve a comprobar que jugador y logro pertenecen al equipo de la URL.

## Fixture visual determinista — UI-G1-T02

Un fixture es un conjunto de datos preparado para comprobar una interfaz con casos conocidos.
Halcones contiene 12 miembros (10 PLAYER y 2 TEAM_ADMIN), 12 logros directos, 40 asignaciones,
8 solicitudes y 6 invitaciones. Dos miembros no tienen logros y dos empatan en puntos: las tablas
deben funcionar también con ceros y desempates. Ana pertenece además a Lobos, sin trasladar allí
sus puntos de Halcones. Lobos mantiene sus 5 logros y 2 asignaciones como contraste de aislamiento.
Las dos solicitudes aceptadas corresponden a asignaciones incluidas entre las 40; proponer logros
y completar los dos logros restantes del catálogo corresponde a UI-G1-T04.

`User.displayName` es nullable para no exigir un nombre inventado a cuentas anteriores. El fixture
sí lo rellena. `Logro.createdAt` permite ordenar las altas; la migración da a registros antiguos la
fecha de migración, que no debe interpretarse como una fecha histórica recuperada.

Las fechas del seed son ISO UTC explícitas tanto en create como en update. Una segunda ejecución
restaura las fechas de los registros del fixture y no las desplaza al día actual. El reloj visual
de referencia es 20/09/2026 a las 12:00 UTC; las invitaciones activas caducan después y la caducada
antes. El reloj del navegador no cambia la validación de caducidad del servidor.

Idempotencia significa repetir sin duplicar los registros conocidos: slug/email y claves compuestas
permiten upsert; las solicitudes se reconocen por autor, logro y fecha fija, sin imponer una
unicidad de negocio que impida volver a solicitar tras un rechazo. No se borran registros ajenos:
los conteos exactos solo se garantizan en una base exclusiva inicialmente vacía. No ejecutar seeds
concurrentes; la clave natural de solicitud no es una restricción única. El seed restablece la
contraseña de sus cuentas desde SEED_USER_PASSWORD y nunca la imprime.

Las invitaciones de este fixture local tienen códigos predecibles; no son invitaciones de producción.
Se conserva el hash para identificarlas y AES-GCM para recuperar el código, sin imprimir tokens.
El seed rechaza NODE_ENV=production. La aleatoriedad segura de bcrypt y del IV de cifrado no afecta
a los datos visibles y no debe eliminarse para conseguir determinismo binario. Las propuestas,
criterios y motivos de rechazo se incorporarán en sus tareas de dominio correspondientes.

## Lecturas del equipo y resolución visible — UI-G1-T03

El helper `readTeam` carga membresías, catálogo y asignaciones mediante tres consultas, evitando
una consulta adicional por jugador (N+1). Filtra asignaciones por `logro.teamId` y membresía actual:
una persona puede estar en Halcones y Lobos sin mezclar puntos. Las estadísticas describen miembros
actuales; las concesiones de miembros retirados no entran en este resumen. Se incluyen ceros y el
orden es puntos descendentes, cantidad descendente, id ascendente. El puesto es ordinal, incluso
si dos miembros empatan. El catálogo cuenta sus poseedores actuales con la misma definición.

`/contexto` devuelve equipo e identidad/rol fiables; `/jugadores` devuelve la lista sin emails;
`/ranking` añade totals (members, catalog, awards, points, uniqueEarned, participants). Dashboard
reutiliza esos datos y devuelve me, topPlayers, recentAchievements, recentAwards, mostEarned y
rarestEarned. El logro más raro excluye los aún no obtenidos. El feed representa solo concesiones
persistidas, sin inferir conexiones, retos ni temporadas. No se necesita un endpoint de actividad
general ni de resumen admin: la vista puede combinar las lecturas existentes sin ampliar el dominio.

Catálogo conserva sus campos y añade holdersCount/earnedByMe. Las listas y detalles de solicitudes
incluyen rejectionReason nullable para decisiones históricas. La cola administrativa mantiene
PENDING por defecto; acepta status=ACCEPTED, REJECTED o all y rechaza valores desconocidos. Los
detalles validan id y tenant simultáneamente. Administración recibe además displayName y joinedAt
en miembros; la lectura de solicitudes selecciona identidad sin hashes ni secretos.

Rechazar exige ahora `{reason}` de 1–500 caracteres tras trim; Zod evita aceptar espacios como
explicación. Se guarda junto a REJECTED/reviewedAt en la actualización condicionada a PENDING.
La migración nullable no inventa motivos para rechazos antiguos. El frontend actual debe adaptarse
en su tarea UI: sus llamadas antiguas de rechazo sin body recibirán 400 hasta aportar el motivo.

## Proponer, incorporar y obtener — UI-G1-T04

`PropuestaLogro` pertenece a un equipo y un autor desde el envío. Guarda nombre, descripción,
criterios ordenados y estado PENDING, ACCEPTED o REJECTED. Una propuesta aprobada enlaza un único
Logro; no relaciona UserLogro ni crea una solicitud de obtención. El motivo obligatorio explica
el rechazo al autor. Los índices tenant/estado/fecha y tenant/autor/fecha responden a las dos
bandejas; la unicidad de logroId evita asociar el mismo resultado a varias propuestas.

POST `/equipos/:slug/propuestas` acepta exclusivamente nombre (1–120), descripción (1–1000) y
criterios (1–10 textos de 1–300), recortando espacios. Zod strict rechaza intentos de imponer
userId, teamId, status o campos no aprobados. GET `/propuestas` devuelve solo las del autor;
GET `/propuestas/:id` mantiene el filtro autor+tenant, con 404 también para propuestas ajenas.
Los detalles personales siguen dentro de la página solicitudes; una ruta API no obliga a crear
otra página. GET `/admin/propuestas` permite status=PENDING (default), ACCEPTED, REJECTED o all;
el detalle `/admin/propuestas/:id` y las resoluciones exigen TEAM_ADMIN contextual.

Aceptar recibe puntos (entero 0–2147483647) y categoría opcional (1–80). En una transacción,
la actualización condicionada a PENDING reclama la propuesta antes de crear Logro. Otra revisión
simultánea no puede reclamarla dos veces: obtiene 409. Si falla cualquier escritura, se revierte
también el cambio de estado. Nombre, descripción y criterios pasan al catálogo sin concederlo
al autor. Rechazar recibe reason (1–500) y usa la misma condición PENDING para no sobrescribir
una aprobación. Una propuesta ajena al tenant devuelve 404; una ya resuelta devuelve 409.

La creación directa administrativa conserva nombre/puntos y admite descripción, categoría y
criterios; estos últimos valen [] si no se envían, preservando el formulario anterior. El array
vacío en la migración permite conservar logros históricos sin inventar condiciones retroactivas.

El fixture termina con 14 logros Halcones: 12 directos y 2 enlazados a propuestas ACCEPTED.
Hay 6 propuestas (2 por estado), con fechas fijas, motivos para rechazadas y vínculo solo para
aprobadas. Ana tiene ejemplos de los tres estados. Siguen siendo 40 asignaciones y 8 solicitudes:
ninguna nace de aprobar propuestas. Repetir el seed reutiliza los vínculos existentes y no elimina
filas ajenas; la prueba sobre PostgreSQL desechable corresponde a UI-G1-T05.

## Estadísticas agregadas de Mis equipos — issue #10

`GET /api/equipos/mis-equipos` incluye los conteos que necesita cada tarjeta dentro de la misma
lectura de membresías. Prisma traduce `_count` a agregaciones en PostgreSQL: así no se descargan
las colecciones completas y se evita el patrón N+1 de consultar logros y jugadores por separado
para cada equipo.

`achievements` cuenta todos los logros del catálogo. `players` aplica un filtro al conteo de
membresías y solo incluye el rol `PLAYER`; `TEAM_ADMIN` queda fuera porque el modelo actual permite
un solo rol por membresía. La posible convivencia de ambos roles se trata en la issue #16 y no
cambia retroactivamente el significado de esta respuesta.
## Identidad global y nombre contextual por equipo

Una cuenta y una membresía responden a preguntas distintas:

- `User.firstName` y `User.lastName` describen quién es la persona en toda la plataforma.
- `TeamMembership.displayName` describe cómo quiere mostrarse dentro de un equipo concreto.
- `User.displayName` se conserva temporalmente como campo legado para permitir una transición segura,
  pero las lecturas tenant nuevas ya no lo usan.

La regla de presentación está centralizada en `publicName`:

```text
alias de TeamMembership
        ↓ si falta o está vacío
firstName + lastName de User
        ↓ si ambos faltan
Miembro {id}
```

Centralizar esta regla evita que ranking, jugadores, contexto y paneles administrativos resuelvan
la misma persona de forma diferente. También protege el aislamiento multi-tenant: cada consulta
selecciona la membresía del equipo resuelto por la URL, por lo que nunca toma el alias de otro equipo.

### Migración aditiva y compatibilidad

Los tres campos nuevos son nullable en PostgreSQL. Esto no significa que el registro nuevo acepte
nombres vacíos: Zod exige y recorta `firstName` y `lastName` en el borde HTTP. La nulabilidad sirve
para que las cuentas ya existentes puedan migrarse sin inventar su identidad real.

La migración copia el antiguo `User.displayName` a todas sus membresías existentes usando un
`UPDATE ... FROM`. `NULLIF(BTRIM(...), '')` convierte valores vacíos en `NULL`. El backfill es seguro
al repetirse conceptualmente porque solo escribe membresías cuyo alias aún es `NULL`; después de
aplicarlo, el alias contextual pasa a ser la fuente principal.

El seed guarda nombre y apellidos globales y alias por membresía. Ana pertenece a dos equipos con
un alias distinto en el segundo, un fixture deliberado para detectar lecturas que ignoren el tenant.

### Contrato de registro actualizado

`POST /auth/register` recibe ahora:

```json
{
  "firstName": "Ana",
  "lastName": "Fernández López",
  "email": "ana@example.com",
  "password": "secreto"
}
```

Se usa un único campo `lastName` porque apellidos compuestos o múltiples no necesitan una semántica
separada en este producto. El avatar y la subida de archivos quedan fuera de este bloque: requieren
validación binaria, almacenamiento persistente y ciclo de reemplazo/borrado propios.

## Temporadas — catálogo reutilizable e historial por periodo

Un `Logro` responde «qué se puede conseguir»; un `UserLogro` responde «quién lo consiguió, cuándo y
en qué edición». Por eso la temporada no es un array dentro del logro. Cada concesión es un evento
independiente con su propia fecha, usuario y `seasonId`, y PostgreSQL puede relacionarlo, indexarlo y
validarlo mediante claves foráneas.

`AchievementScope` hace explícita la política del catálogo:

- `PERMANENT` usa `seasonId = NULL` y solo admite una concesión por usuario y logro.
- `SEASONAL` exige la temporada activa y admite una concesión por usuario, logro y temporada.

Una clave única compuesta normal no basta porque SQL trata los valores `NULL` como distintos. La
migración crea dos **índices únicos parciales**, cada uno aplicado solo a las filas que le interesan:

```sql
UNIQUE (userId, logroId) WHERE seasonId IS NULL
UNIQUE (userId, logroId, seasonId) WHERE seasonId IS NOT NULL
```

Prisma conoce las columnas y relaciones, pero no puede declarar esos predicados `WHERE` en
`schema.prisma`; por eso los índices viven en `migration.sql` y las rutas usan `findFirst` en lugar
del antiguo selector generado `userId_logroId`.

### Ciclo de vida y transacciones

Una temporada nace `PLANNED`, puede pasar a `ACTIVE` y termina `CLOSED`. Separar creación y
activación permite preparar fechas sin cambiar el ranking. La activación cierra la temporada activa
anterior y activa la elegida dentro de una transacción: ambas escrituras se confirman o se revierten
juntas. Un índice parcial adicional garantiza en la base que un equipo nunca termine con dos
temporadas activas, incluso ante peticiones concurrentes.

El helper `awardSeasonId` centraliza la regla de escritura. Devuelve `null` para logros permanentes;
para los estacionales busca la temporada activa del mismo equipo y responde `409 Conflict` si no
existe. Solicitar, aprobar y asignar directamente reutilizan este significado.

`SolicitudLogro.seasonId` captura la temporada al crear la solicitud, no al aprobarla. Esta decisión
evita que una revisión tardía conceda el logro en una edición distinta. El ranking corriente suma
siempre los permanentes y, cuando existe, los estacionales de la temporada activa. Consultar un
histórico cambia esa temporada seleccionada, pero conserva los permanentes como base acumulada.

La migración es aditiva para los datos existentes: `Logro.scope` nace con default `PERMANENT` y los
`seasonId` nuevos son nullable. Así las concesiones actuales continúan representando logros
permanentes sin fabricar temporadas históricas que el sistema no conoce.

## Cookies HttpOnly y ciclo de sesión

El JWT sigue siendo la credencial firmada, pero ya no se entrega dentro del JSON ni se guarda en
`localStorage`. `POST /auth/login` lo envía mediante `Set-Cookie` con `httpOnly`, por lo que el
navegador puede transportarlo pero JavaScript no puede leerlo. Esto reduce el riesgo de robo del
token mediante XSS; no sustituye la validación del JWT ni el resto de defensas del navegador.

`cookie-parser` se monta antes de las rutas y transforma la cabecera `Cookie` en `req.cookies`.
Después, `authMiddleware` obtiene `auth_token`, comprueba que sea texto, verifica firma y caducidad
con `jwt.verify` e inyecta `req.userId`. El nombre y las opciones de la cookie viven juntos en
`lib/authCookie.ts` para que login, autenticación y logout no diverjan.

En desarrollo, frontend y backend usan puertos diferentes. El backend autoriza el origen exacto y
`Access-Control-Allow-Credentials: true`; el wrapper `apiFetch` usa `credentials: "include"`. Ambas
partes son necesarias para que el navegador acepte y envíe cookies en peticiones cross-origin. No
se usa `Access-Control-Allow-Origin: *`, incompatible con credenciales.

`GET /auth/session` está protegido por `authMiddleware`, pero vuelve a consultar la base de datos:
el JWT identifica al usuario, mientras que membresías, roles y `isSuperAdmin` pueden haber cambiado.
Así la interfaz recibe estado actual sin leer la cookie.

`POST /auth/logout` no está protegido deliberadamente. Cerrar sesión debe ser idempotente incluso
si la cookie falta, expiró o contiene un JWT inválido. `clearCookie` reutiliza nombre y `path` para
expirar exactamente la cookie creada por login y responde `204 No Content`.

La comprobación manual del 22/09/2026 confirmó el ciclo completo en navegador: el login crea la
cookie, una recarga conserva la sesión, las rutas protegidas aceptan la credencial y logout la
elimina sin errores. Esta prueba complementa build/lint porque valida el comportamiento real del
navegador con `Set-Cookie`, CORS y `credentials: "include"`.

## Progreso y secretos — separar definición, avance y concesión

Bloque #30/#29 implementado y validado localmente (22/09/2026); evidencia en `docs/issue-30/`.

Un logro describe una meta compartida, pero cada persona puede llevar un avance diferente.
Por eso el objetivo pertenece a `Logro` y el contador a `AchievementProgress`. `UserLogro` mantiene
su significado anterior: la concesión confirmada. Esta separación evita que una solicitud
pendiente o alcanzar un contador otorguen puntos sin la revisión acordada.

Tipo, secreto y temporada son propiedades independientes. Tres columnas permiten combinarlas
sin crear un enum distinto para cada combinación posible. Los registros antiguos reciben
valores conservadores: estándar, sin secreto y sin objetivo cuantitativo.

Una actualización atómica calcula y guarda el contador en una única operación de base de datos.
Leer 2, sumar 1 en JavaScript y escribir 3 desde dos peticiones simultáneas perdería uno de los
incrementos. La suma en PostgreSQL sobre la fila bloqueada conserva ambos; aplicar allí los
límites mantiene el contador entre cero y su objetivo también con concurrencia.

La visibilidad es una regla del servidor. Ocultar un título con CSS dejaría el contenido completo
en la respuesta de red. La representación censurada utiliza una lista de campos permitidos:
identificador y marca de secreto bloqueado. Así tampoco se filtran campos futuros por un spread
accidental. Deben revisarse los textos copiados en propuestas y resoluciones, además del catálogo.

El revelado consulta concesiones históricas del logro, sin limitarse a la temporada activa. De
ese modo empezar una temporada nueva reinicia el contexto de avance estacional, pero no vuelve
a esconder un secreto ya descubierto. El contador parcial nunca sustituye a esa concesión.

Las reglas confirmadas usan enteros, exigen llegar al objetivo antes de conceder y cierran el
contador cuando existe la concesión. La comprobación y la escritura deben compartir una
transacción: comprobar el objetivo fuera de ella permitiría que otra petición redujera el valor
justo antes de conceder. Un bloqueo transaccional por el par logro/persona hace que una operación
espere a la otra; la segunda vuelve a consultar el estado confirmado por la primera.

El incremento es un comando, no una sustitución del valor. Repetir `delta: 1` suma otra unidad,
por lo que la interfaz impide el doble envío y no reintenta automáticamente una escritura tras
un error de red. Primero vuelve a consultar el contador real para saber qué terminó persistido.


## 7.7 — Leer el progreso de la temporada original de una solicitud

Al revisar una solicitud antigua, el administrador necesita ver el progreso del periodo que la solicitud conserva en `seasonId`. La lectura ordinaria de progreso usa la temporada activa: reutilizarla aquí mostraría otra edición si el equipo ya empezó una temporada nueva.

El detalle `GET /equipos/:slug/admin/solicitudes/:id` sigue protegido por sesión, rol TEAM_ADMIN y filtro de equipo. Después de encontrar la solicitud autorizada, consulta contador y concesión por la misma combinación `(userId, logroId, seasonId)`. Devuelve `progress` mediante el `progressDTO` existente y `season` con nombre/estado. Un logro estándar devuelve progreso nulo; un logro permanente no tiene temporada. Esta información es una lectura, no concede el logro ni modifica contadores.

Reutilizar el cálculo de estados evita otra definición de «objetivo alcanzado» o «concedido». La concesión continúa verificándose en el servidor al resolver; el dato mostrado no sustituye esa comprobación porque puede cambiar entre lectura y acción.

Verificación del 2026-09-24: compilación backend PASS y pruebas HTTP en base Windows aislada. Se comprobó una temporada cerrada con contador 7 frente a 2 en la activa, que una concesión activa no convierte el historial anterior en concedido, y que la concesión original sí cambia ese estado. También estándar/permanente, 401/403/404 y aislamiento. Evidencia: [QA de 7.7](phase-7.7/qa/http-results.json). Sin migración ni cambios de schema.


## Perfil global y alias propios — Phase 7.8

La identidad de una persona vive en `User` (`firstName`, `lastName`); cómo aparece en un equipo vive en `TeamMembership.displayName`. Cambiar la primera no modifica los alias. Guardar un alias vacío se normaliza a `null`: hay una sola representación de «sin alias», y `publicName` recupera nombre/apellidos o el fallback estable existente.

`GET /auth/profile` consulta exclusivamente la cuenta identificada por la sesión. No recibe un ID de usuario editable. Prisma `select` construye la respuesta con los campos necesarios y evita devolver el hash de contraseña. `satisfies Prisma.UserSelect` comprueba que la selección es válida sin perder la inferencia precisa del resultado en TypeScript.

`PATCH /auth/profile` modifica solo nombre y apellidos. El esquema de Zod reutiliza sus reglas de registro con `pick`, y `strict` rechaza campos adicionales: esto evita *mass assignment*, es decir, que campos enviados arbitrariamente como `isSuperAdmin` o `email` terminen guardándose. La transacción agrupa modificación y lectura de respuesta; `updateMany` permite detectar una cuenta eliminada y responder 401.

`PATCH /equipos/:slug/mi-alias` vuelve a comprobar la pertenencia al equipo y filtra la escritura por usuario de sesión y equipo resuelto. Ser TEAM_ADMIN no concede aquí permiso para editar a otros. El filtro también protege si la membresía desaparece entre la comprobación y la escritura: cero filas modificadas produce 403, sin recrear acceso. Repetir los mismos valores es idempotente: deja el mismo estado, no crea nuevas membresías.

Pruebas HTTP locales verifican límites, normalización, campos extra rechazados, permisos y separación entre usuarios/equipos. Evidencia completa en `docs/phase-7.8/qa/`. No se retira aún el campo legado `User.displayName`: su escritura en el seed debe eliminarse junto con una migración compatible posterior.


## Retirar un campo legado sin perder identidad — cierre técnico 7.8

Una migración **aditiva** introduce los campos nuevos manteniendo el antiguo durante la transición. La retirada posterior completa el proceso: primero buscar lectores/escritores, adaptar el seed y comprobar los datos; después eliminar la columna y regenerar Prisma Client. Las migraciones históricas permanecen: una base nueva necesita recorrer también la historia anterior.

Aquí `User.displayName` ya no alimentaba las lecturas. El alias vive en `TeamMembership.displayName`; el nombre global en `firstName`/`lastName`. Un alias vacío puede ser una decisión reciente del usuario: copiar otra vez el legado lo desharía. Tampoco podemos dividir un apodo para inventar un nombre y unos apellidos reales.

Por eso la nueva migración comprueba que cada texto antiguo no vacío ya esté representado por el nombre global o por un alias del usuario. Si alguno no lo está, aborta antes de retirar la columna. `BEGIN`/`COMMIT` agrupan la comprobación y el cambio; los bloqueos impiden que una escritura cambie la identidad entre ambos. En la base local los 13 valores estaban conservados en alias; no se rellenaron identidades incompletas. Los resultados de aplicación y pruebas se documentan en [la evidencia](phase-7.8/LEGACY-CLEANUP.md).

`prisma generate` actualiza el cliente tipado; no migra PostgreSQL. `prisma migrate deploy` aplica el SQL versionado; no ejecuta el seed. Son responsabilidades distintas. Comprobar los tipos del seed tampoco lo ejecuta ni restablece contraseñas.


## Temporadas: transacciones y escrituras concurrentes — cierre funcional 7.9

Una **máquina de estados** define qué cambios se permiten: una temporada planificada puede activarse; una activa puede cerrarse; una cerrada no se reactiva. Las fechas describen el periodo, pero no cambian esos estados automáticamente.

La transacción permite cerrar una edición y activar otra como una sola operación: o se guardan ambos cambios o ninguno. Sin embargo, dos transacciones pueden leer el mismo estado antes de escribir. Por eso activar y cerrar bloquean primero la fila del equipo mediante `SELECT ... FOR UPDATE`: la segunda petición espera y consulta después el estado que dejó la primera. Bloquear el equipo, en lugar de cada temporada por separado, coordina incluso acciones dirigidas a dos ediciones distintas. El índice único parcial continúa garantizando que no existan dos activas en ese equipo.

Prisma parametriza la consulta con su plantilla SQL; el identificador no se concatena como texto ejecutable. El bloqueo termina con la transacción y no detiene operaciones de otros equipos. Solo coordina estas transiciones administrativas: no implica congelar los rankings ni cambiar la lógica existente de concesiones.

Crear una temporada también puede sufrir una carrera: dos peticiones ven un nombre libre y ambas intentan insertarlo. La restricción única de PostgreSQL decide cuál lo consigue. Capturamos el error Prisma `P2002` y devolvemos `409 Conflict`, un conflicto que la interfaz puede explicar, en lugar de un error inesperado 500.

Las fechas se validan **antes de convertirlas**. Convertir directamente con `Date` puede aceptar valores como `null` o números. El contrato exige texto ISO con zona horaria; después se transforma a `Date` y se comprueba que el fin sea posterior al inicio. El formulario recoge días y los convierte a ISO; no envía objetos Date por JSON.

El ranking reutiliza la suma existente: permanentes más concesiones de la temporada elegida. Sin activa, Actual contiene solo permanentes. Cerrar conserva el periodo de las concesiones, pero el histórico no es una fotografía inmutable: nuevas concesiones permanentes o aprobaciones de solicitudes antiguas pueden modificarlo. La conservación ante bajas de jugadores sigue en su plan propio.

Contratos y pruebas: [backend](phase-7.9/BACKEND.md), [plan de entrega](phase-7.9/PLAN.md).


## Propuestas: cinco pendientes por jugador y equipo — ajuste previo a media

El límite se aplica a la pareja `(userId, teamId)`: cada jugador puede tener hasta cinco propuestas `PENDING` en cada equipo donde participa. Otros jugadores del mismo equipo tienen sus propios cinco; las propuestas del mismo jugador en otro equipo no se suman. Las propuestas `ACCEPTED` y `REJECTED` no ocupan estas plazas. Es distinto del límite de tres borradores por persona, que aún no está implementado.

En `POST /equipos/:slug/propuestas`, comprobar `count` y crear por separado permitiría una carrera: con cuatro pendientes, dos envíos podrían leer cuatro y ambos crear, terminando en seis. La transacción bloquea primero la fila de `TeamMembership` de ese jugador y equipo con `SELECT ... FOR UPDATE`. Mientras una petición la mantiene bloqueada, la otra espera. Cuando continúa, vuelve a contar y ve el resultado confirmado por la primera. Si ya hay cinco, responde `409 Conflict`; la transacción no crea otra propuesta. La misma consulta comprueba que la membresía siga existiendo después del middleware.

Se bloquea esa relación concreta para no hacer esperar a jugadores distintos ni a equipos distintos solo por compartir un equipo o una cuenta. PostgreSQL libera el bloqueo al confirmar o deshacer la transacción. Cuando se implemente el envío de borradores a revisión, ese nuevo camino deberá usar la misma coordinación antes de pasar a `PENDING`; proteger solo el `POST` actual no bastará entonces.

La compilación TypeScript del backend pasó el 2026-09-28. No se ejecutó una prueba HTTP de concurrencia: Docker/PostgreSQL local no estaba disponible (`docker ps` no pudo conectar al motor), y no se arrancó infraestructura. Tampoco se han implementado aún borradores, verificación de imagen lista ni la eliminación administrativa del jugador; dependen de su diseño y almacenamiento respectivos.


## 7.10 — Adaptador de almacenamiento de objetos

Un **almacén de objetos** conserva bytes bajo una clave interna; PostgreSQL conservará después la relación de esa clave con un logro, logo o avatar. El backend es el único cliente S3. El navegador pedirá una imagen a una ruta autorizada del backend, todavía pendiente de diseñar; no recibe credenciales ni una URL directa del bucket.

`ObjectStore` reúne `put`, `get`, `head` y `delete`. Esta capa se llama **adaptador** porque traduce un contrato pequeño de la aplicación a comandos del SDK S3. SeaweedFS 4.47 es el destino local; el endpoint, región, bucket y credenciales se configuran por entorno para poder probar el mismo contrato frente a R2 en una migración futura. Que dos servicios hablen S3 no garantiza compatibilidad de todas sus funciones: hay que repetir las pruebas necesarias contra cada destino.

La configuración se valida **al crear el adaptador**. Es una excepción deliberada al fail-fast global: el backend actual aún no monta rutas de media y debe poder arrancar sin S3. Cuando se conecten esas rutas, la creación del adaptador durante el arranque exigirá las variables y fallará claramente si faltan. `S3_FORCE_PATH_STYLE=true` dirige el nombre del bucket a la ruta del endpoint local. `requestChecksumCalculation: WHEN_REQUIRED` evita imponer checksums opcionales propios de AWS a SeaweedFS, conservando los obligatorios para una operación.

`get` devuelve un **flujo de lectura**, que permite enviar la imagen por partes sin copiarla entera en memoria. Un objeto ausente produce `null`; un error de permiso o de servicio se propaga. La comprobación de permisos del usuario ocurrirá **antes** de llamar a `get` o de responder a un ETag en la futura ruta. `put` recibe por ahora bytes procesados (`Uint8Array`) y registra su longitud; este bloque todavía no acepta subidas del navegador ni procesa imágenes.

Prueba local del 2026-09-28: TypeScript compiló; una prueba `node:test` ejecutada directamente contra SeaweedFS guardó, consultó, leyó y borró un objeto temporal, comprobó el contenido y recibió 403 con una firma incorrecta. `finally` retiró el objeto incluso si fallaba la prueba. El 2026-09-29 se guardó otro objeto con el SDK, se recreó solo el contenedor conservando el volumen y el SDK recuperó los mismos bytes y ETag; después lo borró. Así distinguimos **vida del contenedor** (reemplazable) de **vida del volumen** (persistente). [Evidencia y comando de integración](media/LOCAL-SETUP.md).


## 7.10 — Recepción por flujo: ensayo de Busboy

Un formulario `multipart/form-data` separa archivos y campos mediante una frontera (*boundary*) indicada en las cabeceras HTTP. Busboy interpreta esa estructura y entrega un flujo de bytes por archivo. Recibir por flujo permite escribir fragmentos en disco conforme llegan; `pipeline` coordina lectura y escritura, transmite errores y aplica **backpressure**: el receptor adapta el ritmo a la escritura en vez de acumular indefinidamente datos en memoria.

El 2026-10-12 instalamos Busboy 1.6.0 y sus tipos 1.5.5 y escribimos un ensayo aislado en `src/experiments/busboyCompatibility.test.ts`. Su receptor usa un directorio aleatorio y nombre interno, sin convertir el nombre enviado por el cliente en una ruta. En caso de error, una señal `AbortController` detiene los flujos; después esperamos a que se cierren y eliminamos el temporal. En Windows borrar antes de que termine la escritura puede fallar por tener el archivo abierto.

Hay una frontera sutil: Busboy emite `limit` al alcanzar su `fileSize`. Para aceptar exactamente los 10.000.000 bytes acordados, el ensayo configura 10.000.001 y rechaza al detectar ese primer byte extra. Comprobar ambas fronteras evita cambiar sin querer el límite del producto.

Las ocho pruebas pasaron: mismos bytes, máximo exacto, un byte extra, multipart incompleto, error del flujo, archivo extra, campo extra y dos recepciones simultáneas con temporales distintos. Cada caso comprobó limpieza. Es una prueba de transporte con bytes sintéticos, **no** de imagen JPEG real: el MIME declarado no valida el contenido. Todavía faltan el diseño de rutas/permisos/admisión, HTTP real y el procesador. [Resultado y alcance](media/T02-02-BUSBOY.md).


## 7.10 — Procesamiento: ensayo de Sharp

Recibir un archivo no comprueba su contenido. Sharp decodifica imágenes y permite orientarlas, convertir el color, ajustar dimensiones y volver a codificarlas. El ensayo del 2026-10-12 usa Sharp 0.35.5 en Windows con imágenes generadas por código; su prototipo todavía no participa en las rutas ni en la cola de la aplicación.

La **orientación EXIF** puede indicar que los píxeles almacenados deben girarse para mostrar bien la fotografía. Aplicamos `autoOrient()` antes de retirar metadatos: borrar primero esa indicación y mantener los píxeles originales dejaría la foto girada. El **perfil de color ICC** también debe utilizarse antes de eliminarlo, convirtiendo a sRGB para que la salida tenga un espacio de color común. El ensayo probó EXIF/XMP/ICC presentes en origen, ausencia en salida y recuperación de canales después de convertir Display P3 a sRGB.

`resize` con `fit: inside` mantiene la imagen completa y su proporción; `withoutEnlargement` evita inventar detalle al aumentar fuentes pequeñas. Usamos los tamaños pactados, JPEG calidad 85 y PNG sin paleta, conservando transparencia. Para avatar, el ensayo parte de un cuadrado ya elegido; no decide por el usuario su encuadre. Si varios tamaños solicitados dan las mismas dimensiones finales, conservamos una sola variante.

Los límites de bytes y píxeles son independientes. Un JPEG de color uniforme de 24 MP puede ocupar poco en disco y aun así necesitar muchos recursos al decodificarse. El ensayo admite 6000×4000 y rechaza 6000×4001 por superar 24 MP. Esto prueba la frontera funcional, no la memoria máxima ni la capacidad de dos trabajos concurrentes.

Un hallazgo importante: un PNG animado sintético de dos fotogramas se presenta a Sharp como `png, pages=1`. El prototipo recorre los bloques PNG y rechaza `acTL`, la indicación de animación. No basta con confiar en extensión, MIME o número de páginas. El procesador integrado deberá conservar esa condición y completar las comprobaciones de integridad.

Build y 11 pruebas PASS. Imágenes sintéticas, sin originales en disco ni guardado S3. Corpus real, calidad visual, píxeles/perfiles variados, IPTC/GPS y medición de recursos quedan en sus tareas respectivas. [Evidencia del ensayo](media/T02-02-SHARP.md).


## 7.10 — Presupuesto provisional frente a consumo medido

El tamaño comprimido en disco no dice cuánta RAM requiere trabajar con una imagen. Los doce archivos admitidos, de hasta 10 MB, suman 120 MB de entradas temporales. Un fotograma de 24 MP expandido a cuatro canales representa 96 MB de píxeles; dos son 192 MB, además de buffers, códecs, operaciones y servicios. Estas cuentas explican componentes, no máximos totales.

El 2026-10-12 definimos una provisión inicial de 1 GiB para el área temporal, con 1 GiB libre fuera de la proyección de trabajo, y 1,5 GiB adicionales de RAM para media: 1 GiB para el procesamiento conjunto, 256 MiB para SeaweedFS y 256 MiB de margen. Es una reserva para diseñar y medir; todavía no se aplica como límite Docker ni demuestra suficiencia bajo carga. Windows tenía unos 13 GiB libres de RAM y 92 GB libres de disco; el servidor de despliegue deberá medirse por separado.

Esperar en disco mantiene las entradas comprimidas. Solo los trabajos activos decodifican; cada uno genera sus variantes secuencialmente. Dos trabajos no deben convertirse en seis transformaciones nativas paralelas por lanzar todas las variantes a la vez. La futura admisión debe reservar plaza/capacidad antes de recibir, contar restos de limpieza y frenar nuevas entradas si se agota el presupuesto.

La concurrencia de trabajos y los hilos de Sharp son controles distintos. `sharp.concurrency(1)` regula hilos de libvips por imagen; el máximo global de dos trabajos requiere coordinación propia. `sharp.cache({ memory: 32, files: 0, items: 100 })` acota la caché de operaciones como ajuste inicial, no toda la RAM del proceso. Medir solo el heap JavaScript omite memoria nativa: necesitamos RSS/memoria de procesos y contenedores, además de tiempo y disco temporal pico.

T02.02 cierra el diseño provisional. T04/T05/T08 medirán el recorrido integrado con dos entradas máximas, diez pendientes, cancelaciones y fallos. Si el presupuesto no basta, se revisa antes de habilitar uso real. [Presupuesto, alcance y plan de medición](media/T02-02-RESOURCES.md).


## 7.10 — Cola persistente y registro de trabajo

Un **trabajo** es el encargo de recibir/procesar/asociar una imagen, con un identificador y un estado. El archivo temporal conserva sus bytes; el registro del trabajo en PostgreSQL conserva quién lo pidió, su destino y lo que ha ocurrido. Al volver a la página el frontend podrá consultar ese registro en vez de depender de una lista que existía solo en el navegador.

Elegimos PostgreSQL existente para una cola propia de esta escala. El backend buscará trabajos admitidos/listos, tomará un turno y ejecutará el procesamiento. PostgreSQL no ejecuta Sharp; permite coordinar y conservar datos. Tomar un trabajo exige comprobar/asignar en una transacción corta para que dos ejecutores no lo procesen a la vez. La transacción no debe permanecer abierta durante la subida ni durante Sharp.

La durabilidad del registro no significa reejecución automática tras reinicio. El contrato acordado pide comprobar qué se completó, conservar éxitos reales e indicar interrupción/reenvío manual en afectados. Navegar después de recibir una entrada completa no equivale a cancelar; cortar una transferencia incompleta sí puede producir fallo de recepción.

Una imagen lista exige que sus variantes estén guardadas y asociadas correctamente. Generar los bytes o guardarlos en S3 sin cambiar aún la referencia no es el final del trabajo. Que la imagen de un borrador esté lista tampoco envía automáticamente ese borrador a revisión.

Al cerrar este primer diseño se definieron mecanismo y estados, todavía sin modelos Prisma ni endpoints. El registro se implementó en el bloque posterior descrito a continuación; siguen pendientes ejecución/cancelación, admisión/orden, reinicio y avisos. [Diseño parcial T02.03](media/T02-03-JOBS.md).


## 7.10 — Registro MediaJob: primera pieza persistente real

Actualización posterior del 2026-10-12, por petición de construir por piezas: añadimos `MediaJob` y su enum, una migración aditiva y funciones internas para registrar/consultar. El cambio de esquema crea una tabla nueva; las relaciones inversas de User/Team son propiedades del cliente, no columnas nuevas en esas tablas. La base aislada conserva los datos existentes y no se resembra.

`registerReceivingMediaJob` crea el registro en RECEIVING: todavía no significa que hayan llegado bytes o que se haya iniciado Sharp. `resourceKey` identifica un destino canónico resuelto por el backend. `activeResourceKey` copia esa clave mientras el trabajo está activo y tiene una restricción UNIQUE; PostgreSQL decide cuál de dos registros simultáneos consigue reservarla. En los terminales se pone a null, permitiendo otro trabajo mientras se conserva el anterior.

Un CHECK adicional exige coherencia entre estado, reserva y completedAt. No permite liberar la clave dejando el estado activo. Este CHECK no conoce si un proceso nativo está vivo: la futura transición terminal tiene que demostrar que paró antes de liberar el turno. El registro tampoco implementa todavía las plazas globales 2 + 10.

Prisma con adapter-pg devolvió P2002 en metadatos de `driverAdapterError.cause.constraint.fields`, incluyendo comillas SQL. La primera prueba de concurrencia detectó que el conflicto no se convertía en AppError 409. El helper reconoce tanto esa forma como `meta.target` para la clave exacta de reserva, preservando otros errores.

`findMediaJobForOwner` filtra propietario y UUID en la propia consulta y selecciona solo campos permitidos de respuesta. `satisfies Prisma.MediaJobSelect` comprueba la selección sin perder los tipos inferidos. Un `Pick` de `Prisma.TransactionClient` permite usar el mismo helper dentro de la futura transacción de admisión; no debe escapar a una escritura separada. Las rutas futuras tomarán ownerId de sesión y resolverán destino/permisos, no aceptarán esos valores libremente del cliente.

Migración local aplicada, Prisma Client generado, build/seed:check PASS. Prueba real contra PostgreSQL: registro recuperado desde otra conexión, lectura ajena nula, reserva concurrente 409, alcance de equipo, CHECK, liberación terminal simulada y FK de propietario. 8/8 PASS contando la prueba contenedora; fixtures propias retiradas y recuentos originales conservados. [Código, comandos, resultado y pendientes](media/MEDIA-JOB-REGISTRY.md). El siguiente bloque implementa el ejecutor aislado; admisión global e integración de imágenes siguen pendientes.

## 7.10 — Ejecutor: controlador, trabajador y Sharp

El ejecutor recibe una ruta temporal interna y el tipo de imagen. Crear un **proceso hijo** con `fork()` permite que un Node distinto del servidor ejecute Sharp. Sigue perteneciendo a la aplicación; no necesita otro contenedor. El **controlador** arranca y vigila; el **trabajador** transforma. **IPC** es el canal para enviarse mensajes: ruta/tipo al entrar, manifiesto o código de error al salir. Los bytes de las variantes quedan temporalmente en disco, no viajan por mensajes ni se guardan aún en S3.

`mediaImageProtocol.ts` define el contrato con Zod. Los tipos TypeScript ayudan mientras programamos; `safeParse()` también comprueba el mensaje recibido en ejecución. Un manifiesto enumera nombre, dimensiones, bytes y formato de cada salida. Describe archivos generados, no una imagen publicada ni un `MediaJob.SUCCEEDED`.

`mediaImageProcessing.ts` limita lectura a 10 MB y decodificación a 24 MP, comprueba firma/formato estático y aplica las reglas ensayadas: orientación, sRGB, retirada de metadatos, JPEG 85 y PNG sin paleta. `await` dentro del bucle genera una variante después de otra: no lanza tres transformaciones a la vez. Un `Set` de tamaños efectivos evita repetir resultados cuando la fuente es pequeña. Avatar exige entrada cuadrada; elegir/mover el encuadre en el frontend sigue pendiente, sin recorte central automático.

`mediaImageWorker.ts` aplica `sharp.concurrency(1)` y caché de 32 MB. Son controles de libvips, no topes de RAM total ni dos puestos globales de cola. Solo ejecuta un encargo y sale. Si se desconecta IPC del padre, sale también: así no continúa trabajando sin controlador. Pueden quedar temporales si el padre desaparece; el futuro reconciliador deberá comprobar/retirar restos.

`mediaImageExecutor.ts` devuelve una **promesa**, el resultado que llegará después. Un temporizador limita procesamiento a 30 s desde el mensaje `started`; otro vigila el arranque. Un `AbortSignal` representa petición explícita de cancelación, sin ligarlo aquí a navegar o cerrar una pestaña. `failure ??= code` conserva la primera causa aunque después ocurran más señales. Pedir `SIGKILL` no resuelve la promesa: esperamos `close` para confirmar que terminaron proceso/canales. Solo entonces aceptamos el manifiesto o limpiamos/rechazamos. Este orden permitirá que la futura cola no libere un puesto mientras Sharp siga vivo.

Cada ejecución usa `mkdtemp()` para crear un intento único `variants-*`. La limpieza verifica su ruta absoluta antes del borrado recursivo; no alcanza el directorio del job, la entrada ni un intento anterior. `writeFile` con `wx` evita sobrescribir un archivo existente. Si no se puede borrar, el error lleva una referencia interna de limpieza pendiente: reintentar limpieza no debe volver a transformar. La entrada comprimida sigue siendo temporal, bajo responsabilidad del ciclo de asociación, no un original guardado como producto.

Validación: build PASS, 11/11 pruebas compiladas con procesos Sharp reales y una prueba dirigida de desarrollo TS PASS. Se verificaron salidas, orientación/transparencia, límites/rechazos, cancelación, timeout, caída y pérdida de IPC. Las pruebas confirman que el PID propio ya no existe al terminar; nunca detienen procesos ajenos. El caso que desconecta IPC expresamente usa `exit` para comprobar muerte, mientras el ejecutor normal conserva IPC hasta `close`. [Evidencia y límites](media/MEDIA-IMAGE-EXECUTOR.md). Sin DB/S3/HTTP ni máximo global implementados; comprensión antes de conectarlo a la cola.

## 7.10 — Tomar un turno sin duplicar el trabajo

Tras comprender el ejecutor, implementamos la **toma persistente** de trabajos `QUEUED` existentes. Es la decisión de asignar trabajo, todavía sin arrancar Sharp. `activeResourceKey` reserva un destino concreto; `processingSlot` reserva uno de dos puestos de capacidad global. Tener destinos distintos no autoriza empezar todas las imágenes a la vez.

`claimNextQueuedMediaJob()` abre una **transacción**: un bloque de operaciones que confirma todo con COMMIT o revierte todo si falla. Consultar puestos, elegir candidato y asignarlo necesitan coordinarse; hacer esas acciones por separado permite que dos procesos vean simultáneamente el mismo puesto libre.

El **advisory lock** es un bloqueo acordado por nuestra aplicación dentro de PostgreSQL. Todos los tomadores usan el mismo par `(7100, 1)` y se turnan para decidir. `pg_advisory_xact_lock` libera el bloqueo con la transacción; no queda retenido durante Sharp. `ReadCommitted` permite que las consultas posteriores al bloqueo vean lo confirmado por el tomador anterior. Dos puestos asignados podrán trabajar a la vez cuando se conecte el ejecutor.

`orderBy: [{createdAt: "asc"}, {id: "asc"}]` elige el más antiguo entre los QUEUED disponibles y desempata fechas iguales. Un RECEIVING no está listo; las reglas de orden durante transferencia/admisión se completarán después. La actualización también exige que siga QUEUED al escribir: esta condición evita actuar sobre un candidato que otro código ya cambió.

`randomUUID()` genera `executionToken`, la identidad del intento. No es una contraseña para el usuario ni un permiso público. La futura transición tendrá que comparar este token antes de aceptar un resultado; crearlo hoy no implementa todavía ese rechazo. `processingStartedAt` es la hora DB de toma/inicio de fase, distinta del comienzo de Sharp que controla los 30 s del ejecutor.

La migración añade `UNIQUE(processingSlot)` y **CHECK**: solo puestos 1/2; PROCESSING/PUBLISHING exigen puesto/token/fecha; RECEIVING/QUEUED no los tienen; terminales liberan puesto y pueden conservar historial. Son otra barrera si una ruta olvidase el protocolo de bloqueo. No conocen si un proceso sigue vivo: finalizar y liberar seguirá exigiendo cierre confirmado. PUBLISHING conserva capacidad hasta el final del recorrido activo.

Pruebas reales: ocho clientes piden turno juntos y solo dos lo consiguen, con UUIDs distintos; el resto recibe null. Se prueban orden, recepción incompleta, publicación, DTO permitido y restricciones. Para comprobar un CHECK, la fixture debe violar solo ese CHECK; para comprobar UNIQUE, necesita dos filas distintas. La revisión y el primer ensayo detectaron esos errores en las fixtures y se corrigieron sin cambiar las garantías de la migración.

Migración aditiva solo en la base Windows aislada; cliente generado, build/seed:check PASS, toma 5/5 y registro anterior 8/8 PASS. Snapshot original conservado y fixtures propias retiradas. [Código, comandos y alcance](media/MEDIA-JOB-CLAIMS.md). Admisión 10/180 s, enlace con Sharp, resultados/cancelación y recuperación pendientes; comprensión antes del siguiente bloque.

## 7.10 — Enlazar una toma con Sharp y confirmar su resultado

`executeClaimedMediaJob()` une la toma ya explicada con el ejecutor. Primero registra `executorStartedAt` solo si el trabajo sigue PROCESSING, coinciden token/puesto/destino/fecha y el marcador todavía es null. Esta escritura condicional es **compare-and-set (CAS)**: «cambiar únicamente si sigue cumpliendo estas condiciones». Una llamada duplicada pierde ese CAS y no arranca otro Sharp. La marca reserva el comienzo; no prueba que el proceso nativo ya esté trabajando.

La ruta se obtiene de una raíz temporal confiable y del UUID del trabajo. Se comprueban raíz, carpeta e `input.tmp` existentes y sin symlinks; no se crean carpetas ni se acepta una ruta del navegador. Esa preparación depende del receptor futuro, todavía sin implementar. Kind/entrada y, después, directorio/manifiesto de salida quedan como datos internos en MediaJob, sin ampliar su DTO de lectura propia.

`await executeMediaImage(...)` espera fuera de una transacción. Al volver sabemos que cerró el trabajador y se validaron las variantes. Otra escritura CAS puede pasar a PUBLISHING y guardar el **manifiesto**, la lista técnica de nombres/dimensiones/formato/bytes. Los archivos siguen en disco temporal; la BD guarda su descripción, no sus bytes ni metadatos personales. PUBLISHING mantiene turno/destino: todavía falta guardado verificado en el almacén y asociación para SUCCEEDED.

Un fallo/cancelación del ejecutor permite registrar FAILED/CANCELED después de cerrar o si nunca hubo proceso. Se liberan puesto/reserva y se guarda causa segura. Si cancelar llega después de que Sharp haya generado todo pero antes de la entrega, primero confirmamos CANCELED y anotamos limpieza pendiente; solo después retiramos las variantes de este intento. Borrar antes de confirmar permitiría perder archivos si falla el CAS o la base.

La limpieza no cambia una cancelación ya confirmada en fallo: se conserva `cleanupPendingDirectory` cuando no se puede comprobar/borrar, y el futuro reconciliador revisará la ruta antes de actuar. No se borra input ni resultados anteriores. `Prisma.DbNull` deja NULL de SQL en una columna JSON; `Prisma.JsonNull` sería JSON literal null, un valor distinto que no cumple el CHECK de objeto.

La señal local es una solicitud. Si se inició la entrega y PUBLISHING gana, devolvemos `too_late` y conservamos el resultado. Si una escritura DB falla, no se convierte un Sharp exitoso en un fracaso inventado ni se liberan reservas: quedan para reconciliar. Una conexión perdida puede dejar commit incierto; no borrar ni reejecutar automáticamente sin comprobar qué se confirmó.

Build/seed:check PASS; 20 migraciones en base aislada. Enlace 12/12, toma 5/5 y registro 8/8 PASS, datos originales conservados. Procesos Sharp reales; Proxy de acceso DB y wrapper temporal de test permiten forzar fallo y cancelación después del cierre, sin API extra. [Evidencia y límites](media/MEDIA-JOB-EXECUTION.md). Cancelación entre instancias, HTTP, S3, asociación, reinicio y limpieza durable siguen pendientes. Comprensión antes del siguiente bloque.

### Admisión antes de recibir y reloj de espera — 2026-10-13

`admitReceivingMediaJob` reserva una de diez plazas antes de transferir bytes. Cuenta RECEIVING y QUEUED; ambos esperan disponer de un puesto activo. Usa el mismo bloqueo de decisión que `claimNextQueuedMediaJob`, de modo que contar y registrar no puedan competir con una toma sin coordinarse. No mantiene la transacción durante la subida. Dos puestos activos no permiten abrir dos subidas adicionales cuando ya hay diez esperas.

`markMediaJobQueuedAfterClosedReceipt` es el acuse interno del receptor: exige propietario y cierre confirmado, después fija queuedAt y queueExpiresAt con el reloj de PostgreSQL. Los 180 s empiezan aquí, no al registrar RECEIVING. El booleano es una precondición comprobada en runtime, no una prueba física: el futuro receptor debe cerrar sus flujos y validar la entrada antes de usarlo. La cola ordena los archivos completos por queuedAt/id; una subida lenta no detiene otro archivo que ya está completo.

Un reintento mientras sigue QUEUED devuelve el mismo estado sin renovar el reloj. Si ya venció, primero se confirma FAILED/WAIT_TIMEOUT y después se responde 409. Retornar un resultado discriminado dentro de la transacción y construir el error fuera permite guardar el vencimiento incluso cuando la petición no tiene éxito. Una excepción SQL real, en cambio, puede abortar la transacción: no se puede recuperar una violación UNIQUE capturándola y seguir usando ese tx; se traduce fuera.

`expireQueuedMediaJobs` solo termina QUEUED. No libera RECEIVING por edad porque todavía puede estar escribiendo. Las fechas no demuestran cierre; tampoco acabar la reserva equivale a borrar su archivo. El barrido conserva rutas conocidas, pero el receptor futuro deberá persistirlas antes de encolar o el limpiador derivarlas con raíz confiable/UUID. Falta ese receptor, la limpieza física y el controlador que revise plazos automáticamente; el vencimiento actual ocurre al invocar las funciones.

Admisión8/8, toma5/5, enlace12/12, registro8/8 y build/seed:check PASS; 21 migraciones en base aislada, datos conservados. [Evidencia](media/MEDIA-JOB-ADMISSION.md). Este bloque no habilita imágenes de la app ni cierra 7.10; esperar comprensión antes de receptor/controlador.

### Receptor aislado: funciones y separación de capas — 2026-10-15

`mediaUploadReceiver.ts` contiene `receiveMediaUpload(source, headers, options): Promise<MediaUploadResult>`. `source` es un Readable; `headers` permite a Busboy conocer el boundary de multipart; `options` contiene raíz privada, UUID del trabajo y señal AbortSignal opcional. El resultado contiene directory/inputPath/bytes/inputFormat. Es una promesa porque recibir/escribir/cerrar son operaciones asíncronas; el llamador debe esperarla antes de confirmar la recepción en Prisma.

La función contiene dos pipelines: source→parser y file→guard→writer. La primera interpreta la envoltura multipart; la segunda escribe solo los bytes del archivo, sin las cabeceras/fronteras. `createImageGuard` es un Transform: recibe fragmentos, suma bytes, conserva ocho bytes de prefijo para detectar PNG/JPEG y entrega los fragmentos al writer. No construye una copia completa de la imagen en memoria ni decodifica con Sharp. El límite Busboy MAX+1 y el contador hacen inclusivo el máximo de 10.000.000 bytes.

`waitForClose` distingue destroyed de cierre confirmado. En el catch se aborta, se esperan pipelines y closes, después `cleanOwnedWorkspace` verifica alcance/canonicalidad y retira solo input propio. `rmdir` vacío conserva un archivo que no creó esta llamada; registra cleanupPendingDirectory en lugar de usar borrado recursivo. `finally` retira listeners externos. El contrato exige fuentes que emiten close: la firma Readable por sí sola no demuestra que un stream arbitrario lo haga.

`fail` conserva la primera causa y usa setImmediate para diferir el abort fuera del ciclo interno de Busboy. La cancelación en microtask produjo un fallo nativo durante la implementación; la suite con setImmediate cubre también el campo incorrecto. Tras el último await de lstat se vuelve a comprobar la señal para no devolver éxito si la cancelación llegó durante esa comprobación.

`mediaUploadProtocol.ts` contiene esquemas Zod y MediaUploadError con códigos/mensajes seguros. Hereda de Error; no es AppError. La futura capa HTTP deberá traducirlo y mantener rutas privadas fuera de la respuesta. Preflight deja la fuente intacta: ese futuro adaptador tendrá que cerrarla/drenarla y resolver el registro RECEIVING correspondiente. `receiveMediaUpload` no actualiza DB y su éxito no equivale a QUEUED ni a imagen publicada.

Tres archivos nuevos de backend (protocolo/receptor/test), build y 14/14 pruebas PASS; sin cambio de DB ni servicios. [Evidencia](media/MEDIA-UPLOAD-RECEIVER.md). Falta enlazar admisión/receptor/ruta temporal/QUEUED, controlador, presupuesto de disco y HTTP real. Esperar comprensión antes de ese enlace.

### Enlace del receptor con Prisma: fachada, claim y CAS — 2026-10-15

`receiveAndQueueMediaJob` en mediaUploadIntake.ts reúne las llamadas sin mezclar responsabilidades: admite en DB, toma un recibo, espera el archivo cerrado y confirma QUEUED. Input/options entran como unknown y Zod los estrecha a tipos válidos. El UUID del trabajo lo crea la admisión; no lo elige el navegador. La fachada observa error/close/abort antes de cualquier await de DB para no perder una desconexión mientras espera la consulta.

`startMediaJobReceipt` en mediaJobReceipts.ts hace un UPDATE condicionado a RECEIVING sin token previo. Asigna receiptToken aleatorio, receiptStartedAt/reloj DB, inputDirectory y imageKind. Devuelve MediaJobReceiptClaim: identidad completa de ese intento, no un permiso de sesión ni una prueba de archivo existente. El esquema comprueba ruta absoluta/normalizada con UUID como basename; la raíz real se validó antes en la fachada. Las consultas SQL raw actualizan updatedAt explícitamente: @updatedAt de Prisma no se ejecuta por escribir SQL manual.

Los campos del recibo son nullable para las filas históricas; un CHECK de migración exige token/fecha ambos presentes o ambos nulos y ruta/tipo si hay token. La fachada y el acuse son más estrictos que esa compatibilidad histórica: un nuevo recorrido real exige claim completo. Un token ya asignado impide iniciar otro receptor para la misma fila.

La operación lenta `await receiveMediaUpload` ocurre fuera de cualquier transacción. Después, `markMediaJobQueuedAfterClosedReceipt({ claim, receiverConfirmedClosed: true })` compara id, ownerId, teamId, resourceKey, token, fecha, ruta y tipo en el WHERE. Ruta/tipo/QUEUED/fechas se confirman en el mismo UPDATE. Si no coincide ninguna fila, hay conflicto o repetición: solo el mismo claim QUEUED vigente es idempotente, sin reiniciar el plazo. `IS NOT DISTINCT FROM` permite comparar teamId nulo en SQL; `= NULL` no sería una igualdad verdadera.

Los try/catch del receptor y de la persistencia tienen límites distintos. Un error de Busboy tras cierre puede convertirse en FAILED/CANCELED por `finishMediaJobReceipt`. Si falla Prisma al confirmar QUEUED, la base puede haber confirmado antes de perder la respuesta: se devuelve503 seguro, se conserva el archivo y no se fuerza un terminal. El estado real decide la recuperación posterior. La causa técnica se guarda como propiedad privada no enumerable; no se serializa en el DTO.

`observeSource.stopAndWait` registra el cierre antes de destruir la fuente y lo espera incluso cuando el rechazo llega antes de empezar a leer. `failKnownReceipt` devuelve Promise<never>: guarda el terminal y siempre lanza un AppError; nunca permite continuar por una rama de éxito. Un workspace EEXIST/dudoso conserva reserva; cerrar nuestro source no demuestra que otro escritor haya terminado.

Si la señal se cancela al volver del receptor, antes del handoff a DB, se confirma CANCELED con directorio pendiente y se conserva el archivo para el limpiador futuro. Si se cancela durante el ACK y QUEUED gana, se devuelve too_late; no se borra un input que podría tomar Sharp. Un fallo de admisión antes de devolver ID puede dejar una reserva cuyo UUID todavía no conoce el caller: la reconciliación está pendiente, sin reintento automático.

Enlace14/14, admisión adaptada9/9, toma5/5 y build/seed:check PASS;22 migraciones solo base aislada, recuentos13/2/14/19/0 conservados y temporales propios retirados. [Evidencia](media/MEDIA-UPLOAD-INTAKE.md). Fallos de DB inyectados antes/después de commits reales, no una caída de red real. HTTP/autorización, controlador, plazos/presupuesto/limpieza durable, recuperación y publicación siguen pendientes; esperar comprensión del código del enlace.

### Controlador, publicación y asociación de imagen a catálogo — 2026-10-17

Ahora el recorrido interno se puede ejecutar de principio a fin: `receiveAchievementImage` → intake/cola → `MediaJobController` → `executeClaimedMediaJob` → `publishClaimedAchievementImage` → limpieza. [Mapa de archivos y evidencia](media/MEDIA-ACHIEVEMENT-PIPELINE.md). La petición del usuario agrupa este bloque; la revisión conjunta del código viene después de la implementación.

`mediaAchievementTarget.ts` contiene la fachada del dominio catálogo. Su función recibe la fuente y un destino interno (ownerId, teamId, achievementId), comprueba logro y TEAM_ADMIN contextual y fabrica la resourceKey estable. No acepta un nombre de archivo como destino ni concede ese permiso por tratarse de una imagen. Una propuesta propia tendrá otra fachada con permiso de autor; todavía no se ha implementado. La futura ruta obtendrá ownerId de la sesión, nunca de un campo confiado al navegador. Las consultas son asíncronas: se escucha error del stream antes de esperar DB y se cierra la fuente si se rechaza antes del intake.

`mediaJobController.ts` es una clase que coordina dependencias. El constructor recibe raíz temporal, almacén S3 y cliente DB: es inyección de dependencias, que permite cambiar solo el almacén por un wrapper de fallo en las pruebas. `tick()` comparte una promesa para evitar tomas solapadas de la misma instancia, reclama hasta dos y crea tareas sin esperar a que termine Sharp. `idle()` espera esas promesas; `stop()` activa stopping, aborta señales locales y espera el cierre. Un claim que vuelve después de stop también recibe la señal abortada. El límite entre procesos distintos sigue en PostgreSQL, no en el Map local. Importar el archivo no arranca un bucle; falta conectar el scheduler al arranque/apagado del servidor.

El controlador carga tipo/ruta del recibo persistido en lugar de pedirlos al navegador. El CAS de `executeClaimedMediaJob` exige que coincidan: solo permite además ambos nulos para compatibilidad de las fixtures antiguas, completándolos sin sobrescribir otros valores. `MediaJobPreparationError` identifica un fallo de filesystem anterior al CAS y a la creación del hijo: el controlador puede liberar solo la misma toma con executorStartedAt todavía nulo. Un error incierto después del inicio conserva el puesto; no se puede deducir cierre a partir de una excepción genérica.

`MediaAsset` representa una versión de imagen; sus variantes JSON guardan claves S3, dimensiones, formato, bytes y SHA-256. Los bytes no se meten en PostgreSQL. `Logro.imageAssetId` es la FK que selecciona la versión vigente. La relación compuesta con teamId impide que la BD asocie una imagen de otro equipo. La columna es nullable para conservar los logros legacy: esto no implementa todavía la condición de imagen obligatoria al crear/aprobar. `publisherStartedAt` es otro CAS one-shot para impedir repetir la publicación del mismo claim.

`mediaPublication.ts` separa tres momentos: transacción corta que registra STAGING y todas las claves; operaciones lentas S3 fuera de la transacción; transacción corta de asociación. Las claves incluyen el UUID del trabajo y no se reutilizan entre sustituciones. La resourceKey identifica el destino estable; la clave S3 identifica los bytes de una versión. Si ambas fueran estables, un PUT sobrescribiría la anterior antes de aprobar el cambio y su DELETE posterior podría borrar la nueva. El diario previo a PUT permite localizar incluso una subida parcial.

`publishClaimedAchievementImage` lee archivos regulares con límite, verifica sus hashes, hace PUT secuencial y valida HEAD y GET acotado. ETag no se interpreta como MD5. En la transacción final, SELECT FOR UPDATE bloquea membresía/logro; se revalida TEAM_ADMIN y se cambia asset a READY, la FK del logro y job a SUCCEEDED en la misma operación atómica. Si falta permiso o cambia el destino, se revierte esa transacción y el intento termina sin sustituir la anterior. Solo después del commit se borran las variantes antiguas sin referencias.

`mediaAssetCleanup.ts` es un servicio separado porque borrar sí se puede reintentar sin volver a comprimir. MediaAssetCleanup conserva claves exactas, estado e intentos. Antes de DELETE comprueba RETIRED, namespace derivado de equipo/logro/job y ausencia de referencia; HEAD nulo confirma retirada. Un fallo de borrado deja PENDING, sin revertir SUCCEEDED. `mediaTemporaryCleanup.ts` mueve cleanupPendingDirectory por etapas antes de unlink/rmdir; usa únicamente la salida/pending persistidos, valida canonicalidad y conserva archivos desconocidos. No borra recursivamente todo lo que empiece por variants-.

Una transacción fallida y un acuse perdido son distintos. Si falla antes del commit final con resultado incierto, se conservan PUBLISHING, STAGING, objetos y puesto; todavía falta el reconciliador que pueda resolverlo. Si el commit sí ocurrió, consultar el estado real confirma SUCCEEDED y permite limpiar temporales, aunque el acuse de la llamada se perdiera. Los tests inyectan ambos límites con Proxy alrededor de transacciones reales; no son cortes reales de red ni reinicios de servidor.

Validación final: pipeline18/18 y regresiones ejecución12/12, intake14/14, admisión9/9, toma5/5 (58/58 incluyendo padres), build/seed:check y 23 migraciones al día. Solo base aislada Windows; 13 usuarios/2 equipos/14 membresías/19 logros y 0 jobs/assets/cleanups después de retirar la fixture. Objetos propios retirados y HEAD nulo comprobado. HTTP, lectura privada/cache, scheduler, reconciliación, presupuesto físico, corpus/carga, borradores/propuestas/logo/avatar y UI siguen pendientes; 7.10 no está completa.

### Conectar HTTP y el arranque: routers, leases y caché privada — 2026-10-17

[Mapa y pruebas](media/MEDIA-HTTP.md). El usuario pide conectar el bloque y explicarlo después: ya no basta llamar manualmente tick desde un test. `server.ts/main()` espera `startMediaRuntimeFromEnv()` y solo después abre el puerto. `config/mediaEnv.ts` valida activación, raíz absoluta y Origins; desactivado permite el backend anterior sin S3, activado falla antes de escuchar si faltan servicios o permisos. `.env.example` explica las variables; `.env.ui-windows` local activa media y `dev:media:windows` carga los dos archivos locales sin versionar credenciales.

`MediaRuntime` es la instancia que conserva S3, `MediaJobController`, el temporizador y las recepciones abiertas. `wake()` solicita una revisión al aceptar una entrada; el poll de500ms cubre trabajos que no dispararon wake. Ambos comparten la promesa de tick y los límites siguen en DB: el timer no crea workers por su cuenta ni duplica puestos. `getMediaRuntime()` permite montar rutas antes del arranque sin capturar un null definitivo. Importar el módulo sigue sin arrancar infraestructura.

`routes/equipos.ts` monta `createMediaRouter` después de resolveTeam. `routes/media.ts` aplica auth/caché solo en sus paths, no a todo el router tenant. La subida exige cookie, TEAM_ADMIN contextual y Origin exacto configurado. El equipo y propietario proceden de los middleware; el body solo contiene el archivo. Esta fachada es para catálogo existente; no cambia el permiso futuro de un PLAYER para adjuntar imagen a su propia propuesta.

Antes de admitir, `acquireReceipt()` devuelve un lease: un signal y una función release idempotente. Representa una recepción que el runtime deberá esperar al apagar, no una plaza de la cola DB. La ruta lo adquiere antes del stream y siempre hace release en finally. stop cambia aceptación a false, aborta las señales y espera los release. La capacidad se comprueba con statfs y un recorrido de solo lectura de temporales; se conservan1GiB de presupuesto y1GiB libre adicional, con reserva conservadora360MB. No son límites del sistema operativo ni una medición de RAM. Los archivos desconocidos no se borran: bloquean la recepción para revisión.

`createMediaHttpUploadBridge` crea un PassThrough de64KiB entre req y el intake. pipe transmite contrapresión: si el receptor tarda, se ralentiza la lectura del cliente. No usamos pipeline(req,source), porque destruiría el socket HTTP al rechazar el archivo y el navegador no recibiría el JSON. El parser puede cerrar nuestro source; el adaptador pausa el body y devuelve el error antes de cerrar la conexión. Detecta aborto, cierre incompleto, fallo de red y la desconexión ocurrida durante consultas/lease, además del límite multipart y120s. Una desconexión después del202 no revierte un trabajo ya aceptado.

El POST espera input.tmp cerrado y QUEUED, responde202 y despierta al runtime. 202 significa aceptado para trabajo posterior; el cliente consulta GET estado con el UUID. Ese GET filtra ownerId y teamId en la propia consulta y devuelve una lista permitida de campos; no entrega rutas, tokens ni claves S3. El controlador sigue pasando por toma, proceso Sharp cerrado y publicación verificada antes de SUCCEEDED.

GET imagen comprueba membresía, secreto y referencia vigente, selecciona variante y hace HEAD antes del If-None-Match. Cache-Control private/no-cache permite guardar una copia pero exige revalidación; Vary Cookie separa respuestas por sesión. El ETag combina versión UUID y SHA, de modo que reemplazar cambia el validador aunque los píxeles sean iguales. Sin permiso no se responde304. `mediaImageRead.ts` primea el primer fragmento antes de preparar headers binarios: un error de S3 temprano todavía puede ser JSON503; después de enviar bytes se cierra el stream si falla. Se verifica longitud/hash y se aplica deadline30s, sin cargar la imagen entera en memoria. La caché real de navegador tendrá QA al integrar UI.

`objectStore.ts` añade plazos de conexión/operaciones/cuerpo GET y desactiva reintentos automáticos del SDK. GET devuelve al recibir cabeceras, por lo que también se programa un reloj sobre el cuerpo. `awaitBeforeDeadline` observa promesas que siguen vivas después del timeout y cierra cuerpos tardíos; incluso si la señal ya estaba abortada, el argumento Promise pudo haber iniciado S3 y no puede abandonarse sin observar errores. Timeout de PUT no demuestra que el objeto no se guardó: el diario anterior aPUT conserva sus claves.

Al cerrar el servidor, server.close deja de admitir conexiones, stop cancela y espera recepciones/workers, y un callback espera a que las respuestas HTTP terminen antes de destruir S3. Prisma se desconecta al final porque los trabajos aún lo necesitan para confirmar terminales. El errorHandler evita un segundo JSON si ya salió parte de una imagen; si no salieron headers, elimina tipo/longitud/ETag binarios y fija no-store para el error.

Verificación final HTTP13/13, pipeline18/18 y adaptador1/1, build y seed:check PASS;32/32 incluyendo dos padres. Datos/temporales/objetos de las fixtures retirados, sin nueva migración. Arranque real compilado3001 con media habilitado, health200 e imagen sin sesión401/no-store. Backend y servicios locales existentes quedan activos. Reinicio/reconciliación de commit incierto, limpieza programada/abandono, cancelación distribuida, corpus/carga/RAM, borradores/propuestas/logo/avatar y controles siguen pendientes; no hemos cerrado7.10 ni reanudado la UI.


### 2026-10-17 — Recuperación tras reinicios y trabajos a medias (7.10)

[Mapa de archivos, contrato y evidencia](media/MEDIA-RECOVERY.md). El usuario autoriza implementarlo completo y explicar después. La recuperación reutiliza la cola PostgreSQL; no añade otro servicio.

**Owner técnico y lock de sesión.** El usuario es el dueño funcional de una imagen; MediaRuntimeOwner es el proceso que la está atendiendo. schema.prisma añade esta tabla y los vínculos en MediaJob. acquireMediaRuntimeOwnership, en mediaRuntimeOwnership.ts, usa una conexión pg dedicada para mantener un advisory lock durante toda la vida del runtime. El lock corto de las transacciones de admisión/toma sigue siendo distinto: protege una decisión atómica, no representa la vida del servidor. Si se pierde la conexión exclusiva, el runtime se detiene y health pasa a503; no publica un arranque aparentemente sano ni recupera liderazgo por su cuenta.

**Contexto a través de await.** mediaRuntimeContext.ts usa AsyncLocalStorage: withMediaRuntimeOwner asocia owner y receipt con una cadena de operaciones asíncronas. registerReceivingMediaJob obtiene esos valores dentro del backend; no vienen del body del cliente. runOwned envuelve el intake desde routes/media.ts. Su contador activeOwned evita que un release anticipado convierta un callback todavía vivo en una recepción huérfana. release solicita cierre; el finally del callback demuestra que terminó.

**Registrar antes de permitir trabajar.** En mediaImageExecutor.ts el hijo puede arrancar y anunciar ready, pero no recibe el comando de Sharp hasta que onSpawn confirma el PID y directorio en Prisma. mediaJobExecution.ts hace esa escritura con la identidad completa del intento. Si se pierde ese ACK, el hijo no empieza Sharp; si muere el padre, la desconexión IPC termina el hijo. La recuperación comprueba además que el PID ya no existe antes de liberar un puesto.

**Reconciliar es volver a comprobar.** recoverMediaJobs, en mediaJobRecovery.ts, consulta owners y trabajos; compara el estado real con los callbacks activos y la existencia de procesos. Bajo una transacción corta vuelve a validar y escribe INTERRUPTED solo si sigue siendo recuperable. No repite Sharp. Si el commit final ya dejó SUCCEEDED, READY y referencia, los conserva aunque el caller no recibiera la respuesta. Si no hubo asociación, conserva la imagen anterior y prepara retirada de STAGING con su diario. S3 y el disco no participan en la transacción PostgreSQL: se limpian después, con registros que permiten continuar.

**Limpieza repetible y propiedad.** El receptor escribe .receipt-owner.json solo después de crear su carpeta; un EEXIST no lo autoriza a adueñarse de nada. mediaTemporaryCleanup.ts exige marker/token/owner exactos y rutas canónicas. Solo con escritor terminado reconoce variantes que quedaron entre mkdtemp y onSpawn; contenido desconocido se conserva. Un rmdir pendiente puede completarse sin marker si la carpeta exacta está vacía. temporaryCleanedAt registra ausencia física sin nulificar campos históricos que necesitan los CHECK de DB. Esos metadatos no son copias del original.

**Journal S3.** mediaAssetCleanup.ts verifica namespace, manifiesto y ausencia de referencia vigente antes de borrar. PENDING se reintenta; COMPLETE se revalida para detectar un PUT que acabó tarde. Repetir DELETE sobre una clave propia ausente es seguro; repetir procesamiento/publicación no tiene esa misma garantía. El timer conserva poll500ms, busca huérfanos2s, reintenta limpieza60s y revisa COMPLETE cada hora. Los temporales abandonados genéricos de24h siguen siendo otra tarea.

Migración aditiva20261017150000 aplicada solo a la base Windows aislada;24 al día. Recuperación16/16 y regresión total118 comprobaciones PASS (incluidos padres), build/seed:check/migrate status PASS. Cinco casos matan procesos de backend reales; otros inyectan rollback/ACK perdido sobre DB real, una escritura tardía en S3 y pérdida real de la sesión exclusiva. No se ha reiniciado Windows ni simulado una caída real de red durante PUT. PID reutilizado/EPERM bloquean conservadoramente y requieren revisión; no se declara soporte multihost. Fixtures, objetos y temporales propios retirados; la fase y la UI no se cierran por este bloque.


### 2026-10-17 — Cancelación persistente por API (7.10)

[Contrato, archivos y pruebas](media/MEDIA-CANCELLATION.md). Continuación autorizada por el usuario; implementación completa y explicación después.

La intención y el estado son datos distintos. MediaJob.cancelRequestedAt indica que se pidió detener un trabajo; status sigue describiendo su fase real. Si Sharp continúa vivo, escribir CANCELED y liberar el puesto permitiría arrancar otro proceso demasiado pronto. La migración20261017180000 añade el marcador y un índice, sin crear otro servicio.

requestMediaJobCancellation(), en mediaJobCancellation.ts, es el servicio de dominio. La ruta routes/media.ts valida cookie/Origin y delega en él; el servicio vuelve a comprobar membresía TEAM_ADMIN, usuario dueño, equipo y destino catálogo. Bloquea membresía antes del advisory lock global y la fila del trabajo. En QUEUED no queda un escritor recibiendo ni un worker: puede confirmar CANCELED y liberar reserva. En RECEIVING/PROCESSING/PUBLISHING solo escribe la fecha. COALESCE mantiene la primera solicitud; repetir no duplica efectos.

El POST nuevo devuelve200 si ya está cancelado,202 si solo registró la intención y409 si un terminal definitivo ganó. DB puede confirmar y perder el ACK: un503 no afirma rollback. El cliente puede repetir y el servicio responde según el estado realmente guardado. El DTO contiene campos públicos, nunca rutas/tokens/PID/claves. Esta operación es de catálogo propio; los permisos de futuras propuestas de jugadores seguirán su propio contrato.

MediaRuntime.reconcileReceiptCancellations() consulta los recibos propios y aborta el lease identificado por runtimeReceiptId. MediaJobController.reconcileCancellations() hace lo mismo para tareas de procesamiento/publicación, también con los dos puestos ocupados. tick consulta antes de intentar nuevas tomas. AbortController vive en memoria; PostgreSQL conserva la intención entre peticiones y reinicios. El aborto es cooperativo: no prueba cierre hasta que el receptor, ejecutor o publicación terminan físicamente.

claimNextQueuedMediaJob excluye flags de cancelación. markMediaJobQueuedAfterClosedReceipt comprueba el flag en la transacción del acuse: un recibo cerrado cancelado pasa a CANCELED, nunca se revive como QUEUED. receiveAndQueueMediaJob traduce ese resultado a409. executeClaimedMediaJob consulta la intención después de su CAS de inicio y antes de ordenar Sharp; si ya estaba pedida, no crea el hijo.

publishClaimedAchievementImage comparte el lock de coordinación con el servicio al hacer la transacción final. Después de bloquear membresía y logro, relee cancelRequestedAt. Si cancelar ganó, PublicationCancellationError hace rollback; el catch termina CANCELED, retira STAGING y deja intacta la referencia anterior. Si READY/referencia/SUCCEEDED ganó, la cancelación espera el lock y devuelve too_late. Esto protege el commit aunque el poll todavía no haya observado el flag ni enviado un signal.

recoverMediaJobs añade la intención al snapshot y al CAS: con escritor muerto termina como CANCELED si la fecha existe, o INTERRUPTED si no se había solicitado cancelar. Nunca vuelve a ejecutar Sharp. La limpieza se intenta para terminales confirmados y conserva pendientes si el disco/S3 falla; no transforma una cancelación correcta en fallo ni revierte la imagen vigente.

Pruebas reales HTTP/DB/S3: cancelación12/12, recuperación17/17,131 comprobaciones totales del bloque PASS (incluidos padres), build/seed:check/migrate status y formato PASS. Gates fijan el orden de cancelación/registro del worker/PUT/commit; wrappers inyectan ACK perdido antes y después de transacciones reales. Migración aplicada solo a127.0.0.1:55437/weblogros_ui,25 al día. Sin controles nuevos de frontal ni cierre de7.10; siguiente bloque de base común: abandonados24h y recursos/carga.


### 2026-10-18 — Limpieza de temporales abandonados (7.10)

[Archivos, contrato y evidencia](media/MEDIA-ABANDONED-CLEANUP.md). El usuario pide montarlo y explicar después. No se añade cron ni contenedor: el runtime existente programa el barrido.

sweepAbandonedMediaFiles(), en mediaAbandonedCleanup.ts, busca carpetas UUID y planes pendientes bajo la raíz privada. Ordena la unión y devuelve nextCursor/hasMore: cada poll avanza hasta cien candidatos sin quedarse siempre detrás de un archivo desconocido. Al arrancar se drenan los lotes antes de medir capacidad; después se empieza otra revisión una hora tras completar la anterior. Enumerar nombres no equivale a una cuota de memoria; las mediciones siguen pendientes.

La elegibilidad usa clock_timestamp() de PostgreSQL y la mayor fecha entre mtime, ctime, cierre del owner y updatedAt del job cuando existe. Deben haber pasado24 horas inclusive. mtime cuenta cambios de contenido; ctime registra cambios del archivo en el filesystem, por lo que una copia reciente con fecha antigua no se considera abandonada automáticamente. Tener edad suficiente no demuestra que el archivo pueda borrarse: también se comprueban marcador, propietario técnico del mismo host/raíz, proceso cerrado o muerto, trabajos/leases protegidos y referencias ajenas.

findOtherReferences() compara rutas mediante SQL parametrizado starts_with y un límite exacto de directorio. En las pruebas, Prisma startsWith se traducía a LIKE y las barras Windows actuaban como escapes: no detectaba una referencia real. La comparación literal y normalizada para Windows corrigió ese fallo; hay regresión para ruta exacta, descendiente, casing y referencia añadida después de preparar el borrado.

Si existe MediaJob terminal, se reutiliza cleanupTerminalMediaJobTemporaryFiles con AbortSignal y prueba de cierre. Un sello temporaryCleanedAt con una carpeta reaparecida se conserva para revisión; no se anuncia limpio si sigue habiendo archivos. Limpiar input.tmp no borra MediaAsset READY ni la referencia del logro: las versiones permanentes viven en S3.

Si falta MediaJob, prepareJournal() crea MediaOrphanCleanup antes del primer unlink. Guarda UUID de carpeta, owner, token del recibo, raíz/ruta, actividad y estado. La FK apunta al owner; no puede apuntar a un job que no existe. La transacción corta vuelve a comprobar ausencia de trabajo y referencias usando el lock común; el I/O de disco ocurre después. Esto permite retomar un borrado interrumpido sin inferir propiedad a partir de un nombre.

processJournal() valida todo el conjunto antes de borrar nada: marcador exacto, input.tmp y variantes regulares permitidas, sin enlaces ni archivos desconocidos. Borra individualmente y deja el marcador para el final. Si cae antes de rmdir, el diario solo permite quitar la carpeta exacta si está vacía. Si el disco terminó pero se perdió la respuesta de DB, la siguiente pasada confirma ausencia y completa el journal. Fallos permanecen PENDING con código estable; no se guardan mensajes del proveedor.

PENDING también revalida actividad. Un input reaparecido recientemente aplaza24 horas y la nueva fecha sigue aplicándose en todos los reintentos. Los cambios de directorio debidos a nuestros propios unlink no reinician ese plazo; una variante vacía no contiene datos nuevos que conservar. COMPLETE solo puede reabrirse para el mismo recibo/owner/ruta tras nueva elegibilidad; otro marcador no hereda el permiso anterior.

MediaRuntime añade maintenanceAbort: stop o pérdida del lock abortan mantenimiento y esperan currentPoll. El limpiador terminal también recibe ahora signal y comprueba antes de unlink/rmdir. Una operación del SO ya emitida puede terminar, pero observar abort impide comenzar la siguiente. Los casos sin prueba de propiedad se conservan, sin moverlos ni borrarlos para hacer hueco; el guard de admisión puede bloquear un root con archivos desconocidos.

Pruebas24/24 del barrido,155 comprobaciones totales del bloque, build/seed:check/migrate status y formato PASS. Tiempo24h y scheduler horario controlados en tests; filesystem/DB/journals reales. EACCES y ACK se inyectan y el scheduler usa un almacén en memoria; las suites API/pipeline validan SeaweedFS real. Migración20261018100000 aplicada solo a127.0.0.1:55437/weblogros_ui,26 al día. Sin listado/borrado S3 global, sin UI ni cierre de7.10. Siguiente de aquel bloque: explicar el código y medir recursos/corpus/carga; medición añadida abajo.

## 2026-10-18 — Consumo y carga repetibles de media

El usuario encarga ejecutar las pruebas en local y dejar el mismo montaje disponible para otros despliegues. Se añade `src/experiments/media-benchmark/` y el script `bench:media`; no se cambia el código productivo ni se incorporan servicios nuevos. El procedimiento y las evidencias están en [MEDIA-LOAD-TESTING](media/MEDIA-LOAD-TESTING.md).

`generateBenchmarkCorpus()` crea JPEG y PNG de 24 MP y 10 MB con padding válido y hashes. `corpusProcess.ts` ejecuta esa generación antes de arrancar el proceso medido y sale: sus buffers no se cuentan como RAM de la aplicación. El runner envía los formularios desde fuera por el mismo motivo.

`actor.ts` monta Express, cookieParser, resolveTeam, createMediaRouter y createMediaRuntime con Prisma y S3 reales. Toma el lock exclusivo antes de crear su usuario/equipo/logros. El wrapper `ExecutionGate` solo se instala en este actor para llenar exactamente dos puestos activos y diez pendientes. Se libera antes de medir la transformación de esa cola; no se cambia MAX_CONCURRENT_JOBS ni los plazos productivos. También se prueban parejas JPEG/JPEG y PNG/PNG.

`installWorkerMetrics()` añade un preload únicamente al fork de mediaImageWorker. `workerMetricsPreload.ts` toma RSS, heap, memoria externa, CPU y máximo RSS del proceso, en archivos privados asociados por attempt/jobId; no envía mensajes nuevos al protocolo estricto del ejecutor. `completeWorkerLifecycle()` exige spawn/started/processed/close con PID e identidad coincidentes, evitando aprobar una cota de RAM incompleta por perder un cierre.

`run.ts` controla fases y comprueba FIFO, topes, terminales, referencias READY, lectura y limpieza. `measureDirectoryBytes()` tolera solo ENOENT por carreras con el limpiador, sin seguir enlaces. Docker se consulta en otro bucle para no frenar las muestras de 100 ms. `dockerConfiguration()` registra imagen y límites sin leer Env. La suma de máximos de procesos consecutivos no es un pico simultáneo: se conserva el RSS conjunto muestreado y una cota superior basada en vidas que sí se solapan.

Resultado final: 50/50 SUCCEEDED, 150 variantes, 2 + 10 y rechazo temprano 503, FIFO, 251 respuestas de salud 200, limpieza y cierre del actor PASS. Sharp máximo muestreado 948,7 MiB; cota superior 998,7 MiB. SeaweedFS 530,5 MiB: supera la previsión de 256 MiB; 512 MiB tampoco queda validado. Temporal máximo 117,8 MiB. Sharp p95 794 ms, máximo 899 ms; grupo de doce terminado en 8,260 s. Backend RSS inicial 120,0 MiB y pico 185,7 MiB, sin conclusión suficiente sobre estabilización/fugas.

El runner distingue fallo funcional (código 1) de revisión de presupuesto (código 2). No se ajustaron RAM, compresión, concurrencia ni límites para obtener PASS. Quedan revisar memoria del almacén/retención, ensayo sostenido y repetición en el servidor. La prueba de salud no sustituye carga mixta de toda la aplicación ni QA del frontal. El rechazo temprano durante un fetch con cuerpo completo pudo producir reset en un intento: se documenta para QA de navegador; la prueba estable de capacidad envía cabeceras antes del cuerpo.

Los fixtures S3/DB se retiran solo tras drenar runtime y verificar DELETE/HEAD. Si esto falla, se conservan las referencias y la raíz para revisión. El actor vacía stdout y cierra stdin/IPC; el runner espera exit y close, sin desconectar simultáneamente ambos extremos. Todos los procesos finalizaron correctamente en la referencia final. Se retiraron también raíces de iteraciones previas tras verificar IDs, cierre y ausencia de referencias. Se restauró el backend habitual: health 200 y lectura sin sesión 401/no-store. Recuentos finales: 13 usuarios, 2 equipos, 14 membresías, 19 logros y cero jobs/assets/journals de pruebas.

Build y tests dirigidos PASS: 6 correctos y 2 omitidos (corpus opt-in y symlinks sin privilegio); el corpus completo se verificó aparte con 4/4. No se atribuyen como recién ejecutadas las 155 comprobaciones previas. Roadmap T04/T06/T08.02 siguen parciales: consumo local medido, presupuesto por revisar y recorrido de producto/otros tipos pendiente. Sin cambios de UI, migraciones nuevas, despliegue ni backups.

## 2026-10-18 — Diagnóstico de memoria de SeaweedFS tras abrir Docker

Se arrancó el servicio existente desde Compose con su volumen y configuración. La memoria se separó mediante cgroup v2 y `/proc/1/status`: `memory.current - inactive_file` reproduce la medida de Docker, mientras RSS incluye páginas residentes de archivos. La carga directa S3 de50 publicaciones llegó aproximadamente a333MiB, principalmente memoria anónima; se retiraron las150 claves exclusivas con DELETE+HEAD. No se ejecutó Prisma ni Sharp en esta prueba.

Para obtener perfiles se usaron tres contenedores temporales con imagen local idéntica y volúmenes nuevos, manteniendo el debug fuera del servicio de la aplicación. Cada uno completó50 publicaciones, dos concurrentes, y reposo/limpieza. Por defecto:255,6MiB de pico,5,740s de carga y12 ciclos de GC hasta el perfil natural. Con objetivo Go192MiB:71,9MiB,7,514s y1.741 ciclos. Con384MiB:192,9MiB,4,882s y16 ciclos. Una ejecución por configuración no acredita mayor velocidad; el caso384 es candidato para probar en el flujo completo, no una cuota definitiva ni un ajuste aplicado.

El heap identifica ocho buffers LevelDB2 de16MiB (128MiB de capacidad) y unos80MiB en buffers de eventos del filer. Heap reservado y memoria física residente no son equivalentes. GOMEMLIMIT orienta la memoria gestionada por Go; no es un tope RSS.192MiB queda por debajo de reservas retenidas y provoca muchas recogidas de basura: menos RSS puede costar CPU/latencia. Un GC forzado al terminar ayudó a distinguir basura de buffers/pools; sus resultados no se presentan como ahorro natural bajo carga.

Se verificaron etiquetas UUID antes de retirar los tres contenedores y sus volúmenes. El SeaweedFS original sigue en marcha con `mini -dir=/data`, sin GOMEMLIMIT ni límite Docker nuevo. Evidencia y matices en [MEDIA-LOAD-TESTING](media/MEDIA-LOAD-TESTING.md#diagnóstico-de-ram-de-seaweedfs--2026-10-18). Se confirma que el componente de almacenamiento medido ya es Linux; no se atribuye este consumo a Windows ni se declara una fuga descartada a largo plazo. Sin cambios de código productivo ni reapertura de la UI en aquel diagnóstico.

## 2026-10-18 — Ajustes de memoria aplicados y flujo repetido

Petición directa de implementación: el hijo `src/lib/mediaImageWorker.ts` sustituye `sharp.cache({ memory:32, files:0, items:100 })` por `sharp.cache(false)`. Esta llamada configura la caché global de operaciones de libvips dentro de ese proceso, antes de recibir el comando IPC. El hijo vive una imagen y transforma sus variantes secuencialmente; no aprovecha caché entre trabajos. Desactivarla evita retener recursos del decodificador progresivo entre variantes. Se conserva `sharp.concurrency(1)`; los dos puestos globales los sigue controlando la cola durable, no esa llamada. No se modifican `processMediaImage()`, el ejecutor, el protocolo de cancelación ni la publicación.

En `docker-compose.media.yml`, `services.seaweedfs.environment.GOMEMLIMIT: 384MiB` declara un objetivo flexible de memoria gestionada por Go. El runtime puede recoger basura antes para contener crecimiento, gastando CPU. No reserva384MiB, no limita el RSS ni configura `mem_limit`. `environment` prevalece sobre `env_file` para esa variable. Recrear con Compose aplica el entorno nuevo y conserva el volumen nombrado existente: configuración del proceso y persistencia son aspectos distintos. Se verificaron valor efectivo, comando, imagen y montaje; no se guardaron secretos ni se cambió GOGC.

El recorrido sigue siendo router → recepción temporal → Prisma QUEUED → runtime → ejecutor/proceso Sharp → variantes → S3 privado → transacción READY/referencia/SUCCEEDED → limpieza. Los ajustes afectan a la memoria de dos piezas de ese recorrido; no alteran formatos, calidad85, tamaños,2+10,180s/30s ni autorizaciones.

Build y pruebas recién ejecutadas: ejecutor11/11 y API13/13 PASS. Dos ejecuciones completas de50 imágenes/150 variantes con el mismo corpus10MB/24MP y ocho tandas, segunda sin reiniciar SeaweedFS. Sharp:948,7→446,0/445,2MiB de pico conjunto (≈53% menos); cota conservadora998,7→480,2/479,7MiB. Backend185,7→187,2/187,7MiB: no es el ahorro principal. SeaweedFS530,5→271,4/353,8MiB: mejora, pero aumenta en caliente y supera la previsión256MiB. Sus mayores muestras CPU pasan24,36%→184,38%/255,16%; son intervalos de Docker, no CPU sostenida. No podemos dar por estabilizada su RAM ni atribuir todo el ahorro a Go con una referencia histórica caliente y un reinicio inicial.

Sharp p95:794→785/770ms, sin degradación clara en este corpus. Doce trabajos desde liberar cola:8,260→7,635/8,759s; no afirmar mejora estadística de velocidad. Perfil de bytes/dimensiones de las150 variantes por ejecución idéntico a la referencia; no es comparación SHA de todos sus contenidos.2+10,503,FIFO,lectura/asociación,cierre de100 hijos y limpieza PASS. Retiradas151 claves propias por ejecución con DELETE+HEAD, fixtures de DB y raíces temporales; recuentos antes/después iguales. El runner mantiene salida2 por presupuestoREVISAR, sin subir el umbral256MiB para obtener PASS.

Se conservaron informes, trazas gzip, hashes y configuración sin secretos en [evidencia optimizada](media/evidence/2026-10-18-optimized/comparison.json) y se actualizó el roadmap7.10. Repetir sostenidamente y en servidor; corpus/QA de producto y UI pendientes. No se reejecutaron las155 comprobaciones históricas ni se cerró la fase.

## 2026-10-26 — Persistir borradores, cuotas y versiones

Un borrador representa trabajo que todavía puede estar incompleto. Una propuesta representa algo que el usuario ya envió a revisión. Separarlos evita enseñar trabajo sin terminar a los administradores y permite conservar los tres estados previos de `PropuestaLogro`. Prisma añade `AchievementDraft` con finalidad PROPOSAL/DIRECT, documento JSON editable, versión, imagen opcional y resultado. La migración `20261026120000_achievement_drafts` crea esta tabla sin borrar ni convertir propuestas anteriores; solo marca pendientes antiguas sin imagen para permitir subsanarlas.

`src/lib/achievementDrafts.ts` contiene las operaciones de dominio, sin depender de Express. `createDraft()` bloquea la fila User mediante `SELECT ... FOR UPDATE`, cuenta DRAFT de todos los equipos y crea si hay menos de tres. El bloqueo actúa como mutex: la petición siguiente del mismo usuario espera y cuenta después del commit anterior. Bloquear solo TeamMembership permitiría que dos equipos contasen a la vez y superasen el límite global. Por eso crear y liberar plazas usan la misma fila User. Para las cinco propuestas pendientes, la membresía sigue siendo el mutex de la pareja usuario/equipo.

`updateDraft()` aplica control optimista con `version`: después de bloquear el destino compara la versión enviada con la guardada. Si no coincide devuelve409; si coincide guarda y suma1. El documento `fields` se sustituye completo, lo que permite omitir campos que se quieran retirar; no hay que enviar autor, equipo, finalidad o estado. `schemas/drafts.ts` limita forma/tamaños pero permite textos vacíos e incompletos. Los esquemas completos de logros/propuestas se aplican al enviar, no al guardar. Una finalidad PROPOSAL no permite introducir puntos o configuración reservada al administrador.

## 2026-10-26 — Rutas, membresía y protección de origen

`routes/drafts.ts` traduce HTTP a servicios: el usuario llega de `authMiddleware` y el equipo de `resolveTeam`. No toma ninguno del JSON. La consulta tenant filtra autor/equipo; la global GET `/borradores` usa un snapshot RepeatableRead para que lista y total correspondan a la misma foto de la base. Solo lista los accesibles y devuelve el número inaccesible, sin sus IDs, textos, equipos ni imágenes. Un borrador de un equipo perdido sigue ocupando plaza y reaparece al recuperar membresía. No tiene caducidad automática. El descarte propio necesita membresía pero no conservar TEAM_ADMIN.

`middleware/mediaOrigin.ts` comparte `assertAllowedOrigin()` con las subidas y aplica `requireMediaOrigin` a las nuevas escrituras y a la revisión. La cookie demuestra quién llama; Origin permite comprobar desde qué web se inició la escritura. No se usa Host como lista de confianza. `config/mediaEnv.ts` extrae `mediaAllowedOriginsFromProcess()`: guardar texto puede necesitar esa protección aunque Sharp/S3 estén desactivados, sin exigir entonces secretos de almacenamiento. Sesión y origen resuelven problemas distintos.

Las respuestas no incluyen claves S3 ni rutas temporales. Los terminales de borrador no repiten su texto en GET: después de aprobar, un administrador podría haber convertido el logro en secreto. El historial y el reintento del envío se presentan con las reglas de secreto del catálogo.

## 2026-10-26 — Destino lógico e imagen física

`src/lib/mediaTargets.ts` define `ImageTarget` como unión discriminada. `kind` permite a TypeScript saber si el id es numérico (catálogo/propuesta) o UUID (borrador). `imageTargetKey()` identifica el recurso que compite por una reserva; `imageObjectKey()` identifica una variante física e inmutable dentro del trabajo. No son la misma clave. Los UUID se normalizan para impedir que dos escrituras con distintas mayúsculas reserven dos trabajos para el mismo borrador.

`lockImageTarget()` reúne permisos y estado bajo locks: catálogo exige TEAM_ADMIN; borrador exige autor y DRAFT, con rol administrativo para DIRECT; subsanación exige autor, PENDING, flag legacy y ausencia de imagen. El orden compartido es membresía → destino → coordinación global. Las operaciones de cuota anteponen User. Mantener el mismo orden reduce el riesgo de que dos transacciones se esperen mutuamente formando un deadlock.

`mediaJobAdmission.ts` vuelve a validar el destino nuevo al reservar, después del permiso HTTP inicial. `mediaJobController.ts` reconoce los tres destinos y conserva la clase de procesamiento achievement: receptor, ejecutor Sharp, tamaños y compresión no cambian. `mediaPublication.ts` reserva staging/diario, publica y verifica S3, y finalmente llama a `lockImageTarget()` antes de confirmar imagen READY/referencia/SUCCEEDED. Asociar al borrador aumenta su versión; nunca pisa sus textos.

La FK compuesta `(teamId, imageAssetId)` hacia MediaAsset demuestra que el asset es del tenant correcto, también si alguien escribe fuera de las rutas. `map` en Prisma refleja el nombre elegido en SQL para la FK: evita que el diff proponga renombrarla sin cambiar su significado.

## 2026-10-26 — Envío idempotente y revisión

`submitDraft()` consulta el borrador y comprueba HEAD de todas las variantes fuera de una transacción. Una consulta S3 puede esperar a la red: mantener los locks mientras espera bloquearía innecesariamente otras operaciones. Después abre una transacción corta y vuelve a comprobar permiso, finalidad, estado, versión, la misma referencia de imagen, READY y ausencia de trabajo activo. Aunque exista una imagen anterior válida, una sustitución activa impide enviar.

Dentro de ese commit se cuenta el cupo de propuestas, se crea el resultado y se retira la referencia del borrador, que pasa a SUBMITTED o PUBLISHED. También se guardan `submittedVersion` y `resultId`. Si se pierde la respuesta después del commit, repetir devuelve ese resultado: eso es idempotencia. Si el commit falla, se restaura todo, incluida la plaza y la imagen. Una respuesta perdida no prueba que haya habido rollback.

`routes/propuestas.ts` conserva las lecturas e incorpora la validación de imagen antes de aprobar. La transacción bloquea membresía del administrador y propuesta, confirma que no haya trabajo activo y que la referencia/READY coincida con la comprobada fuera. Crea el logro y retira la referencia de la propuesta en el mismo commit. No copia objetos S3: los bytes permanecen bajo las claves de origen del borrador o la subsanación. La aceptada lee la imagen vigente del logro; si se sustituye después, no conserva otra copia. La rechazada conserva exactamente la imagen enviada.

Solo las propuestas antiguas PENDING sin imagen marcadas por la migración admiten que su autor añada una. El commit consume ese permiso; no modifica sus textos. Las nuevas y las resueltas no permiten sustituir la imagen. Los POST anteriores de creación/propuesta ahora solo admiten `{ borradorId, version }`: el frontal pausado necesita integrar el flujo antes de volver a completar esas operaciones.

## 2026-10-26 — Descarte, cancelación y limpieza con referencias

`discardDraft()` confirma DISCARDED, referencia retirada, diario de limpieza y cancelación antes de solicitar retirada física. `cancelActiveTargetJobs()` distingue QUEUED, que no tiene escritor y puede cerrarse inmediatamente, de RECEIVING/PROCESSING/PUBLISHING, que solo reciben intención hasta confirmar su cierre. Liberar la plaza del borrador y liberar una reserva técnica son operaciones diferentes: se puede liberar la primera conservando la segunda mientras termina el escritor.

El guard final de publicación no permite asociar a DISCARDED, aunque un PUT termine tarde. `mediaAssetCleanup.ts` y `mediaJobRecovery.ts` usan `imageReferenceCount()` para proteger referencias de catálogo, borradores y propuestas, y validan las claves mediante el origen real del trabajo. Un fallo de borrado deja journal reintentable; un ACK incierto no autoriza a destruir un asset posiblemente confirmado.

Verificación: [contrato y evidencia](media/MEDIA-DRAFTS-PROPOSALS.md),192 comprobaciones PASS en16 archivos, incluyendo padres. Las nuevas pruebas HTTP atraviesan PostgreSQL, Sharp hijo y S3; las de recuperación matan padres reales en varios estados y reinician un único runtime. Se prueban carreras de cuotas/envío, permisos, reingreso, rollback, ACK perdido, imágenes ausentes/fallidas/canceladas, descarte activo y subsanación legacy. Migración sobre datos anteriores, Prisma validate/diff, build y seed:check PASS; no se ejecutó de nuevo el seed. Fixtures/objetos/temporales propios retirados y conteos ajenos conservados. La entrega acredita backend local, no frontend, despliegue, dimensionamiento sostenido ni cierre de7.10/T08.01.

## 2026-10-27 — Corpus de imágenes y herramientas de calidad

Un corpus es un conjunto de entradas conocidas que hace reproducible una comprobación. Una imagen que se abre bien no demuestra que funcionen orientación, transparencia, color, límites o rechazo de errores. `experiments/media-quality/corpus.ts` genera escenas con receta fija, esquinas de colores y alta entropía; reutiliza las fronteras de10MB/24MP del benchmark y un arte propio del repo para detalle oscuro. Cada fuente registra procedencia, dimensiones, metadatos, bytes y SHA-256. No descarga imágenes ni integra esos assets en el frontal. Fuentes temporales se eliminan; el manifiesto permite identificar/regenerar el caso.

`run.ts` es una herramienta independiente: comprueba identidad exacta de base/S3, crea fixtures propios y un runtime, y envía cada imagen por HTTP. Después de Sharp/S3, los válidos pasan desde borrador a publicación directa o propuesta aceptada/rechazada. Se lee cada variante por su API privada y se compara SHA/tamaño con el asset; no basta con encontrar un archivo en disco. Al cerrar se retiran solo objetos/filas propios, se confirma ausencia con HEAD y se comparan los conteos anteriores/posteriores. El código no se importa desde server.ts ni cambia la configuración productiva.

`metrics.ts` construye una referencia sin compresión final al mismo tamaño/espacio/orientación. Comparar con el original grande mezclaría dos pérdidas distintas: la reducción necesaria y la compresión. PNG exige igualdad de píxeles/alpha después de normalizar y reducir. Para JPEG se calcula error absoluto medio, PSNR (error cuadrático respecto al rango255) y SSIM de luminancia por bloques8×8 (estructura local). PSNR nulo significa igualdad exacta; no se serializa Infinity. Los umbrales30dB/0,95 son avisos de revisión fijados antes del ensayo, no una excusa para cambiar compresión ni un sustituto de mirar el resultado.

El oráculo EXIF usa una tabla de las ocho permutaciones de esquinas. Es independiente de `autoOrient`: comparar únicamente dos llamadas a la misma operación podría ocultar que ambas orientan mal. También se comprueban dimensiones, formato, sRGB de8bits, retirada de metadatos y ausencia de paleta PNG. El corpus incluye entradas P3/CMYK/gris/16bits/paleta, pequeñas/extremas, frontera exacta y errores reales de contenido.

`review.ts` genera paneles de referencia/salida con vista completa y recortes a1×/2×; ampliar por vecino más cercano deja visibles los píxeles sin otra interpolación. El primer ensayo detectó un recorte fuera del borde en variantes bajas; `reviewCrop()` limita región y posición. El segundo detectó que una referencia `fill` con dimensiones ya redondeadas cambiaba el muestreo respecto al escalado proporcional: `makeLosslessReference()` conserva ahora el mismo lado máximo/proporción, sin comprimir al final. Ambos problemas eran de QA, no del procesador productivo; se añadieron pruebas y no se tocaron calidad85, umbrales ni límites. Sus reportes incompletos y limpieza confirmada se conservan.

`analysis.ts` deriva resúmenes del reporte bruto: suma todas las variantes de cada imagen, calcula la mediana (promedio de las dos posiciones centrales si el tamaño es par) y p95 por rango más próximo. Una muestra vacía no se declara PNG perfecto ni corpus aprobado. Las pruebas usan errores y estadísticas con resultado conocido; así también se comprueba la herramienta que pretende comprobar el backend.

[Resultado y límites](media/MEDIA-QUALITY-CORPUS.md):38 casos PASS (25 válidos/13 rechazos),71 variantes privadas,7 pruebas de herramienta y11 de compatibilidad Sharp PASS; build y seed:check correctos. Se inspeccionaron13 de30 paneles, con automatización en todas las variantes. PNG26/26 exactos frente a referencia; JPEG45 variantes, PSNR mínimo31,257dB y SSIM mínimo0,962799, sin avisos. JPEG suaviza detalle fino; no se promete legibilidad de texto inferior a la resolución de la miniatura ni conservar todo el gamut de otra codificación.

La salida más pesada suma6.126.090B por imagen con sus variantes PNG; supera el supuesto pesado3MB de planificación, que no era una cota. Esto sirve para preparar carga sostenida/mixta, no para estimar memoria del servidor: el generador, decodificador de referencia y paneles también consumen recursos en el proceso de QA. Se conservan formatos, compresión, variantes, cuotas, caché Sharp y Go384MiB. No se reejecutaron las192 pruebas previas ni se aplicaron migraciones/seed. Corpus/calidad de logos/avatares, recursos sostenidos/servidor y frontal/QA permanecen pendientes; T08.01 sigue bloqueando logos.
