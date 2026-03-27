# webLogrosApp — Contexto del proyecto

## Descripción
Plataforma de logros de equipo. Proyecto de aprendizaje progresivo: JS → TS → Express → PostgreSQL → Docker → Prisma → Next.js → JWT → Nginx → Proxmox.

## Estructura
```
apps/
  backend/   — Express + TypeScript + Prisma + PostgreSQL
  frontend/  — Next.js + Tailwind CSS
docker-compose.yml  — PostgreSQL en Docker
docs/apuntes.md     — Notas de aprendizaje
```

## Ruta del proyecto
`C:\Users\javie\Proyectos\webLogrosApp`

## Arrancar el proyecto

### Base de datos
```bash
docker-compose up -d
```

### Backend (puerto 3001)
```bash
cd apps/backend
npm run dev
```

### Frontend (puerto 3000)
```bash
cd apps/frontend
npm run dev
```

## Variables de entorno
- `apps/backend/.env` — `DATABASE_URL` para PostgreSQL

## Base de datos
- PostgreSQL corriendo en Docker, contenedor `weblogros_db`
- Credenciales: usuario `admin`, password `admin123`, db `weblogros`
- Migraciones con Prisma: `npx prisma migrate dev --name <nombre>`

## Contexto de aprendizaje
El usuario está aprendiendo desde cero. Explicar conceptos antes de implementarlos.
Cada bloque nuevo se documenta en `docs/apuntes.md`.
