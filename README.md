# Team Achievements Platform

## Description
Public web platform to showcase a team's achievements and statistics, with a protected admin panel to manage and update data.

Goal: learn a real-world workflow end-to-end: frontend, backend API, auth, database, Docker, GitHub, and deployment on Proxmox.

## Tech Stack

### Frontend
- Next.js (React)
- TypeScript
- Axios (HTTP client)
- Next.js routing

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
- Nginx (reverse proxy)
- Proxmox (LXC or VM)

## Architecture Overview

```
Browser
  │
  ├── Frontend (React + Nginx)
  │
  ├── Frontend (Next.js)
  │
  ├── Backend API (Express)
  │
  └── PostgreSQL
```

The frontend communicates with the backend through a REST API. The backend handles authentication, authorization, and database access.

---

## Repository Structure (Monorepo)

```
team-achievements/
├── apps/
│ ├── frontend/ # Next.js
│ └── backend/ # Express API
├── infra/ # Docker, Nginx, deployment scripts
└── docs/ # Project documentation
```

Frontend and backend are developed in the same repository but can be built and deployed as separate services.

---


## Environments

- Local development (PC)
- Production (Proxmox + Docker)

Environment-specific configuration is handled using `.env` files.

---

## Documentation
See `/docs`:
- `ROADMAP.md`
- `ARCHITECTURE.md`
- `DECISIONS.md`
- `SETUP_LOCAL.md`
- `DEPLOYMENT.md`
- `NOTES.md`

---

## Roadmap (high level)
- Phase 1: project base (repos + scaffolding)
- Phase 2: public website (read-only pages + public API)
- Phase 3: admin panel (auth + protected routes)
- Phase 4: database (Prisma + migrations)
- Phase 5: deployment (Docker + Nginx + HTTPS)



