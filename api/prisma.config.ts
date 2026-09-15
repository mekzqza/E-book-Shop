import { defineConfig } from 'prisma/config';

try { process.loadEnvFile(); } catch {} // .env is optional, docker passes real env vars

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env.DATABASE_URL },
});
