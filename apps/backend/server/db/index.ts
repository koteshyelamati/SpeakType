import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import * as schema from './schema';
import * as authSchema from './auth-schema';

// Neon's serverless Pool talks over WebSockets, which don't exist by default in a
// Node runtime (nuxt dev / node server) — without one, every query fails with
// "Unknown database error". Node 22+ ships a global WebSocket, so use it (no need
// for the optional `ws` dependency). `poolQueryViaFetch` additionally routes
// one-shot queries over HTTP fetch, the most reliable path outside the edge.
if (typeof globalThis.WebSocket !== 'undefined') {
  neonConfig.webSocketConstructor = globalThis.WebSocket as typeof neonConfig.webSocketConstructor;
}
neonConfig.poolQueryViaFetch = true;

const databaseUrl =
  typeof useRuntimeConfig !== 'undefined'
    ? (useRuntimeConfig().databaseUrl as string | undefined)
    : process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Database connection string is missing from runtime config');
}

const pool = new Pool({ connectionString: databaseUrl });

// Include the BetterAuth tables (user/session/account/verification) so the
// Drizzle instance — and therefore the BetterAuth drizzleAdapter — can resolve them.
export const db = drizzle(pool, { schema: { ...schema, ...authSchema } });

export * from './schema';
