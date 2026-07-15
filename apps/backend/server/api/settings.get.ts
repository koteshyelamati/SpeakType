import { defineEventHandler, createError } from 'h3';
import { eq } from 'drizzle-orm';
import { db, settings } from '~/server/db';
import { getAuth } from '~/server/utils/respond';
import { settingsSchema } from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);

  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.userId, userId),
    });

    const payload = row
      ? {
          language: row.language,
          preferredModel: row.preferredModel,
          autoCleanup: row.autoCleanup,
          requireConfirmation: row.requireConfirmation,
        }
      : {
          language: 'auto' as const,
          preferredModel: 'gemini-flash' as const,
          autoCleanup: true,
          requireConfirmation: true,
        };

    return settingsSchema.parse(payload);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Error fetching settings:', message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while fetching settings',
    });
  }
});
