# Task 3 — Middleware: CORS → auth → rate-limit → quota

## Load first
- `plan/phase-3-tasks/README.md` (GLOBAL HARD RULES)
- `plan/phase-3-tasks/task-2-auth.md` (uses `verifyAccessToken`, sets `event.context.auth`)
- Skill: `.claude/skills/nuxt/SKILL.md`
- Memory: `memory/security-and-performance.md` (CORS allowlist, rate limits, bearer-only),
  `memory/api-contract.md` (guard order)
- Contract: `packages/shared/src/constants.ts` (`RATE_LIMIT_PER_HOUR`, `QUOTA_SECONDS`),
  `api-contract.ts` (`PROTECTED_GUARD_ORDER`)

## Goal
Nitro middleware enforcing the guard order **cors → auth → rate-limit → quota** for `/api`
routes. Order is controlled by **numeric filename prefixes** (Nitro runs `server/middleware/*`
alphabetically). Usage logging happens in the audio handler (Task 5), not here.

## Files to CREATE (all in `apps/backend/server/middleware/`)

### `01.cors.ts`
- Applies only to paths starting with `/api`.
- Allowed origins = the comma-split `useRuntimeConfig().corsOrigins` list. In **dev**
  (`import.meta.dev`), also allow any `chrome-extension://...` and `http://localhost:*` origin
  (reflect it) so the locally-built extension id works without reconfig.
- Set `Access-Control-Allow-Origin` (the matched origin), `-Allow-Credentials: true`,
  `-Allow-Headers: authorization, content-type`, `-Allow-Methods: GET,POST,PUT,OPTIONS`.
- For `OPTIONS` (preflight): set headers and return `204` immediately (do not fall through to
  auth). **This is required or the extension's fetch fails CORS.**

### `02.auth.ts`
- Applies only to `/api` routes. **Public paths** (no auth): `/api/auth/login`,
  `/api/auth/register`, `/api/auth/refresh`, and any `OPTIONS`. Everything else under `/api`
  requires a Bearer token.
- Read `Authorization: Bearer <token>`; `verifyAccessToken(token)`. If valid, set
  `event.context.auth = { userId: payload.sub, plan: payload.plan }`. If missing/invalid →
  respond `401` with `{ error: 'Unauthorized', code: 'UNAUTHENTICATED' }` and stop.

### `03.ratelimit.ts`
- Applies only to authed `/api` routes (skip public paths + OPTIONS).
- Use Upstash Redis (`@upstash/redis` REST client, created from `upstashRedisRestUrl` /
  `upstashRedisRestToken`). Fixed-window counter: key `rl:{userId}:{yyyymmddHH}`, `INCR` +
  `EXPIRE 3600` on first hit. Limit = `RATE_LIMIT_PER_HOUR[plan]`.
- Over limit → `429` `{ error: 'Rate limit exceeded', code: 'RATE_LIMITED' }`.
- If Redis is unreachable, **fail open** (log a warning, allow the request) — never 500 here.

### `04.quota.ts`
- Applies **only** to `POST /api/v1/audio` (quota is consumed by transcription). Skip others.
- Read remaining quota via the QuotaService from Task 4
  (`getRemainingSeconds(userId, plan)` — import from `~/server/services/quota`). If
  `remaining <= 0` → `402` `{ error: 'Quota exhausted', code: 'QUOTA_EXHAUSTED' }`.
- Do **not** decrement here (the audio handler decrements after a successful transcription).

## Scope
- In scope: the four middleware files only.
- Out of scope: the services themselves (Task 4) and route handlers (Task 5). You may import
  `~/server/services/quota` even though Task 4 creates it — order is enforced by the
  orchestrator, so it will exist by the time this is typechecked together. If it does not yet
  exist when you write this, still import it by the path above and note it in your report.

## Constraints
- GLOBAL HARD RULES. Bearer-only (no cookies). Never log token/key values.
- Middleware must early-return for non-`/api` paths so it never interferes with anything else.
- Match error bodies to `errorResponseSchema` (`{ error, code? }`).

## Do NOT run anything
Report the manifest + any packages to install (`@upstash/redis` should already be installed by
the orchestrator), then STOP.

## Verify (orchestrator runs)
- `typecheck` clean.
- `GET /api/auth/me` with no Bearer → `401`. With a valid Bearer → passes.
- An `OPTIONS /api/v1/audio` preflight returns `204` with the CORS headers.
- Hammering a route past the plan limit → `429`.
