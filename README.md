# webLogrosApp

Plataforma de logros de equipo. Proyecto de aprendizaje progresivo con stack completo: frontend, backend, autenticación, base de datos, Docker, CI/CD y despliegue en servidor propio.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | Express + TypeScript + Prisma ORM |
| Base de datos | PostgreSQL 16 |
| Auth | JWT (jsonwebtoken + bcryptjs) |
| Proxy | Nginx |
| Contenedores | Docker + Docker Compose |
| CI/CD | GitHub Actions → GHCR |
| Auto-deploy | Watchtower |
| Exposición externa | Cloudflare Tunnel + Nginx Proxy Manager |

## Arquitectura

```
Internet
  └── Cloudflare Tunnel
        └── Nginx Proxy Manager (host)
              └── weblogros_nginx :8080
                    ├── /api/*  →  backend :3001  →  PostgreSQL :5432
                    └── /*      →  frontend :3000
```

## Estructura del repositorio

```
webLogrosApp/
├── apps/
│   ├── backend/          # Express + TypeScript + Prisma
│   └── frontend/         # Next.js + Tailwind
├── infra/
│   └── nginx/
│       └── nginx.conf    # Reverse proxy interno
├── docs/
│   ├── Roadmap.md
│   └── apuntes.md
├── .github/
│   └── workflows/
│       └── deploy.yml    # CI/CD: build + push a GHCR
├── docker-compose.yml      # Desarrollo local (build local)
└── docker-compose.prod.yml # Producción (imágenes de GHCR + Watchtower)
```

---

## Desarrollo local

### Requisitos
- Node.js 20+
- Docker Desktop

### 1. Levantar la base de datos

```bash
docker-compose up -d db
```

### 2. Backend (puerto 3001)

```bash
cd apps/backend
cp .env.example .env      # editar DATABASE_URL y JWT_SECRET
npx prisma migrate dev
npm run dev
```

### 3. Frontend (puerto 3000)

```bash
cd apps/frontend
npm run dev
```

La app estará en `http://localhost:3000`. El backend en `http://localhost:3001`.

### Variables de entorno — backend (`apps/backend/.env`)

```
DATABASE_URL=postgresql://admin:admin123@localhost:5432/weblogros
JWT_SECRET=<cadena_larga_y_aleatoria>
```

---

## CI/CD — GitHub Actions + GHCR

Al hacer push a `main`, el workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml):

1. Construye la imagen Docker del backend
2. Construye la imagen Docker del frontend
3. Publica ambas en GitHub Container Registry:
   - `ghcr.io/javierloro/weblogros-backend:latest`
   - `ghcr.io/javierloro/weblogros-frontend:latest`

No requiere secretos manuales — usa el `GITHUB_TOKEN` automático de Actions.

---

## Producción — despliegue en Proxmox

### Opción A — Script automático (recomendado)

En un contenedor Proxmox limpio (Debian/Ubuntu), ejecutar como root:

```bash
curl -fsSL https://raw.githubusercontent.com/JavierLoro/webLogrosApp/main/infra/scripts/setup.sh | bash
```

El script instala Docker, descarga los archivos necesarios, pide las credenciales y levanta todos los contenedores. Ver [infra/scripts/setup.sh](infra/scripts/setup.sh).

---

### Opción B — Manual paso a paso

#### Requisitos en el servidor
- Docker + Docker Compose instalados
- Acceso a internet para descargar imágenes

#### 1. Autenticarse en GHCR

Crear un Personal Access Token en GitHub con scope `read:packages` y ejecutar:

```bash
docker login ghcr.io -u javierloro
# introducir el PAT como contraseña
```

### 2. Copiar los archivos necesarios al servidor

```
docker-compose.prod.yml
infra/nginx/nginx.conf
```

### 3. Crear el archivo `.env.prod`

```bash
cat > .env.prod << 'EOF'
POSTGRES_USER=admin
POSTGRES_PASSWORD=<contraseña_segura>
POSTGRES_DB=weblogros
JWT_SECRET=<cadena_larga_y_aleatoria>
EOF
```

> `.env.prod` nunca se sube al repositorio (excluido por `.gitignore`).

### 4. Levantar los contenedores

```bash
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

Esto levanta 5 servicios:

| Contenedor | Imagen | Descripción |
|-----------|--------|-------------|
| `weblogros_db` | postgres:16 | Base de datos |
| `weblogros_backend` | ghcr.io/javierloro/weblogros-backend | API Express |
| `weblogros_frontend` | ghcr.io/javierloro/weblogros-frontend | Next.js |
| `weblogros_nginx` | nginx:alpine | Reverse proxy interno, expuesto en :8080 |
| `weblogros_watchtower` | containrrr/watchtower | Auto-deploy al detectar nuevas imágenes |

### 5. Configurar Nginx Proxy Manager

En la UI de NPM, añadir un nuevo **Proxy Host**:

| Campo | Valor |
|-------|-------|
| Domain Names | `logros.tudominio.com` |
| Scheme | `http` |
| Forward Hostname/IP | IP LAN del servidor Proxmox |
| Forward Port | `8080` |

(SSL con Let's Encrypt se puede activar desde la misma pantalla una vez el dominio apunte al servidor.)

### 6. Verificar

```bash
# La app responde localmente
curl http://localhost:8080

# Watchtower detecta actualizaciones (logs en tiempo real)
docker logs -f weblogros_watchtower
```

### Flujo de actualización automática

```
git push origin main
  → GitHub Actions construye y publica nuevas imágenes en GHCR
  → Watchtower (cada 30s) detecta el nuevo digest
  → docker pull + restart automático de backend y frontend
```

---

## Roadmap

Ver [docs/Roadmap.md](docs/Roadmap.md).

**Ruta de aprendizaje:** JS → TS → Express → PostgreSQL → Docker → Prisma → Next.js → JWT → Nginx → CI/CD → **Proxmox**
