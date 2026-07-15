import { defineConfig } from 'drizzle-kit';

if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error('DATABASE_URL_UNPOOLED environment variable is required');
}

export default defineConfig({
  dialect: 'postgresql',
  schema: ['./server/db/schema.ts', './server/db/auth-schema.ts'],
  out: './server/db/migrations',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED,
  },
});
