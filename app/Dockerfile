# =============================================================================
# app/ — image unique servant DEUX rôles (cf. docker-compose) :
#   - service "app"    -> Next.js (CMD par défaut : node server.js)
#   - service "worker" -> override command: ["node", "dist/worker.js"]
#
# Piège : `output: standalone` ne trace QUE les deps atteignables par Next.
# pg/bullmq/ioredis (worker seulement) en sont absents -> on copie en plus un
# node_modules de production complet pour couvrir les deux usages.
# =============================================================================

# ---------- deps ----------
FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# ---------- build ----------
FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm run build
# Élague les devDeps : l'image finale ne garde que le runtime de production.
RUN pnpm prune --prod

# ---------- runner ----------
FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodejs

# 1) Sortie Next standalone (server.js + .next/server + node_modules tracé)
COPY --from=build --chown=nodejs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nodejs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nodejs:nodejs /app/public ./public

# 2) Worker bundle + node_modules de prod complet (deps non tracées par Next)
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules

USER nodejs
EXPOSE 3000
# Défaut = Next. Le service worker écrase par command: ["node","dist/worker.js"].
CMD ["node", "server.js"]
