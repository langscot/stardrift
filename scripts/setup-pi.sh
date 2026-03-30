#!/bin/bash
# Run once to set up stardrift on the Pi
set -e

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_DIR"

echo "=== Stardrift Pi Setup ==="

# Create .env files if they don't exist
if [ ! -f .env.live ]; then
  cp .env.live.example .env.live
  echo "Created .env.live — fill in your bot token!"
fi

if [ ! -f .env.test ]; then
  cp .env.test.example .env.test
  echo "Created .env.test — fill in your test bot token!"
fi

# Login to ghcr.io (uses gh CLI auth)
echo "Logging in to GitHub Container Registry..."
echo $(gh auth token) | docker login ghcr.io -u langscot --password-stdin

# Start shared infrastructure
echo "Starting Postgres and Redis..."
docker compose up -d postgres redis

# Wait for postgres
echo "Waiting for Postgres..."
sleep 5
docker compose exec postgres pg_isready -U stellar

echo ""
echo "=== Setup complete! ==="
echo "Next steps:"
echo "  1. Edit .env.live with your production bot token"
echo "  2. Edit .env.test with your test bot token"
echo "  3. Run: bash scripts/update-live.sh"
echo "  4. Run: bash scripts/update-test.sh"
