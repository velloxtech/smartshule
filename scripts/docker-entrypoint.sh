#!/bin/sh
set -e

# Ensure data directories exist with write access
mkdir -p /app/data/uploads /app/data/whatsapp_session 2>/dev/null || true

echo "===================================================="
echo "🏫 Grace Seeds School Management & CBC System"
echo "🌐 Environment : ${NODE_ENV:-production}"
echo "🔌 Service Port: ${PORT:-3000}"
echo "🗄️ Database    : ${DB_TYPE:-postgres}"
echo "📁 Working Dir : $(pwd)"
echo "👤 Runtime User: $(whoami)"
echo "===================================================="

# Optional automatic database bootstrap on container start if AUTO_BOOTSTRAP=true
if [ "$AUTO_BOOTSTRAP" = "true" ]; then
  echo "🌱 Running Grace Seeds School production bootstrap..."
  node dist/scripts/bootstrap-production.js || echo "⚠️ Bootstrap process finished."
fi

# Execute primary container command (e.g., node dist/index.js)
exec "$@"
