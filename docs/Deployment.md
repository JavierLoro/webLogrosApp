# Deployment

## Target
- Proxmox container (LXC) or VM
- Docker + Docker Compose installed
- Nginx as reverse proxy (HTTPS + routing)

## Default Routing
- `https://yourdomain.com` -> Next.js container
- `https://yourdomain.com/api` -> Express container

## High-level Steps
1. Clone repositories on the server
2. Configure `.env` files (backend + frontend if needed)
3. Build and run services:
```bash
docker compose up -d --build
```
4. Configure Nginx reverse proxy
5. Enable HTTPS (Let's Encrypt)

