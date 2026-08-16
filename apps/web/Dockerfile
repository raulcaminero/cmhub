# Multi-stage Dockerfile for Next.js Web Frontend (@cmhub/web)
FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Build
FROM base AS builder
COPY package*.json turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci

COPY packages/shared-types ./packages/shared-types
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace=@cmhub/shared-types
RUN npm run build --workspace=@cmhub/web

# Stage 2: Production Runner
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3000
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web/package.json ./apps/web/package.json

USER nextjs

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@cmhub/web"]
