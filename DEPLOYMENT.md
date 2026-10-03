# MindMesh Deployment Guide

This guide covers deploying MindMesh to Google Cloud Compute Engine while maintaining full local development compatibility.

## Architecture Overview

```
Internet
   │
   ▼
┌─────────────────┐
│   Caddy / HTTPS │  Ports 80/443 (Public)
│   TLS/SSL       │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Frontend   Backend
:3000      :8000
         ┌──┴──┐
         ▼     ▼
      Qdrant  Ollama
      :6333  :11434
```

## Quick Start - Local Development

### Prerequisites
- Docker & Docker Compose v2+
- Git
- 8GB+ RAM (for Ollama models)

### Start Local Stack

```bash
# Clone repository
git clone https://github.com/your-org/mindmesh.git
cd mindmesh

# Copy environment files
cp deploy/.env.development.example backend/.env.development
cp deploy/.env.development.example frontend/.env.development

# Start all services
docker compose -f deploy/docker-compose.dev.yml up --build
```

**Access:** http://localhost:3000

### Stop Local Stack
```bash
docker compose -f deploy/docker-compose.dev.yml down
```

---

## Google Cloud Production Deployment

### Prerequisites
- Google Cloud account with billing enabled
- Domain name with DNS control
- Google Cloud SDK (`gcloud`) installed locally
- SSH access to VM

### Phase 1: VM Setup

```bash
# 1. Create VM (e2-standard-4 = 4 vCPU, 16GB RAM - good for qwen2.5:3b)
gcloud compute instances create mindmesh-prod \
    --zone=us-central1-a \
    --machine-type=e2-standard-4 \
    --image-family=ubuntu-2404-lts \
    --image-project=ubuntu-os-cloud \
    --boot-disk-size=50GB \
    --boot-disk-type=pd-ssd \
    --tags=http-server,https-server \
    --scopes=cloud-platform

# 2. Create persistent data disk (100GB)
gcloud compute disks create mindmesh-data \
    --zone=us-central1-a \
    --size=100GB \
    --type=pd-ssd

# 3. Attach data disk
gcloud compute instances attach-disk mindmesh-prod \
    --disk=mindmesh-data \
    --zone=us-central1-a

# 4. SSH into VM
gcloud compute ssh mindmesh-prod --zone=us-central1-a
```

### Phase 2: VM Configuration (Run on VM)

```bash
# 1. Update system
sudo apt-get update && sudo apt-get upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# 3. Install Docker Compose v2
sudo apt-get install -y docker-compose-plugin

# 4. Format and mount data disk
sudo mkfs.ext4 -F /dev/disk/by-id/google-mindmesh-data
sudo mkdir -p /opt/mindmesh/data
sudo mount /dev/disk/by-id/google-mindmesh-data /opt/mindmesh/data
echo '/dev/disk/by-id/google-mindmesh-data /opt/mindmesh/data ext4 defaults 0 2' | sudo tee -a /etc/fstab

# 5. Create app directory structure
sudo mkdir -p /opt/mindmesh/app
sudo chown -R $USER:$USER /opt/mindmesh
```

### Phase 3: Deploy Application (Run on VM)

```bash
cd /opt/mindmesh/app

# 1. Clone repository
git clone https://github.com/your-org/mindmesh.git .
# OR if private repo: git clone git@github.com:your-org/mindmesh.git .

# 2. Create production environment file
cp deploy/.env.production.example .env.production
# EDIT .env.production with your values:
# - YOUR_DOMAIN.COM
# - API_KEY (generate: openssl rand -hex 32)
# - CORS_ORIGINS
# - NEXT_PUBLIC_API_URL=https://yourdomain.com/api

# 3. Create Caddyfile with your domain
sed -i 's/YOUR_DOMAIN.COM/yourdomain.com/g' deploy/Caddyfile

# 4. Create data directories on mounted volume
mkdir -p /opt/mindmesh/data/app
mkdir -p /opt/mindmesh/data/qdrant
mkdir -p /opt/mindmesh/data/ollama
mkdir -p /opt/mindmesh/data/uploads

# 5. Update docker-compose.prod.yml to use mounted volumes
# Edit deploy/docker-compose.prod.yml volumes section:
# Change:
#   volumes:
#     qdrant_storage:
#       driver: local
# To:
#   volumes:
#     qdrant_storage:
#       driver: local
#       driver_opts:
#         type: none
#         o: bind
#         device: /opt/mindmesh/data/qdrant
# (Repeat for ollama_storage, backend_data, uploads)

# 6. Build and start
docker compose -f deploy/docker-compose.prod.yml up -d --build

# 5. Pull Ollama models (first run only)
docker compose -f deploy/docker-compose.prod.yml exec ollama ollama pull qwen2.5:3b
docker compose -f deploy/docker-compose.prod.yml exec ollama ollama pull nomic-embed-text

# 6. Verify services
docker compose -f deploy/docker-compose.prod.yml ps
curl -f https://yourdomain.com/health
```

