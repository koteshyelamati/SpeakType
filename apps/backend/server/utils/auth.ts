import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '../db';
import { user, session, account, verification } from '../db/auth-schema';

const secret =
  typeof useRuntimeConfig !== 'undefined'
    ? (useRuntimeConfig().betterAuthSecret as string)
    : process.env.BETTER_AUTH_SECRET;

const baseURL =
  typeof useRuntimeConfig !== 'undefined'
    ? (useRuntimeConfig().betterAuthUrl as string) || 'http://localhost:3000'
    : process.env.BETTER_AUTH_URL || 'http://localhost:3000';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: { user, session, account, verification },
  }),
  emailAndPassword: {
    enabled: true,
  },
  secret: secret as string,
  baseURL: baseURL,
  advanced: {
    database: {
      generateId: () => crypto.randomUUID(),
    },
  },
});
