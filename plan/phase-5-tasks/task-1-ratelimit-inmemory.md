# Task 1 — In-memory rate limiter (replace the Redis-only, fail-open middleware)

> **One file. One job.** The current `03.ratelimit.ts` only enforces limits when Upstash Redis
> credentials are present — otherwise it **fails open** and applies *no* limiting. Per the locked
> decision, replace it with a **process-local in-memory** fixed-window limiter that actually
> enforces `RATE_LIMIT_PER_HOUR`. **No Redis. No new dependency. No other file.**

## Load first
- `plan/phase-5-tasks/README.md` (GLOBAL HARD RULES + "what already exists")
- Skill: `.claude/skills/nuxt/SKILL.md` (Nitro middleware order & `event.context`)
- Memory: `memory/security-and-performance.md` (rate limits: free 100/hr, pro 1000/hr; the
  Redis note is the *future* multi-instance path — not for this round)

## The ONLY file you may edit
`apps/backend/server/middleware/03.ratelimit.ts` — replace its **entire** contents with the
implementation below.

## Exactly what to write
Replace the whole file with this:

```ts
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
    setResponseHeader(event, 'Retry-After', String(retryAfter));
    return fail(event, 429, 'Rate limit exceeded', 'RATE_LIMITED');
  }

  // Bound memory: opportunistic sweep once the map gets large.
  if (store.size > 10_000) {
    sweep(now);
  }
});
```

### Rules for this change
- **No `@upstash/redis` import, no `UPSTASH_*` read, no `useRuntimeConfig()` for Redis.** The new
  file imports only `h3`, `@speaktype/shared` (`RATE_LIMIT_PER_HOUR`), and `../utils/respond`.
- Keep the **same enforcement semantics** the rest of the app expects: limit is per `userId`,
  per **plan** (`free`/`pro`), per rolling hour; over-limit returns `429` with code
  `RATE_LIMITED` via the existing `fail()` helper.
- Skip cleanly for non-`/api`, `OPTIONS`, and missing-auth requests (public routes) — exactly as
  the old file did. Do **not** start 401-ing public routes from here.
- Do **not** rename the file or change the `03.` numeric prefix (middleware order matters: it must
  run after `02.auth.ts`).
- Leave `@upstash/redis` in `apps/backend/package.json` untouched (future Redis swap). You are
  only removing the *import*, not the dependency.

## Scope
- In scope: `apps/backend/server/middleware/03.ratelimit.ts` only.
- Out of scope: `package.json`/lockfiles, `01.cors.ts`, `02.auth.ts`, `04.quota.ts`, the quota
  service, `packages/shared/**`, and the extension. Do not add a Redis adapter or a config flag.

## Do NOT run anything
After replacing the file, report the manifest (one file changed) and **STOP**. The orchestrator
runs `typecheck` / `lint` / `build` and the 429 smoke-test.

## Verify (orchestrator runs)
- `pnpm --filter @speaktype/backend typecheck` + `pnpm lint` clean.
- With `pnpm dev:backend` and a valid Bearer: the 101st request within an hour on a `free` user
  returns `429 {"error":"Rate limit exceeded","code":"RATE_LIMITED"}` with a `Retry-After` header;
  earlier requests pass.
- Public routes (`/api/webhooks/stripe`, `/api/auth/login`) are never rate-limited (no auth ctx).
