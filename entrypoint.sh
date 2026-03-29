#!/bin/sh
set -e

echo "=== Stardrift Bot ==="

# Run DB migrations
echo "Running database migrations..."
pnpm drizzle-kit migrate

# Seed the galaxy (script is idempotent — skips if already seeded)
echo "Checking galaxy seed..."
node dist/scripts/generate-galaxy.js

# Start the bot
echo "Starting bot..."
exec node dist/index.js
