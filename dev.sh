#!/bin/bash
# Start Events Ledger dev environment
# Backend:  http://localhost:8010
# Frontend: http://localhost:4340

REPO="$(cd "$(dirname "$0")" && pwd)"

# Kill anything already on these ports
lsof -ti :8010 | xargs kill -9 2>/dev/null
lsof -ti :4340 | xargs kill -9 2>/dev/null

echo "Starting backend on :8010..."
cd "$REPO/backend"
source .venv/bin/activate
uvicorn app.main:app --reload --port 8010 &
BACKEND_PID=$!

echo "Starting frontend on :4340..."
cd "$REPO/frontend"
npm run dev -- --port 4340 &
FRONTEND_PID=$!

echo ""
echo "  Backend:  http://localhost:8010"
echo "  Frontend: http://localhost:4340"
echo ""
echo "Press Ctrl+C to stop both."

trap "echo 'Stopping...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT INT TERM
wait
