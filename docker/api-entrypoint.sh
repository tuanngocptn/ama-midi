#!/usr/bin/env bash
set -euo pipefail

cd /app/apps/api

echo "=== AMA-MIDI API ==="

# 1. If seeding, start fresh
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "Removing old database..."
  rm -rf .wrangler/state
  echo "✓ Old database deleted"
fi

# 2. Run migrations
echo "Running database migrations..."
npx wrangler d1 migrations apply ama-midi-db --local --env dev
echo "✓ Migrations applied"

# 3. Optionally seed (pure SQL, no server needed)
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo ""
  echo "Running seed script..."
  npx tsx scripts/seed.ts
  echo "✓ Seed complete"
fi

# 4. Start the API server
echo ""
echo "Starting API server..."
exec npx wrangler dev --env dev --ip 0.0.0.0 --port 8787
