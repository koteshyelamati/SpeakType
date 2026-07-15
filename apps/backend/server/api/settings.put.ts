import { defineEventHandler, createError } from 'h3';
import { eq } from 'drizzle-orm';
import { db, settings } from '~/server/db';
import { getAuth, fail, validateBody } from '~/server/utils/respond';
import { settingsSchema, updateSettingsSchema } from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);

  // 1. Consistent body validation via shared helper
  const validation = await validateBody(event, updateSettingsSchema);
  if (!validation.success) {
    return fail(event, 400, validation.error, 'VALIDATION_ERROR');
  }

  const updates = validation.data;

  try {
    const existing = await db.query.settings.findFirst({
      where: eq(settings.userId, userId),
    });

    let finalSettings;

    if (existing) {
      const valuesToSet = {
        ...(updates.language && { language: updates.language }),
        ...(updates.preferredModel && { preferredModel: updates.preferredModel }),
        ...(updates.autoCleanup !== undefined && { autoCleanup: updates.autoCleanup }),
        ...(updates.requireConfirmation !== undefined && {
          requireConfirmation: updates.requireConfirmation,
        }),
        updatedAt: new Date(),
      };

      await db.update(settings).set(valuesToSet).where(eq(settings.userId, userId));

      finalSettings = {
        language: updates.language ?? existing.language,
        preferredModel: updates.preferredModel ?? existing.preferredModel,
        autoCleanup: updates.autoCleanup !== undefined ? updates.autoCleanup : existing.autoCleanup,
        requireConfirmation:
          updates.requireConfirmation !== undefined
            ? updates.requireConfirmation
            : existing.requireConfirmation,
      };
    } else {
      const newRow = {
        userId,
        language: updates.language ?? ('auto' as const),
        preferredModel: updates.preferredModel ?? ('gemini-flash' as const),
        autoCleanup: updates.autoCleanup !== undefined ? updates.autoCleanup : true,
        requireConfirmation:
          updates.requireConfirmation !== undefined ? updates.requireConfirmation : true,
      };

      await db.insert(settings).values(newRow);

      finalSettings = {
        language: newRow.language,
        preferredModel: newRow.preferredModel,
        autoCleanup: newRow.autoCleanup,
        requireConfirmation: newRow.requireConfirmation,
      };
    }

    return settingsSchema.parse(finalSettings);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown database error';
    console.error('Error updating settings:', message);
    throw createError({
      statusCode: 500,
      statusMessage: 'Internal server error while saving settings',
    });
  }
});
