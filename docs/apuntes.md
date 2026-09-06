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
- `UserLogro` usa su clave compuesta `userId_logroId` para evitar asignaciones duplicadas.
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

## Auth Hardening — cookie HttpOnly

Guardar el JWT en `localStorage` permitía al frontend leerlo y construir manualmente
`Authorization: Bearer`. Eso también permitía que un script inyectado mediante XSS robara la
credencial. Ahora `POST /auth/login` entrega el JWT en una cookie con estas propiedades:

- `HttpOnly`: JavaScript no puede leerla.
- `SameSite=Lax`: el navegador no la adjunta a peticiones POST iniciadas desde otro sitio.
- `Secure` en producción: solo viaja sobre HTTPS.
- `Path=/` y siete días de duración: coincide con la expiración del JWT.

El navegador adjunta la cookie automáticamente en las llamadas relativas a `/api`. El middleware
extrae una sola cookie sin añadir `cookie-parser`, verifica la firma y conserva el mismo contrato
interno: las rutas siguen recibiendo `req.userId`. `GET /auth/session` devuelve únicamente equipos
y permisos actuales para construir la interfaz, nunca el token. `POST /auth/logout` borra la
cookie usando las mismas opciones con las que fue creada.
