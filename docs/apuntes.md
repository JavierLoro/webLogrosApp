# Apuntes — webLogrosApp

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
      const res = await fetch("http://localhost:3001/auth/login", {
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
