<!-- .github/copilot-instructions.md - guidance for AI coding agents -->
# Copilot / AI Agent Instructions — webLogrosApp

This file gives focused, actionable guidance to AI coding agents working on this repo. Keep suggestions concrete and grounded in the repository's discoverable patterns.

- **Big picture:** The project is split into a Next.js frontend and an Express backend (separate services). Frontend talks to backend over a REST API exposed at `/api`. The backend uses Prisma + PostgreSQL and issues JWTs in HttpOnly cookies for admin auth. See `README.md` and `docs/Architecture.md` for the canonical diagram and auth flow.

- **Where to look first:**
  - `README.md` — high-level stack and goals.
  - `docs/Architecture.md` — routing, auth, and data-flow specifics.
  - `docs/setup_local.md` — local run commands and required env vars.
  - `docs/Deployment.md` — Docker Compose and Nginx routing examples.

- **Immediate dev workflows (copyable):**
  - Frontend: run in the frontend root with `npm install` then `npm run dev`.
  - Backend: run in the backend root with `npm install` then `npm run dev`.
  - Start full stack for production-like testing: `docker compose up -d --build` (see `docs/Deployment.md`).

- **Important env vars / examples:**
  - Frontend: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api` (used by client-side code to call the API).
  - Backend: `DATABASE_URL` (Postgres connection), `JWT_SECRET` (signing tokens). See `docs/setup_local.md`.

- **Auth pattern to preserve:**
  - Admin auth uses JWT stored in an HttpOnly cookie. When working on auth or admin endpoints, follow the flow in `docs/Architecture.md`: login -> backend sets HttpOnly JWT cookie -> protected endpoints validate cookie.

- **Conventions & patterns (code-level):**
  - Services are independent: prefer edits scoped to frontend or backend directories only unless changing cross-cutting concerns (e.g., API shape, env names).
  - API surface is REST-style under `/api`. Avoid introducing GraphQL or RPC without explicit team approval.
  - Database interactions use Prisma ORM — migrations and schema changes should include a migration step and seed updates.

- **Docker & Deployment cues:**
  - Use `docker compose` for multi-service runs. Nginx is expected to route `/api` to the backend and the rest to the Next.js app (see `docs/Deployment.md`).

- **Testing and debugging hints (repo-specific):**
  - Local Postgres is recommended via Docker Compose per `docs/setup_local.md` — tests and dev runs assume a reachable `DATABASE_URL`.
  - For auth bugs, reproduce with DevTools disabled for JS-only cookie inspection (HttpOnly cookies are not visible to JS); inspect server responses and the request cookie header.

- **When modifying public API endpoints:**
  - Update the README and `docs/Architecture.md` if you change routes or auth behavior.
  - Prefer additive changes; document breaking changes explicitly in the docs.

- **Files that are authoritative:** `README.md`, `docs/Architecture.md`, `docs/setup_local.md`, `docs/Deployment.md`, and `docs/Roadmap.md`.

- **Do not assume:**
  - Exact repo layout (frontend/backend directories are separate repos in original plan). If you cannot find a service root, ask the user where the frontend/backend live in the workspace.

- **Examples to follow in PRs:**
  - Small, focused commits. When adding a migration, include the migration files and a small README note on how to run `prisma migrate dev` and seed data.

If anything above is unclear or you need specific file locations (frontend vs backend root), ask and I'll point to the exact paths. Please propose one change at a time in PRs so maintainers can review easily.
