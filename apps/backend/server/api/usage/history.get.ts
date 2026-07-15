import { defineEventHandler, createError } from 'h3';
import { eq, desc } from 'drizzle-orm';
import { db, usageLogs } from '~/server/db';
import { getAuth } from '~/server/utils/respond';
import { usageHistorySchema } from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);

  try {
    const logs = await db
      .select()
      .from(usageLogs)
      .where(eq(usageLogs.userId, userId))
      .orderBy(desc(usageLogs.createdAt))
      .limit(100);

    const entries = logs.map((log) => ({
      id: log.id,
      createdAt: log.createdAt.toISOString(),
      durationSeconds: log.durationSeconds,
      provider: log.provider,
    }));

    return usageHistorySchema.parse({ entries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Error fetching usage history:', message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while fetching usage history',
    });
  }
});
