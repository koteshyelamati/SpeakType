import { defineEventHandler } from 'h3';
import { refreshSchema, authTokensSchema } from '@speaktype/shared';
import { db, auditLogs } from '~/server/db';
import { signAccessToken } from '~/server/utils/tokens';
import { rotateRefreshToken, issueRefreshToken } from '~/server/utils/tokens';
import { fail, validateBody, resolvePlan } from '~/server/utils/respond';

export default defineEventHandler(async (event) => {
  // 1. Consistent body validation via shared helper
  const validation = await validateBody(event, refreshSchema);
  if (!validation.success) {
    return fail(event, 400, validation.error, 'VALIDATION_ERROR');
  }

  const { refreshToken: rawToken } = validation.data;

  // 2. Separate database outages (500) from expired/invalid tokens (401)
  let rotated;
  try {
    rotated = await rotateRefreshToken(rawToken);
  } catch (err) {
    console.error('System/Database failure during refresh token rotation:', err);
    return fail(event, 500, 'Token rotation service is temporarily unavailable');
  }

  if (!rotated) {
    return fail(event, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  if (rotated.status === 'reuse') {
    try {
      await db.insert(auditLogs).values({
        userId: rotated.userId,
        action: 'refresh_token_reuse',
        detail: 'Refresh token replay detected. Revoked all tokens for user.',
      });
    } catch (auditErr) {
      console.error('Failed to log refresh token reuse audit log:', auditErr);
    }
    return fail(event, 401, 'Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
  }

  const { userId } = rotated;

  // 3. Centralized plan resolution (DRY)
  const plan = await resolvePlan(userId);

  // 4. Read config lookups once & generate tokens in parallel
  const config = useRuntimeConfig();
  const ttl = (config.accessTokenTtlSeconds as number) || 900;

  const [accessToken, refreshToken] = await Promise.all([
    signAccessToken(userId, plan),
    issueRefreshToken(userId),
  ]);

  const response = {
    accessToken,
    refreshToken,
    expiresIn: ttl,
  };

  return authTokensSchema.parse(response);
});
