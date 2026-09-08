# ---------------------------------------------------------
# Stage 1: Build & Compilation
# ---------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package.json bun.lock* package-lock.json* ./

# Install all dependencies (including devDependencies for build)
RUN if [ -f bun.lock ]; then \
      npm install -g bun && bun install --frozen-lockfile; \
    elif [ -f package-lock.json ]; then \
      npm ci; \
    else \
      npm install; \
    fi

# Copy source code and configuration
COPY tsconfig.json vite.config.ts index.html server.ts ./
COPY src/ ./src/

# Compile frontend (dist/) and bundle backend server (dist/server.cjs)
RUN npm run build

# ---------------------------------------------------------
# Stage 2: Production Runtime
# ---------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Create application directories and establish non-root permissions
RUN mkdir -p /app/data && chown -R node:node /app

# Copy compiled artifacts from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy seed directory if required
COPY --chown=node:node data/ ./data/

# Switch to non-root user for security hardening
USER node

# Expose standard service port
EXPOSE 3000

# Healthcheck validating liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health/live || exit 1

# Start the self-contained production CommonJS server
CMD ["node", "dist/server.cjs"]
