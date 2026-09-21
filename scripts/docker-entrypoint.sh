#!/bin/sh
set -e

# Ensure data and upload directories exist with proper write permissions
mkdir -p /app/data/uploads /app/data/whatsapp_session

echo "===================================================="
echo "🚀 SmartShule School Management & CBC System"
echo "🌐 Environment : ${NODE_ENV:-production}"
echo "🔌 Service Port: ${PORT:-3000}"
echo "🗄️ Database    : ${DB_TYPE:-postgres}"
echo "📁 Working Dir : $(pwd)"
echo "===================================================="

# Execute the primary container command (defaults to node dist/index.js)
exec "$@"
