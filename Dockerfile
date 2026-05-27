FROM node:22-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10.18.0 --activate

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Migrator: drizzle-kit lives in devDependencies and isn't in the standalone
# bundle, so ship a parallel /migrator dir with full deps + schema for startup `push`.
COPY --from=deps --chown=nextjs:nodejs /app/node_modules /migrator/node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json /migrator/package.json
COPY --from=builder --chown=nextjs:nodejs /app/drizzle.config.ts /migrator/drizzle.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/src/db/schema.ts /migrator/src/db/schema.ts

COPY --from=builder --chown=nextjs:nodejs /app/scripts/seed-admin-pin.mjs /app/scripts/seed-admin-pin.mjs

COPY --chown=nextjs:nodejs docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["/docker-entrypoint.sh"]
