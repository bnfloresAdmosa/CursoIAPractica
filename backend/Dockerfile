# syntax=docker/dockerfile:1.7
# Mini Jira API — multi-stage build
# Stage 1: deps      — install production-only deps (cached)
# Stage 2: builder   — install all deps, prisma generate, tsc compile
# Stage 3: runner    — minimal runtime image with dist + production deps

# ─── Stage 1: deps ────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

# Habilita pnpm vía corepack
RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# ─── Stage 2: builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@latest --activate

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm prisma generate

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build

# ─── Stage 3: runner ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
RUN apk add --no-cache openssl libc6-compat
WORKDIR /app

ENV NODE_ENV=production

# Usuario no-root para reducir blast radius si el container es comprometido
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 minijira

# Copiar deps de producción
COPY --from=deps --chown=minijira:nodejs /app/node_modules ./node_modules
# Copiar prisma client generado en builder
COPY --from=builder --chown=minijira:nodejs /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder --chown=minijira:nodejs /app/node_modules/@prisma ./node_modules/@prisma
# Copiar bundle compilado y prisma schema (para migraciones runtime si aplica)
COPY --from=builder --chown=minijira:nodejs /app/dist ./dist
COPY --from=builder --chown=minijira:nodejs /app/prisma ./prisma
COPY --chown=minijira:nodejs package.json ./

USER minijira

EXPOSE 3030

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3030/api/v1/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

CMD ["node", "dist/server.js"]
