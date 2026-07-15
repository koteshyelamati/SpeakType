import { defineEventHandler, createError } from 'h3';
import { userSchema } from '@speaktype/shared';
import { sql } from 'drizzle-orm';
import { getAuth, fail, resolvePlan } from '~/server/utils/respond';
import { db } from '~/server/db';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);

  let userRecord: { id: string; email: string; name: string | null } | undefined;

  try {
    // Load the BetterAuth user row from the "user" table
    const result = await db.execute(
      sql`SELECT id, email, name FROM "user" WHERE "id" = ${userId} LIMIT 1`,
    );
    const rows = result.rows as { id: string; email: string; name: string | null }[];
    userRecord = rows[0];
  } catch (err) {
    console.error('Database system failure during user lookup:', err);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal Database Server Error',
    });
  }

  if (!userRecord) {
    return fail(event, 404, 'Authenticated user profile not found', 'USER_NOT_FOUND');
  }

  // Centrally resolve subscription plan (DRY)
  const plan = await resolvePlan(userId);

  const response = {
    id: userRecord.id,
    email: userRecord.email,
    name: userRecord.name ?? null,
    plan,
  };

  return userSchema.parse(response);
});
