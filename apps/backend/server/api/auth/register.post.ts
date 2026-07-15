import { defineEventHandler } from 'h3';
import { registerSchema, authTokensSchema } from '@speaktype/shared';
import { auth } from '~/server/utils/auth';
import { signAccessToken, issueRefreshToken } from '~/server/utils/tokens';
import { fail, validateBody, getErrorStatus } from '~/server/utils/respond';
import { db, settings } from '~/server/db';

export default defineEventHandler(async (event) => {
  // 1. Consistent body validation via shared helper
  const validation = await validateBody(event, registerSchema);
  if (!validation.success) {
    return fail(event, 400, validation.error, 'VALIDATION_ERROR');
  }

  const { email, password, name } = validation.data;

  // 2. Separate client conflict (409) or bad input (400) from system failures (500)
  let userId: string;
  try {
    const result = await auth.api.signUpEmail({
      body: { email, password, name: name ?? email.split('@')[0] ?? 'User' },
    });
    userId = result.user.id;
  } catch (err: unknown) {
    const status = getErrorStatus(err);

    if (status === 409) {
      return fail(event, 409, 'User with this email already exists', 'REGISTRATION_CONFLICT');
    }

    if (status === 400 || status === 422) {
      return fail(event, 400, 'Invalid registration input parameters', 'VALIDATION_ERROR');
    }

    console.error('System failure during email registration:', err);
    return fail(event, 500, 'Registration service is temporarily unavailable');
  }

  // 3. Create default settings row with observability
  try {
    await db.insert(settings).values({ userId });
  } catch (err) {
    console.warn(
      `Non-fatal warning: Failed to insert default settings for new user ${userId}:`,
      err,
    );
  }

  // 4. Default plan for new registrations is 'free'
  const plan = 'free' as const;

  // 5. Read config once & sign tokens in parallel
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
