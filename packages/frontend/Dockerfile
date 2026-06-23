# ---- Build Stage ----
FROM mcr.microsoft.com/azurelinux/base/nodejs:20 AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

# Copy workspace config and registry settings
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* .npmrc ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/

# Inject Azure Artifacts auth token; strip it after install so the layer has no creds
ARG AZURE_ARTIFACTS_TOKEN
RUN if [ -n "${AZURE_ARTIFACTS_TOKEN}" ]; then \
      echo "//pkgs.dev.azure.com/agentaflow/agentbase/_packaging/python/npm/registry/:_authToken=${AZURE_ARTIFACTS_TOKEN}" >> .npmrc; \
    fi
RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install
RUN sed -i '/_authToken/d' .npmrc

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

WORKDIR /app/packages/frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_AI_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AI_URL=$NEXT_PUBLIC_AI_URL

RUN npx next build

# ---- Production Stage ----
FROM mcr.microsoft.com/azurelinux/base/nodejs:20 AS production
WORKDIR /app

RUN tdnf install -y wget shadow-utils && tdnf clean all

COPY --from=builder /app/packages/frontend/.next/standalone ./
COPY --from=builder /app/packages/frontend/.next/static ./.next/static
COPY --from=builder /app/packages/frontend/public ./public

RUN groupadd -g 1001 agentbase && useradd -u 1001 -g agentbase -s /sbin/nologin -M agentbase
USER agentbase

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
