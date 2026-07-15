import { defineEventHandler } from 'h3';
import { loginSchema, authTokensSchema } from '@speaktype/shared';
import { auth } from '~/server/utils/auth';
import { signAccessToken, issueRefreshToken } from '~/server/utils/tokens';
import { fail, validateBody, resolvePlan, getErrorStatus } from '~/server/utils/respond';

export default defineEventHandler(async (event) => {
  // 1. Consistent body validation via shared helper
  const validation = await validateBody(event, loginSchema);
  if (!validation.success) {
    return fail(event, 400, validation.error, 'VALIDATION_ERROR');
  }

  const { email, password } = validation.data;

  // 2. Separate client failures (4xx) from system failures (5xx)
  let userId: string;
  try {
    const result = await auth.api.signInEmail({
      body: { email, password },
    });
    userId = result.user.id;
  } catch (err: unknown) {
    const status = getErrorStatus(err);

    if (status === 401 || status === 403) {
      return fail(event, 401, 'Invalid email or password', 'INVALID_CREDENTIALS');
    }

    // System/DB issues are logged on the server and returned as a 500
    console.error('System failure during email sign-in:', err);
    return fail(event, 500, 'Authentication service is temporarily unavailable');
  }

  // 3. Centralized plan resolution (DRY)
  const plan = await resolvePlan(userId);

  // 4. Read config values once & generate tokens in parallel
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
