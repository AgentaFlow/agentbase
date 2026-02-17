# ---- Build Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@9 --activate

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY packages/frontend/package.json packages/frontend/
COPY packages/shared/package.json packages/shared/

RUN pnpm install --frozen-lockfile 2>/dev/null || pnpm install

COPY packages/shared packages/shared
COPY packages/frontend packages/frontend

WORKDIR /app/packages/frontend

ARG NEXT_PUBLIC_API_URL=http://localhost:3001/api
ARG NEXT_PUBLIC_AI_URL=http://localhost:8000/api
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_AI_URL=$NEXT_PUBLIC_AI_URL

RUN npx next build

# ---- Production Stage ----
FROM node:20-alpine AS production
WORKDIR /app

RUN apk add --no-cache tini

COPY --from=builder /app/packages/frontend/.next/standalone ./
COPY --from=builder /app/packages/frontend/.next/static ./.next/static
COPY --from=builder /app/packages/frontend/public ./public

RUN addgroup -g 1001 -S agentbase && adduser -S agentbase -u 1001
USER agentbase

ENV NODE_ENV=production
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget -q --spider http://localhost:3000/ || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
