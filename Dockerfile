# ==============================================================================
# SmartShule CBC Management Platform - Unified Full-Stack Dockerfile
# Optimized for Render Web Service (and other Docker container runtimes)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React / Vite Frontend
# ------------------------------------------------------------------------------
  FROM node:22-bookworm-slim AS frontend-builder
  WORKDIR /app/Frontend/smartshule
  
  # Copy frontend dependency manifests
  COPY Frontend/smartshule/package*.json ./
  
  # Install all frontend dependencies
  RUN npm ci
  
  # Copy frontend source code and configuration
  COPY Frontend/smartshule/ ./
  
  # Relative API base URL ensures all browser requests target the unified container
  ENV VITE_API_URL=/api/v1
  
  # Build production assets (outputs to /app/Frontend/smartshule/dist)
  RUN npm run build
  
  
  # ------------------------------------------------------------------------------
  # Stage 2: Build the Node.js / TypeScript Backend
  # ------------------------------------------------------------------------------
  FROM node:22-bookworm-slim AS backend-builder
  WORKDIR /app
  
  # Copy root backend dependency manifests
  COPY package*.json ./
  
  # Install backend dependencies (including devDependencies required for tsc)
  RUN npm ci
  
  # Copy backend TypeScript source code and configuration
  COPY tsconfig.json ./
  COPY src/ ./src/
  
  # Compile TypeScript into JavaScript (outputs to /app/dist)
  # Note: DB access uses `pg` + initializeSchema; Prisma generate is not required at build time.
  RUN npm run build
  
  
  # ------------------------------------------------------------------------------
  # Stage 3: Production Runner Image
  # ------------------------------------------------------------------------------
  FROM node:22-bookworm-slim AS runner
  WORKDIR /app
  
  # Default production environment variables
  ENV NODE_ENV=production
  ENV PORT=3000
  ENV DB_TYPE=postgres
  
  # Install lightweight runtime dependencies (curl for health check, openssl, ca-certificates)
  RUN apt-get update && \
      apt-get install -y --no-install-recommends curl openssl ca-certificates && \
      rm -rf /var/lib/apt/lists/*
  
  # Copy backend dependency manifests
  COPY package*.json ./
  
  # Install production-only dependencies
  RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
  
  # Copy compiled backend from backend-builder
  COPY --from=backend-builder /app/dist ./dist
  
  # Copy built frontend assets into the Frontend folder structure
  # Express automatically serves this from /app/Frontend/smartshule/dist
  COPY --from=frontend-builder /app/Frontend/smartshule/dist ./Frontend/smartshule/dist
  
  # Copy startup script
  COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
  RUN chmod +x /usr/local/bin/docker-entrypoint.sh
  
  # Create persistent storage directories for uploads and WhatsApp session tokens
  RUN mkdir -p /app/data/uploads /app/data/whatsapp_session && \
      chmod -R 777 /app/data
  
  # Expose default application port (Render maps this dynamically via $PORT)
  EXPOSE 3000
  
  # Container health check against /health endpoint
  HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1
  
  # Start container using entrypoint script
  ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
  CMD ["node", "dist/index.js"]
  