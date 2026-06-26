#!/bin/bash
# Start Events Ledger dev environment
# Usage: ./dev.sh

REPO="$(cd "$(dirname "$0")" && pwd)"

echo "Starting backend (port 8001)..."
cd "$REPO/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!

echo "Starting frontend (port 4321)..."
cd "$REPO/frontend"
npm run dev -- --port 4321 &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8001"
echo "  Frontend: http://localhost:4321"
echo ""
echo "Press Ctrl+C to stop both."

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
