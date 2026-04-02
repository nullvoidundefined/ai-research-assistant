#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
PIDS=()

cleanup() {
  echo "Cleaning up..."
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup EXIT

echo "=== Smoke Test: ai-research-assistant ==="

# Start server (PORT=3002 from .env)
cd "$PROJECT_DIR/packages/server"
PORT=3002 npx tsx src/index.ts &>/dev/null &
PIDS+=($!)

# Start worker
cd "$PROJECT_DIR/packages/worker"
npx tsx src/index.ts &>/dev/null &
PIDS+=($!)

# Start web-client
cd "$PROJECT_DIR/packages/web-client"
npx next dev --port 3000 &>/dev/null &
PIDS+=($!)

echo "Waiting for services to start..."

# Wait for server (port 3002)
for i in $(seq 1 20); do
  if curl -s -o /dev/null http://localhost:3002/health 2>/dev/null; then
    echo "Server ready on port 3002"
    break
  fi
  if [ "$i" -eq 20 ]; then
    echo "FAIL: Server did not start on port 3002 within 20 seconds"
    exit 1
  fi
  sleep 1
done

# Wait for frontend (port 3000)
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3000 2>/dev/null; then
    echo "Frontend ready on port 3000"
    break
  fi
  if [ "$i" -eq 30 ]; then
    echo "FAIL: Frontend did not start on port 3000 within 30 seconds"
    exit 1
  fi
  sleep 1
done

# Run health checks
"$SCRIPT_DIR/health-check.sh" http://localhost:3002 http://localhost:3000 false
