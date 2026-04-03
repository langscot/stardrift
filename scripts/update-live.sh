#!/bin/bash
# Update and restart the live bot
# Usage: bash scripts/update-live.sh
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Stardrift Live Update ==="
echo "Pulling latest code..."
git pull

echo "Pulling latest image..."
docker compose -f docker-compose.live.yml pull

echo "Restarting live bot..."
docker compose -f docker-compose.live.yml up -d --force-recreate

echo "Running migrations on live DB..."
docker exec stardrift-bot-live pnpm db:migrate 2>/dev/null || \
  docker run --rm \
    --network stardrift-network \
    -e DATABASE_URL="postgresql://stellar:${POSTGRES_PASSWORD:-stellar_password}@stardrift-postgres:5432/stardrift_live" \
    ghcr.io/langscot/stardrift:latest \
    pnpm db:migrate

echo "Done! Live bot updated."
docker logs stardrift-bot-live --tail 10
