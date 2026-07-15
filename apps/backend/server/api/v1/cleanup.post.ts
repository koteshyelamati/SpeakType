import { defineEventHandler } from 'h3';
import { getAuth, fail, validateBody } from '~/server/utils/respond';
import { CleanupService } from '~/server/services/cleanup';
import { cleanupRequestSchema, cleanupResponseSchema } from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  // Ensure the request is authenticated
  getAuth(event);

  // 1. Consistent body validation via shared helper
  const validation = await validateBody(event, cleanupRequestSchema);
  if (!validation.success) {
    return fail(event, 400, validation.error, 'VALIDATION_ERROR');
  }

  const { transcript, cleanupMode, websiteContext } = validation.data;

  try {
    const result = await CleanupService.clean({
      transcript,
      cleanupMode,
      websiteContext,
    });

    return cleanupResponseSchema.parse(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cleanup processing failed';
    console.error('Error during AI cleanup route handler:', message);
    return fail(event, 500, 'Internal server error during text cleanup processing');
  }
});
