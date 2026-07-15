import { defineEventHandler, setResponseHeader } from 'h3';
import { RATE_LIMIT_PER_HOUR } from '@speaktype/shared';
import { fail } from '../utils/respond';

/**
 * In-memory fixed-window rate limiter — PROCESS-LOCAL.
 *
 * Correct for the single-instance MVP. For multi-instance / edge scale the documented path is
 * Upstash Redis (deferred): swapping it in means replacing ONLY this store, the handler logic
 * below stays identical. Do not add Redis here in this phase.
 */
type Window = { count: number; resetAt: number };
const store = new Map<string, Window>();
const HOUR_MS = 60 * 60 * 1000;

/** Drop expired windows so the Map can't grow unbounded. */
function sweep(now: number): void {
  for (const [key, win] of store) {
    if (win.resetAt <= now) store.delete(key);
  }
}

export default defineEventHandler((event) => {
  const path = event.path;

  // Early return for non-/api paths
  if (!path.startsWith('/api')) {
    return;
  }

  // Preflight requests are skipped
  if (event.method === 'OPTIONS') {
    return;
  }

  // Skip when there is no auth context (public routes / unauthenticated — 02.auth handles 401)
  const auth = event.context.auth as { userId: string; plan: 'free' | 'pro' } | undefined;
  if (!auth) {
    return;
  }

  const { userId, plan } = auth;
  const limit = RATE_LIMIT_PER_HOUR[plan] ?? RATE_LIMIT_PER_HOUR.free;

  const now = Date.now();
  let win = store.get(userId);
  if (!win || win.resetAt <= now) {
    win = { count: 0, resetAt: now + HOUR_MS };
    store.set(userId, win);
  }

  win.count += 1;

  if (win.count > limit) {
    const retryAfter = Math.ceil((win.resetAt - now) / 1000);
    setResponseHeader(event, 'Retry-After', retryAfter);
    return fail(event, 429, 'Rate limit exceeded', 'RATE_LIMITED');
  }

  // Bound memory: opportunistic sweep once the map gets large.
  if (store.size > 10_000) {
    sweep(now);
  }
});
