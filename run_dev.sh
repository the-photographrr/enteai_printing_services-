#!/bin/bash

# Exit on error
set -e

echo "========================================================="
echo "               ENTE.PrintLabs Dev Starter                "
echo "========================================================="

# 1. Kill any existing servers running on ports 8000 and 3000
echo "Cleaning up ports 8000 and 3000..."
fuser -k 8000/tcp || true
fuser -k 3000/tcp || true

# 2. Start Django Backend
echo "Starting Django API backend on http://localhost:8000..."
source backend/.venv/bin/activate
python backend/manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# 3. Start Next.js Frontend
echo "Starting Next.js frontend on http://localhost:3000..."
cd frontend
npm run dev -- -p 3000 &
FRONTEND_PID=$!

# Handle shutdown
cleanup() {
    echo ""
    echo "Shutting down servers..."
    kill $BACKEND_PID || true
    kill $FRONTEND_PID || true
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "---------------------------------------------------------"
echo "Servers are running! Press Ctrl+C to stop both."
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:8000"
echo "========================================================="

# Keep script running
wait
