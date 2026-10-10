#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
target="${1:?Usage: rollback.sh <known-good-image-tag>}"
IMAGE_TAG="$target" docker compose --env-file .env -f compose.yaml up -d --no-build
echo "Requested rollback to immutable tag: $target. Persistent volumes were not removed."
