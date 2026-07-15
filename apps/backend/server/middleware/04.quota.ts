import { defineEventHandler } from 'h3';
import { getRemainingSeconds } from '~/server/services/quota';
import { fail } from '../utils/respond';

export default defineEventHandler(async (event) => {
  const path = event.path;

  // Apply ONLY to POST /api/v1/audio
  if (event.method !== 'POST') {
    return;
  }

  const pathWithoutQuery = path.split('?')[0] || '';
  if (pathWithoutQuery !== '/api/v1/audio') {
    return;
  }

  // Requires auth context (must run after 02.auth.ts)
  const auth = event.context.auth as { userId: string; plan: 'free' | 'pro' } | undefined;
  if (!auth) {
    return fail(event, 401, 'Unauthorized', 'UNAUTHENTICATED');
  }

  const { userId, plan } = auth;

  try {
    const remaining = await getRemainingSeconds(userId, plan);
    if (remaining <= 0) {
      return fail(event, 402, 'Quota exhausted', 'QUOTA_EXHAUSTED');
    }
  } catch (err) {
    console.error('Failed to retrieve remaining quota:', err);
    return fail(event, 500, 'Internal server error during quota verification');
  }
});
