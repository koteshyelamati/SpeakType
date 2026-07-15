import { defineEventHandler, getRequestHeader, setResponseHeaders, sendNoContent } from 'h3';

export default defineEventHandler((event) => {
  const path = event.path;

  // Early return for non-/api paths
  if (!path.startsWith('/api')) {
    return;
  }

  const origin = getRequestHeader(event, 'origin');
  if (!origin) {
    return;
  }

  const config = useRuntimeConfig();
  const corsOriginsStr = (config.corsOrigins as string) || '';
  const allowedOrigins = corsOriginsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  let isAllowed = allowedOrigins.includes(origin);

  // In development, also reflect chrome-extension:// and http://localhost:*
  if (!isAllowed && (import.meta.dev || process.env.NODE_ENV === 'development')) {
    if (origin.startsWith('chrome-extension://') || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      isAllowed = true;
    }
  }

  if (isAllowed) {
    setResponseHeaders(event, {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, content-type',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    });
  }

  // Short-circuit OPTIONS preflight requests immediately with 204
  if (event.method === 'OPTIONS') {
    return sendNoContent(event, 204);
  }
});
