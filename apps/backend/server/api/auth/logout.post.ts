import { refreshSchema } from '@speaktype/shared';
import { getAuth } from '~/server/utils/respond';
import { revokeRefreshToken } from '~/server/utils/tokens';

export default defineEventHandler(async (event) => {
  // Requires Bearer auth (middleware sets event.context.auth)
  try {
    getAuth(event);
  } catch {
    setResponseStatus(event, 204);
    return {};
  }

  // If a refresh token is provided in the body, revoke it
  try {
    const body = await readBody(event).catch(() => null);
    if (body) {
      const parsed = refreshSchema.safeParse(body);
      if (parsed.success) {
        await revokeRefreshToken(parsed.data.refreshToken);
      }
    }
  } catch {
    // Never error — best-effort revocation
  }

  setResponseStatus(event, 204);
  return {};
});
