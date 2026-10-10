#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
test -f .env || { echo "Missing deploy/aws/.env (copy .env.example)." >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required." >&2; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose v2 is required." >&2; exit 1; }
grep -q '^MINDMESH_EXECUTION_MODE=cloud$' .env || { echo "AWS requires MINDMESH_EXECUTION_MODE=cloud." >&2; exit 1; }
grep -q '^JOB_BACKEND=postgres$' .env || { echo "AWS requires JOB_BACKEND=postgres." >&2; exit 1; }
grep -q '^AUTH_ENABLED=true$' .env || { echo "AWS requires AUTH_ENABLED=true." >&2; exit 1; }
docker compose --env-file .env -f compose.yaml config --quiet
echo "Preflight passed. No services were started."