### Phase 4: DNS & HTTPS

1. Add DNS A record: `yourdomain.com` → VM External IP
2. Wait for DNS propagation (5-10 min)
3. Caddy will automatically obtain Let's Encrypt certificate
4. Verify: `curl -I https://yourdomain.com`

### Phase 5: Validation Checklist

```bash
# Health checks
curl -f https://yourdomain.com/health
curl -f https://yourdomain.com/api/health

# Frontend
curl -f https://yourdomain.com/ | grep -c "MindMesh"

# API
curl -X POST https://yourdomain.com/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test"}'

# SSE streaming
curl -N -X POST https://yourdomain.com/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"question":"Hello","top_k":1}'

# Upload test
curl -X POST https://yourdomain.com/api/documents/process \
  -F "file=@test.pdf"

# Persistence test
docker compose -f deploy/docker-compose.prod.yml restart
curl -f https://yourdomain.com/health
```

---

## Environment Variables

### Backend (`.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `ENVIRONMENT` | Yes | `production` |
| `API_KEY` | Yes | 32+ char random string |
| `CORS_ORIGINS` | Yes | `https://yourdomain.com` |
| `DATA_DIR` | Yes | `/app/data` |
| `QDRANT_URL` | No | `http://qdrant:6333` (internal) |
| `OLLAMA_URL` | No | `http://ollama:11434` (internal) |
| `LLM_MODEL` | No | `qwen2.5:3b` |
| `EMBEDDING_MODEL` | No | `nomic-embed-text` |
| `API_KEY` | **Yes** | `openssl rand -hex 32` |
| `TRUST_PROXY` | Yes | `true` (behind Caddy) |
| `RATE_LIMIT_ENABLED` | No | `true` |
| `NEXT_PUBLIC_API_URL` | Yes | `https://yourdomain.com/api` |

### Frontend (`.env.production`)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | `https://yourdomain.com/api` |
| `NEXT_PUBLIC_SUPABASE_URL` | No | Your Supabase URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | No | Your Supabase key |

---

## Volume Mapping

| Volume | Path in Container | Host Path |
|--------|-------------------|-----------|
| `backend_data` | `/app/data` | `/opt/mindmesh/data/app` |
| `uploads` | `/app/uploads` | `/opt/mindmesh/data/uploads` |
| `qdrant_storage` | `/qdrant/storage` | `/opt/mindmesh/data/qdrant` |
| `ollama_storage` | `/root/.ollama` | `/opt/mindmesh/data/ollama` |
| `caddy_data` | `/data` | Docker managed |
| `caddy_config` | `/config` | Docker managed |

---

## Ports

| Port | Service | Public | Purpose |
|------|---------|--------|---------|
| 80 | Caddy | Yes | HTTP → HTTPS redirect |
| 443 | Caddy | Yes | HTTPS |
| 8000 | Backend | No | Internal only |
| 3000 | Frontend | No | Internal only |
| 6333 | Qdrant | No | Internal only |
| 11434 | Ollama | No | Internal only |

---

## Health Checks

```bash
# Backend
curl -f http://localhost:8000/api/health

# Frontend
curl -f http://localhost:3000/

# Qdrant
curl -f http://localhost:6333/health

# Ollama
curl -f http://localhost:11434

# Caddy
curl -f http://localhost:2019/health
```

