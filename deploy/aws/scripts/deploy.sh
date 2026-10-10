#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
"$root/scripts/preflight.sh"
cd "$root"
docker compose --env-file .env -f compose.yaml up -d --build --remove-orphans
docker compose --env-file .env -f compose.yaml ps
