import { defineEventHandler, getRequestHeader } from 'h3';
import { verifyAccessToken } from '../utils/tokens';
import { fail } from '../utils/respond';

export default defineEventHandler(async (event) => {
  const path = event.path;

  // Early return for non-/api paths
  if (!path.startsWith('/api')) {
    return;
  }

  // Preflight requests are handled by CORS middleware
  if (event.method === 'OPTIONS') {
    return;
  }

  // Public paths that bypass auth
  const publicPaths = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/refresh',
    '/api/webhooks/stripe',
  ];

  const pathWithoutQuery = path.split('?')[0] || '';
  if (publicPaths.includes(pathWithoutQuery)) {
    return;
  }

  // Extract Bearer token
  const authHeader = getRequestHeader(event, 'authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return fail(event, 401, 'Unauthorized', 'UNAUTHENTICATED');
  }

  const token = authHeader.substring(7); // "Bearer ".length === 7
  const payload = await verifyAccessToken(token);

  if (!payload) {
    return fail(event, 401, 'Unauthorized', 'UNAUTHENTICATED');
  }

  // Store verified credentials in context
  event.context.auth = {
    userId: payload.sub,
    plan: payload.plan,
  };
});