---

## Deployment Commands

### Build & Deploy
```bash
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

### View Logs
```bash
# All services
docker compose -f deploy/docker-compose.prod.yml logs -f

# Specific service
docker compose -f deploy/docker-compose.prod.yml logs -f backend
```

### Update Application
```bash
cd /opt/mindmesh/app
git pull
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

### Rollback
```bash
# Tag current before deploy: git tag deploy-$(date +%Y%m%d-%H%M)
# To rollback:
git checkout previous-tag
docker compose -f deploy/docker-compose.prod.yml up -d --build
```

### Backup
```bash
# Backup data volumes
sudo tar -czf mindmesh-backup-$(date +%Y%m%d).tar.gz -C /opt/mindmesh/data .

# Backup to GCS (optional)
gsutil cp mindmesh-backup-*.tar.gz gs://your-backup-bucket/
```

### Restore
```bash
# Stop services
docker compose -f deploy/docker-compose.prod.yml down

# Restore data
sudo tar -xzf mindmesh-backup-20240115.tar.gz -C /opt/mindmesh/data

# Restart
docker compose -f deploy/docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Backend won't start
```bash
docker compose -f deploy/docker-compose.prod.yml logs backend
# Check: Qdrant/Ollama connectivity, API_KEY set, env vars
```

### Frontend shows "API connection failed"
```bash
# Check Caddy config
docker compose -f deploy/docker-compose.prod.yml logs caddy
# Verify NEXT_PUBLIC_API_URL matches domain
```

### Ollama models not loading
```bash
docker compose -f deploy/docker-compose.prod.yml exec ollama ollama list
docker compose -f deploy/docker-compose.prod.yml exec ollama ollama pull qwen2.5:3b
```

### Out of memory
- Increase VM size or reduce model size
- Check: `docker stats`
- Adjust `deploy.resources.limits.memory` in docker-compose.prod.yml

### Certificate issues
```bash
# Force Caddy to retry
docker compose -f deploy/docker-compose.prod.yml restart caddy
# Check logs
docker compose -f deploy/docker-compose.prod.yml logs caddy
```

---

## Local vs Production Differences

| Aspect | Local (`docker-compose.dev.yml`) | Production (`docker-compose.prod.yml`) |
|--------|----------------------------------|----------------------------------------|
| Frontend | `npm run dev` (hot reload) | `npm run build && npm start` (standalone) |
| Ports | All on localhost | Only 80/443 via Caddy |
| Volumes | Bind mounts (live code) | Named volumes (persistent) |
| Auth | Disabled | `API_KEY` required |
| Rate Limit | Off | Enabled (120/min) |
| CORS | `localhost:3000` | Your domain |
| Health Checks | Basic | Comprehensive |
| Restart Policy | No | `unless-stopped` |
| Resource Limits | None | CPU/Memory limits |

---

## Security Checklist

- [ ] `API_KEY` is 32+ random characters
- [ ] `.env.production` not in git
- [ ] Caddyfile uses your real domain
- [ ] Firewall: Only 80/443/22 open
- [ ] Caddy auto-HTTPS working
- [ ] `TRUST_PROXY=true` in production
- [ ] `CORS_ORIGINS` set to your domain only
- [ ] `SSRF_BLOCK_PRIVATE=true`
- [ ] Qdrant/Ollama not exposed publicly
- [ ] Backups configured

---

## Cost Estimation (Google Cloud e2-standard-4)

| Resource | Monthly Cost (US) |
|----------|-------------------|
| VM (e2-standard-4, 4 vCPU, 16GB) | ~$130 |
| 100GB SSD Persistent Disk | ~$17 |
| Network egress (minimal) | ~$1 |
| **Total** | **~$148/month** |

*With Committed Use Discounts: ~40% less*

---

## Support

- Logs: `docker compose -f deploy/docker-compose.prod.yml logs -f`
- Metrics: `docker stats`
- Caddy admin: `curl localhost:2019/metrics`

For issues, check the GitHub repository issues page.