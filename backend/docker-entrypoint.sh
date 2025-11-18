#!/bin/bash
set -e

echo "🚀 Starting backend entrypoint..."

# Wait for database to be ready using pg_isready
echo "⏳ Waiting for database to be ready..."
until pg_isready -h db -p 5432 -U postgres > /dev/null 2>&1; do
  echo "   Database is unavailable - sleeping..."
  sleep 2
done

echo "✅ Database is ready!"

# Run migrations
echo "📊 Running database migrations..."
python migrations/run_migrations.py

# Verify setup (optional, for debugging)
if [ "${VERIFY_SETUP:-false}" = "true" ]; then
    echo "🔍 Verifying Docker setup..."
    python verify_docker_setup.py || echo "⚠️  Setup verification failed, but continuing..."
fi

# Start the application
echo "🔧 Starting FastAPI application..."
echo "✅ Backend will be available at http://localhost:8000"
echo "✅ Frontend will be available at http://localhost:3000"
echo ""
exec uvicorn app.main:app --host 0.0.0.0 --port 8000
