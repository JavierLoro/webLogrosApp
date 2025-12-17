# Team Achievements Platform

## Description
Public web platform to showcase a team's achievements and statistics, with a protected admin panel to manage and update data.

The project is designed as a learning exercise covering real-world web development concepts: frontend, backend, authentication, databases, Docker, Git, and deployment on a Proxmox server.

---

## Tech Stack

### Frontend
- React
- Vite
- TypeScript
- Axios
- React Router

### Backend
- Node.js
- Express
- TypeScript
- JWT Authentication
- Prisma ORM

### Database
- PostgreSQL

### Infrastructure
- Docker
- Docker Compose
- Nginx
- Proxmox (LXC or VM)

---

## Architecture Overview

```
Browser
  │
  ├── Frontend (React + Nginx)
  │
  └── Backend API (Express)
          │
          └── PostgreSQL
```

The frontend communicates with the backend through a REST API. The backend handles authentication, authorization, and database access.

---

## Repositories Structure

```
team-achievements-frontend/
team-achievements-backend/
```

Frontend and backend are developed and deployed independently.

---

## Environments

- Local development (PC)
- Production (Proxmox + Docker)

Environment-specific configuration is handled using `.env` files.

---

## Documentation Index

All detailed documentation is located in the `/docs` folder:

- ROADMAP.md
- ARCHITECTURE.md
- DECISIONS.md
- SETUP_LOCAL.md
- DEPLOYMENT.md
- NOTES.md

---

# docs/ROADMAP.md

## Phase 1 – Project Base
- [ ] Create GitHub repositories
- [ ] Initialize backend (Express + TypeScript)
- [ ] Initialize frontend (React + Vite)
- [ ] Basic Git workflow

## Phase 2 – Public Website
- [ ] Public homepage
- [ ] Achievements list
- [ ] Backend public endpoints

## Phase 3 – Admin Panel
- [ ] Admin login page
- [ ] JWT authentication
- [ ] Protected admin routes
- [ ] CRUD for statistics

## Phase 4 – Database
- [ ] PostgreSQL container
- [ ] Prisma schema
- [ ] Migrations

## Phase 5 – Deployment
- [ ] Dockerfiles
- [ ] Docker Compose
- [ ] Nginx reverse proxy
- [ ] HTTPS with Let's Encrypt

---

# docs/ARCHITECTURE.md

## Overview

- Frontend: React SPA served by Nginx
- Backend: Express REST API
- Database: PostgreSQL accessed via Prisma

## Data Flow

1. User accesses the frontend
2. Frontend requests data from backend API
3. Backend queries database
4. Response returned as JSON

## Authentication Flow

1. Admin submits login credentials
2. Backend validates credentials
3. JWT token is issued
4. Token is sent via HttpOnly cookie
5. Protected routes require valid JWT

---

# docs/DECISIONS.md

## Frontend Framework

React was chosen to learn component-based architecture and SPA development without backend coupling.

## Backend Framework

Express was selected for its simplicity and flexibility for learning REST APIs.

## Database

PostgreSQL provides strong relational modeling suitable for statistics and achievements.

## ORM

Prisma was chosen to reduce boilerplate SQL and enforce type safety.

## Docker

Docker ensures reproducible environments and simplifies deployment on Proxmox.

---

# docs/SETUP_LOCAL.md

## Requirements

- Node.js 20 LTS
- Docker
- Git
- VS Code

## Backend Setup

```bash
npm install
npm run dev
```

## Frontend Setup

```bash
npm install
npm run dev
```

## Environment Variables

Create a `.env` file for backend configuration.

---

# docs/DEPLOYMENT.md

## Server Requirements

- Proxmox
- Ubuntu Server 22.04
- Docker
- Docker Compose

## Deployment Steps

1. Clone repositories
2. Configure environment variables
3. Build containers
4. Run docker compose

```bash
docker compose up -d --build
```

---

# docs/NOTES.md

## Technical Notes

### 2025-01-10
- Initial project structure defined
- Documentation created

### TODO
- Define API endpoints
- Design database schema

