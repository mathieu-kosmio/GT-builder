# =============================================================================
# public-site/ — site public des livrables publiés (Astro 5 SSR, node standalone :4321)
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
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4321
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nodejs
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --from=build --chown=nodejs:nodejs /app/node_modules ./node_modules
USER nodejs
EXPOSE 4321
CMD ["node", "./dist/server/entry.mjs"]
