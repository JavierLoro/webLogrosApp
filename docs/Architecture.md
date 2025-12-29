# Architecture

## Overview
- Frontend: Next.js app (public pages + admin pages)
- Backend: Express REST API
- Database: PostgreSQL via Prisma
- Reverse proxy: Nginx

## Routing (default)
- Public site and admin are served by Next.js
- Backend API is exposed at: `/api` (Nginx -> Express)

## Data Flow
1. Browser loads Next.js pages
2. Next.js (client-side) requests data from backend API
3. Backend validates auth (for admin endpoints)
4. Backend reads/writes PostgreSQL via Prisma
5. Backend returns JSON

## Authentication Flow (default: HttpOnly cookie)
1. Admin logs in with email/password
2. Backend validates credentials
3. Backend sets a JWT in an HttpOnly cookie
4. Admin requests protected endpoints; backend checks the cookie JWT