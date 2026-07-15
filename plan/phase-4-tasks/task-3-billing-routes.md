# Task 3 — Billing route stubs (portal, checkout, webhook)

> **Three thin route files + one tiny middleware edit. No Stripe, no DB writes, no secrets.**
> Each route returns a clean, contract-shaped "billing disabled" response (never a 500). The
> webhook must be **public** (Stripe sends no Bearer) and answer with a fast 200 ack.

## Prerequisite the orchestrator did BEFORE this task
The orchestrator added `billingStatusSchema` + `webhookAckSchema` (and their `BillingStatus` /
`WebhookAck` types) to `packages/shared/src/schemas.ts`. **You import them — you do NOT edit
shared.** If the import does not resolve, STOP and report it (do not redefine the shape).

## Load first
- `plan/phase-4-tasks/README.md` (GLOBAL HARD RULES + the exact contract shapes)
- `plan/phase-4-tasks/task-2-billing-service.md` (the `billingService` you call)
- Skill: `.claude/skills/nuxt/SKILL.md` (route file naming → `/api/...`, `event` handlers)
- Reference (read, do not edit): `apps/backend/server/utils/respond.ts` (`ok`, `getAuth`),
  `apps/backend/server/middleware/02.auth.ts` (the `publicPaths` array you will extend),
  `apps/backend/server/api/settings.get.ts` (the protected-route style to mirror).
- Contract: `packages/shared/src/api-contract.ts` → `API_ROUTES.billing` (the fixed paths).

## Files to CREATE (exactly these three, exact paths)

Paths resolve under `/api`, so the file locations must be:

### 1. `apps/backend/server/api/billing/portal.get.ts` → `GET /api/billing/portal`
Protected (Bearer required). Mirror `settings.get.ts`.

```ts
import { defineEventHandler } from 'h3';
import { getAuth, ok } from '~/server/utils/respond';
import { billingService } from '~/server/services/billing';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);
  const status = await billingService.getStatus(userId);
  return ok(event, status); // { enabled: false, plan, message }
});
```

### 2. `apps/backend/server/api/billing/checkout.post.ts` → `POST /api/billing/checkout`
Protected (Bearer required). Same body as portal — there is nothing to charge yet, so it does
**not** read the request body and does **not** create a session.

```ts
import { defineEventHandler } from 'h3';
import { getAuth, ok } from '~/server/utils/respond';
import { billingService } from '~/server/services/billing';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);
  const status = await billingService.getStatus(userId);
  return ok(event, status); // { enabled: false, plan, message }
});
```

### 3. `apps/backend/server/api/webhooks/stripe.post.ts` → `POST /api/webhooks/stripe`
**Public** (no Bearer — Stripe calls it). Acknowledge fast, apply nothing.

```ts
import { defineEventHandler, readRawBody } from 'h3';
import { billingService } from '~/server/services/billing';
import type { WebhookAck } from '@speaktype/shared';

export default defineEventHandler(async (event): Promise<WebhookAck> => {
  // Live Stripe is deferred: no signature verification, no event application.
  // We read+discard the body so the request drains cleanly, then ack.
  const rawBody = await readRawBody(event);
  await billingService.handleWebhook(rawBody);
  return { received: true };
});
```

## File to EDIT (one line)

### `apps/backend/server/middleware/02.auth.ts`
Add the webhook path to the existing `publicPaths` array so it bypasses Bearer auth. Change:

```ts
const publicPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
```
to:
```ts
const publicPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh',
  '/api/webhooks/stripe',
];
```
**Do not** change anything else in this file. `/api/billing/portal` and `/api/billing/checkout`
stay protected (they are NOT public).

### Rules for this change
- `portal` and `checkout` use `getAuth(event)` → if no Bearer, the auth middleware already
  returns 401 before the handler runs. Do not add your own auth check.
- All three responses must match the shared types **exactly**: portal/checkout →
  `BillingStatus` (`{ enabled, plan, message }`); webhook → `WebhookAck` (`{ received: true }`).
- Never return a 500 for the disabled state — "disabled" is a normal 200 response.
- The webhook must NOT throw on a malformed/empty body — `readRawBody` may return `undefined`;
  that's fine, still ack `{ received: true }`.
- No Stripe import. No secret read. No DB write. No logging of the webhook body.

## Scope
- In scope: the three route files above + the one-line `publicPaths` edit in `02.auth.ts`.
- Out of scope: `packages/shared/**` (orchestrator already added the schemas), the schema
  (Task 1), the service (Task 2), every other middleware (`03`, `04` need no change — quota only
  touches `/v1/audio`; rate-limit auto-skips the public webhook), and the extension.

## Do NOT run anything
After creating the three routes and editing `02.auth.ts`, report the manifest (3 created,
1 edited) and **STOP**.

## Verify (orchestrator runs)
- `typecheck` + `lint` clean.
- `GET /api/billing/portal` with a valid Bearer → `200 {"enabled":false,"plan":"free","message":...}`.
- `GET /api/billing/portal` with **no** Bearer → `401` (still protected).
- `POST /api/billing/checkout` with a valid Bearer → same `BillingStatus` 200 shape.
- `POST /api/webhooks/stripe` with **no** Bearer and any/empty body → `200 {"received":true}`
  (proves it's public and never 500s).
