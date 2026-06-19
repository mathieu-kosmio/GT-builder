# =============================================================================
# hocuspocus/ — serveur de co-édition temps réel (Yjs CRDT) sur WebSocket :1234
# =============================================================================

# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build && pnpm prune --prod

# ---------- runner ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=1234
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodejs
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 1234
CMD ["node", "dist/server.js"]
