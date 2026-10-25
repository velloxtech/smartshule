# ==============================================================================
# Grace Seeds School Management & CBC Platform - Unified Full-Stack Dockerfile
# Optimized for Production Container Runtimes (Render, Fly, AWS ECS, Docker Compose)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build the React / Vite Frontend
# ------------------------------------------------------------------------------
FROM node:22-bookworm-slim AS frontend-builder
WORKDIR /app/Frontend/smartshule

# Limit V8 heap memory to avoid OOM in container build environments
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Configure npm network resilience to prevent ECONNRESET and transient network drops
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 5

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

# Limit V8 heap memory to avoid OOM in container build environments
ENV NODE_OPTIONS="--max-old-space-size=1536"

# Sequence dependency: ensure frontend-builder completes before backend build starts
# This avoids memory contention between concurrent npm ci operations
COPY --from=frontend-builder /app/Frontend/smartshule/dist ./Frontend/smartshule/dist

# Configure npm network resilience to prevent ECONNRESET and transient network drops
RUN npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000 && \
    npm config set fetch-timeout 300000 && \
    npm config set maxsockets 5

# Copy root backend dependency manifests
COPY package*.json ./

# Install backend dependencies (including devDependencies required for tsc)
RUN npm ci

# Copy backend TypeScript source code and configuration
COPY tsconfig.json ./
COPY src/ ./src/
COPY scripts/ ./scripts/

# Compile TypeScript into JavaScript (outputs to /app/dist)
RUN npm run build

# Prune development dependencies in-place to leave clean production node_modules
# Eliminates redundant secondary network downloads in the runner stage
RUN npm prune --omit=dev --ignore-scripts


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

# Copy production node_modules from backend-builder (zero network download, immune to ECONNRESET)
COPY --from=backend-builder /app/node_modules ./node_modules

# Copy compiled backend from backend-builder
COPY --from=backend-builder /app/dist ./dist

# Copy built frontend assets into the Frontend folder structure
# Express automatically serves this from /app/Frontend/smartshule/dist
COPY --from=backend-builder /app/Frontend/smartshule/dist ./Frontend/smartshule/dist

# Copy startup script
COPY scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create persistent storage directories for uploads and WhatsApp session tokens
# and assign ownership of /app/data to the non-root 'node' user
RUN mkdir -p /app/data/uploads /app/data/whatsapp_session && \
    chown -R node:node /app/data

# Expose default application port (Render maps this dynamically via $PORT)
EXPOSE 3000

# Container health check against /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Enforce non-root execution
USER node

# Start container using entrypoint script
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
