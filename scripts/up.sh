#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if docker info >/dev/null 2>&1; then
  DOCKER=(docker)
else
  DOCKER=(sudo docker)
fi
"${DOCKER[@]}" compose -f infra/compose.yaml up -d
echo "Postgres, Redis, and MinIO are starting."
