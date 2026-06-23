# ---- Build Stage ----
FROM mcr.microsoft.com/azurelinux/base/nodejs:20 AS builder
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm@9

# Copy workspace config and registry settings
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/core/package.json packages/core/
COPY packages/shared/package.json packages/shared/

# Inject Azure Artifacts auth token; strip it after install so the layer has no creds
ARG AZURE_ARTIFACTS_TOKEN
RUN if [ -n "${AZURE_ARTIFACTS_TOKEN}" ]; then \
      echo "//pkgs.dev.azure.com/agentaflow/agentbase/_packaging/python/npm/registry/:_authToken=${AZURE_ARTIFACTS_TOKEN}" >> .npmrc; \
    fi
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
RUN sed -i '/_authToken/d' .npmrc

# Copy source
COPY packages/shared packages/shared
COPY packages/core packages/core
COPY tsconfig.json ./

# Build
WORKDIR /app/packages/core
RUN npx nest build

# ---- Production Stage ----
FROM mcr.microsoft.com/azurelinux/base/nodejs:20 AS production
WORKDIR /app

RUN npm install -g pnpm@9
RUN tdnf install -y wget shadow-utils && tdnf clean all

# Copy built app
COPY --from=builder /app/packages/core/dist ./dist
COPY --from=builder /app/packages/core/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Non-root user
RUN groupadd -g 1001 agentbase && useradd -u 1001 -g agentbase -s /sbin/nologin -M agentbase
USER agentbase

ENV NODE_ENV=production
EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3001/api/health || exit 1

CMD ["node", "dist/main.js"]
