# ==============================================================================
# SmartShule Standalone Frontend Dockerfile (Vite React + Nginx)
# ==============================================================================

# Stage 1: Build the React SPA
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Copy package manifests from smartshule directory
COPY smartshule/package*.json ./
RUN npm ci

# Copy application source
COPY smartshule/ ./

# Pass API URL during build (defaults to /api/v1)
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

# Build production assets into /app/dist
RUN npm run build

# Stage 2: Serve using Nginx
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
