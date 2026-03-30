#!/bin/bash
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Stardrift Test Update ==="
git pull
docker compose -f docker-compose.test.yml pull
docker compose -f docker-compose.test.yml up -d --force-recreate
docker run --rm \
  --network stardrift-network \
  -e DATABASE_URL="postgresql://stellar:stellar_password@stardrift-postgres:5432/stardrift_test" \
  ghcr.io/langscot/stardrift:latest \
  pnpm db:migrate
echo "Done! Test bot updated."
docker logs stardrift-bot-test --tail 10
