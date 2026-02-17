# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/core/package.json packages/core/
COPY packages/shared/package.json packages/shared/

# Install dependencies
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

# Copy source
COPY packages/shared packages/shared
COPY packages/core packages/core
COPY tsconfig.json ./

# Build
WORKDIR /app/packages/core
RUN npx nest build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate
RUN apk add --no-cache tini

# Copy built app
COPY --from=builder /app/packages/core/dist ./dist
COPY --from=builder /app/packages/core/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Non-root user
RUN addgroup -g 1001 -S agentbase && adduser -S agentbase -u 1001
USER agentbase

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
