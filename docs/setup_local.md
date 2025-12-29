# Local Setup

## Requirements
- Node.js 20 LTS
- Git
- Docker (recommended for running PostgreSQL locally)

---

## Frontend (Next.js)

From the repository root:

```bash
cd apps/frontend
npm install
npm run dev
```
The frontend will be available at:

http://localhost:3000


## Database (PostgreSQL via Docker)

It is recommended to run PostgreSQL using Docker Compose during development to ensure environment consistency.

Database container will be started using the infrastructure configuration defined in:

infra/docker/docker-compose.yml

## Environment Variables
# Frontend

Create a .env.local file inside apps/frontend:

NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api

## Backend

Create a .env file inside apps/backend:

DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key