import { sql, eq, and, gte } from 'drizzle-orm';
import { db, usageLogs, quotaEvents } from '~/server/db';
import { QUOTA_SECONDS, type Plan, type SttProvider } from '@speaktype/shared';
import { getRedisClient } from '~/server/utils/redis';

/**
 * Retrieves the total seconds of transcription quota used by the user in the current UTC month.
 * Backed by Neon DB with a best-effort Upstash Redis cache.
 */
async function getUsedSeconds(userId: string): Promise<number> {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const yearMonth = `${yyyy}${mm}`;
  const key = `quota:${userId}:${yearMonth}`;

  const client = getRedisClient();
  if (client) {
    try {
      const cached = await client.get<number | string>(key);
      if (cached !== null) {
        return Number(cached);
      }
    } catch (err) {
      console.warn('Failed to read monthly quota from Redis, falling back to database:', err);
    }
  }

  // Fallback to database
  try {
    const startOfMonth = new Date(Date.UTC(yyyy, now.getUTCMonth(), 1));
    const result = await db
      .select({ sum: sql<number>`sum(${usageLogs.durationSeconds})` })
      .from(usageLogs)
      .where(and(eq(usageLogs.userId, userId), gte(usageLogs.createdAt, startOfMonth)));

    const used = Number(result[0]?.sum || 0);

    // Cache write-back
    if (client) {
      try {
        await client.set(key, used, { ex: 35 * 24 * 60 * 60 });
      } catch {
        // Ignore cache write failures
      }
    }

    return used;
  } catch (err) {
    console.error('Database query for monthly quota usage failed:', err);
    return 0; // Failure tolerance: return 0 if the query fails
  }
}

export const QuotaService = {
  /**
   * Retrieves the remaining quota seconds for a user based on their plan.
   */
  async getRemainingSeconds(userId: string, plan: Plan): Promise<number> {
    const used = await getUsedSeconds(userId);
    const limit = QUOTA_SECONDS[plan] || QUOTA_SECONDS.free;
    return Math.max(0, limit - used);
  },

  /**
   * Returns a complete Quota object matching quotaSchema.
   */
  async getQuota(userId: string, plan: Plan) {
    const used = await getUsedSeconds(userId);
    const limit = QUOTA_SECONDS[plan] || QUOTA_SECONDS.free;
    const remaining = Math.max(0, limit - used);

    return {
      secondsUsed: used,
      remainingSeconds: remaining,
      plan,
    };
  },

  /**
   * Records a transcription usage transaction. Updates DB audit history and increments cache.
   */
  async recordUsage(userId: string, durationSeconds: number, provider: SttProvider): Promise<void> {
    // 1. Insert database usage log
    await db.insert(usageLogs).values({
      userId,
      durationSeconds,
      provider,
    });

    // 2. Insert database quota debit event
    await db.insert(quotaEvents).values({
      userId,
      deltaSeconds: -durationSeconds,
      reason: `Transcription usage using ${provider}`,
    });

    // 3. Best-effort Redis monthly increment
    const client = getRedisClient();
    if (client) {
      const now = new Date();
      const yyyy = now.getUTCFullYear();
      const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
      const yearMonth = `${yyyy}${mm}`;
      const key = `quota:${userId}:${yearMonth}`;

      try {
        // If the key is not cached yet, doing getUsedSeconds first populates it
        const exists = await client.exists(key);
        if (exists) {
          await client.incrby(key, durationSeconds);
        } else {
          // Pre-populate key in cache by calling used seconds helper
          await getUsedSeconds(userId);
        }
      } catch (err) {
        console.warn('Failed to increment quota cache in Redis:', err);
      }
    }
  },
};

// Top-level function export as required by the contract
export async function getRemainingSeconds(userId: string, plan: Plan): Promise<number> {
  return QuotaService.getRemainingSeconds(userId, plan);
}
