# Multi-stage Dockerfile for NestJS API (@cmhub/api)
FROM node:20-alpine AS base
WORKDIR /app

# Stage 1: Build
FROM base AS builder
COPY package*.json turbo.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci

COPY packages/shared-types ./packages/shared-types
COPY apps/api ./apps/api

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
RUN npm run build --workspace=@cmhub/api

# Stage 2: Production Dependencies
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=3001

COPY package*.json ./
COPY apps/api/package*.json ./apps/api/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm ci --omit=dev

COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3001
CMD ["node", "apps/api/dist/main"]
