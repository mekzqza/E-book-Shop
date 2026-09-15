# --- build: full deps, prisma generate + tsc
FROM node:24-alpine AS build
# openssl: Prisma's migration engine needs it on Alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- migrate: one-shot job (compose service `migrate`), keeps the Prisma CLI out of the api image
FROM build AS migrate
# no telemetry, and no config-loader cache writes into root-owned node_modules
ENV CHECKPOINT_DISABLE=1 JITI_FS_CACHE=false
USER node
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy && node dist/seed.js"]

# --- deps: production only
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# --omit=optional drops the Prisma CLI (optional peer of @prisma/client);
# the find drops query compilers for databases we don't use (~50 MB)
RUN npm ci --omit=dev --omit=optional \
 && find node_modules/@prisma/client/runtime \( -name '*.mysql.*' -o -name '*.sqlite.*' -o -name '*.sqlserver.*' -o -name '*.cockroachdb.*' \) -delete \
 && npm cache clean --force

# --- runtime
FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json ./
COPY files ./files
USER node
EXPOSE 4000
CMD ["node", "dist/index.js"]
