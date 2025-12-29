<!-- Copilot instructions for AI coding agents working on this repo -->
# Copilot / AI Agent Instructions

This file contains concise, actionable guidance to help an AI coding agent become productive in this repository.

## Guidance-only agent (important)

- **Agent mode:** This repository is for learning and guidance only. Do NOT create, modify, or commit source files, scaffolding, or infra manifests unless you have explicit permission from the repository owner. Provide step-by-step guidance, code snippets, and example commands, but always ask for approval before applying changes.
- **Interaction style:** Prioritize explanations, short examples, and safe-to-run commands. When proposing a change, include a one-line summary, a small patch example, and the exact commands a developer should run to apply it locally.

- **Big picture**: this is a monorepo with `apps/` (frontend: Next.js, backend: Express), `infra/` (Docker + deployment), and `docs/` (architecture, setup, deployment). See `README.md` and `docs/Architecture.md` for the intended architecture.

- **Current repo state (important)**: `apps/frontend` and `apps/backend` directories exist but are empty in this clone; `infra/docker/` is present but appears to have no checked-in `docker-compose.yml`. Always verify files exist before making assumptions or changes.

- **Primary flows to inspect and preserve**:
  - Frontend calls backend at `/api`. The frontend expects `NEXT_PUBLIC_API_BASE_URL` to point at `http://localhost:4000/api` in local development (see `docs/setup_local.md`).
  - Backend uses Prisma and PostgreSQL. Configuration is expected in `apps/backend/.env` with `DATABASE_URL` and `JWT_SECRET`.
  - Auth uses JWT stored in an HttpOnly cookie for admin routes (see `docs/Architecture.md`).

- **Developer workflows / commands** (copyable):
  - Start frontend (when present):
    - `cd apps/frontend && npm install && npm run dev` (frontend default port: 3000)
  - Start services with Docker (when `infra/docker/docker-compose.yml` exists):
    - `docker compose up -d --build`

- **Files to check first (examples)**:
  - `README.md` (project overview)
  - `docs/Architecture.md` (routing, auth flow)
  - `docs/setup_local.md` (local dev commands and .env locations)
  - `apps/frontend/.env.local` (place `NEXT_PUBLIC_API_BASE_URL`)
  - `apps/backend/.env` (place `DATABASE_URL`, `JWT_SECRET`)

- **Patterns & conventions**:
  - Monorepo: keep frontend and backend separated under `apps/` and treat them as independently buildable services.
  - Environment-specific files: frontend uses Next.js `.env.local`; backend uses `.env` at `apps/backend`.
  - API routing: backend endpoints mount under `/api` (Nginx -> Express). When modifying server routes, update frontend API base or Next.js rewrites accordingly.
  - Database migrations: backend uses Prisma ORM — look for `prisma/` (if present) and run `npx prisma migrate dev` when schema changes.

- **When making changes**:
 - **When making changes**:
  - This repo owner prefers guidance-only interactions. Verify `apps/*` actually contain source before suggesting scaffolding. If source is missing, propose a minimal scaffold and explicitly ask for permission before creating files.
  - If you change API shapes, update `docs/Architecture.md` and `docs/setup_local.md` with examples and dev commands.
  - For deployments, prefer modifying `infra/docker/*` and `docs/Deployment.md` together so docs and infra stay aligned.

- **Checks to perform before submitting a PR**:
  - `apps/frontend` builds (`npm run build`) without errors (if present).
  - `apps/backend` compiles and starts with Node 20 LTS (if TypeScript present): `npm run build && npm start`.
  - If adding DB schema changes, include Prisma migration and update `docs/` with any required env changes.

If any section is unclear or files are missing where the docs expect them, tell the repository owner which file(s) you couldn't find and propose a minimal scaffold. Ask for permission before creating large scaffolding changes.

---
Please review — I can refine wording, add examples, or merge with any existing instructions you prefer.
