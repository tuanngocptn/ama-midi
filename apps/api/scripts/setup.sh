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
npx wrangler d1 migrations apply ama-midi-db --local
echo "   ✓ Migrations applied"

# 3. Start API server in background for seeding
echo ""
echo "3. Starting API server for seeding..."
npx wrangler dev &
API_PID=$!

cleanup() {
  echo ""
  echo "Stopping API server (PID $API_PID)..."
  kill "$API_PID" 2>/dev/null || true
  wait "$API_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Wait for API to be ready
echo "   Waiting for API to be ready..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8787/api/auth/login > /dev/null 2>&1; then
    echo "   ✓ API is ready"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "   ✗ API failed to start after 30s"
    exit 1
  fi
  sleep 1
done

# 4. Run seed script
echo ""
echo "4. Running seed script..."
npx tsx scripts/seed.ts

echo ""
echo "=== Setup complete! ==="
