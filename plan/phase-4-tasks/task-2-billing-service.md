# Task 2 — `BillingService` seam (free-plan no-op)

> **One file, no HTTP, no Stripe.** Create the service **interface** plus a single no-op
> "free plan only" implementation that the route stubs (Task 3) will call. This is the seam that
> makes adding real Stripe later a small, contained change. **Do not** import a Stripe SDK, read
> any secret, or make any network/DB call beyond reusing the existing `resolvePlan` helper.

## Load first
- `plan/phase-4-tasks/README.md` (GLOBAL HARD RULES — esp. rule 3: NO live Stripe)
- Skill: `.claude/skills/nuxt/SKILL.md` (server/services layout & conventions)
- Memory: `memory/stack-decisions.md` (Billing = Stripe deferred — interface now, no wiring)
- Reference (read, do not edit): `apps/backend/server/services/quota.ts` (the `QuotaService`
  object-export style you must mirror), `apps/backend/server/utils/respond.ts` (has
  `resolvePlan(userId)` — reuse it, do not reimplement plan lookup).

## The ONLY file you create
`apps/backend/server/services/billing.ts`

## Exactly what to build

A TypeScript **interface** `BillingService` and one implementation `freeBillingService`, exported
so Task 3's routes import the seam — **never** Stripe directly.

```ts
import { resolvePlan } from '~/server/utils/respond';
import type { BillingStatus } from '@speaktype/shared';

/**
 * The billing seam. The MVP ships the free no-op implementation; a future "monetize" phase
 * adds a StripeBillingService behind this SAME interface — no route changes needed.
 */
export interface BillingService {
  /** Whether live billing is wired. Always false in the MVP (Stripe deferred). */
  isEnabled(): boolean;
  /** Status for GET /billing/portal and POST /billing/checkout while disabled. */
  getStatus(userId: string): Promise<BillingStatus>;
  /**
   * Handle an inbound provider webhook body. No-op in the MVP: returns false (nothing applied).
   * A future StripeBillingService verifies + applies the event here.
   */
  handleWebhook(rawBody: unknown): Promise<boolean>;
}

const BILLING_DISABLED_MESSAGE =
  'Billing is not enabled. SpeakType is free during the MVP; the free plan is active.';

export const freeBillingService: BillingService = {
  isEnabled() {
    return false;
  },

  async getStatus(userId: string): Promise<BillingStatus> {
    const plan = await resolvePlan(userId);
    return {
      enabled: false,
      plan,
      message: BILLING_DISABLED_MESSAGE,
    };
  },

  async handleWebhook(_rawBody: unknown): Promise<boolean> {
    // No-op: live Stripe is deferred. We acknowledge but apply nothing.
    return false;
  },
};

/** The active billing service for the app. Swap this binding when Stripe is wired. */
export const billingService: BillingService = freeBillingService;
```

### Rules for this change
- **Reuse `resolvePlan`** from `~/server/utils/respond` for the plan — do NOT query the DB
  directly here and do NOT default the plan inline.
- Return type of `getStatus` MUST be the shared `BillingStatus` type (import it from
  `@speaktype/shared`). Field names/types exactly `{ enabled, plan, message }`.
- `isEnabled()` returns `false` (hardcoded) — there is no env flag to read; do not invent one.
- `handleWebhook` does nothing and returns `false`. No parsing, no signature check, no Stripe.
- No `console.log` of any payload. No secrets. No `useRuntimeConfig()` (nothing to read yet).
- Mirror the **object-export** style of `QuotaService` in `quota.ts` for consistency.

## Scope
- In scope: `apps/backend/server/services/billing.ts` only.
- Out of scope: the routes (Task 3), the schema (Task 1, already done), `packages/shared/**`,
  any Stripe code, any middleware. Do not register the routes here.

## Do NOT run anything
After creating `billing.ts`, report the manifest (one file created) and **STOP**.

## Verify (orchestrator runs)
- `pnpm --filter @speaktype/backend typecheck` clean — `BillingStatus` import resolves and
  `getStatus` returns the exact shape.
- `pnpm lint` clean (no unused vars; the `_rawBody` param name signals intentional non-use).
