FROM node:24-alpine AS base
# openssl: Prisma's migration engine needs it on Alpine
RUN apk add --no-cache openssl
WORKDIR /app

FROM base AS build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

FROM base
ENV NODE_ENV=production PORT=4000 CHECKPOINT_DISABLE=1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json prisma.config.ts ./
COPY prisma ./prisma
COPY files ./files
USER node
EXPOSE 4000
# migrations + idempotent seed on every start, then hand PID over to node
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/seed.js && exec node dist/index.js"]
