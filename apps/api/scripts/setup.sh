#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$API_DIR"

echo "=== AMA-MIDI Database Setup ==="
echo ""

# 1. Delete old local database
echo "1. Removing old local database..."
rm -rf .wrangler/state
echo "   ✓ Old database deleted"

# 2. Run migrations to create fresh database
echo ""
echo "2. Running migrations..."
npx wrangler d1 migrations apply ama-midi-db --local --env dev
echo "   ✓ Migrations applied"

# 3. Generate & execute seed SQL (no API server needed)
echo ""
echo "3. Running seed script..."
npx tsx scripts/seed.ts

echo ""
echo "=== Setup complete! ==="
