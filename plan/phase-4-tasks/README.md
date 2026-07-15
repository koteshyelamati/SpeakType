# Phase 4 — Billing (deferred wiring) · Task Breakdown (for the Gemini agent)

This folder splits **`plan/phase-4-billing.md`** into small, ordered, tightly-scoped tasks
sized for the **Gemini** pi agent, then a final **DeepSeek** review/test task. Each task says
exactly which files to create, what shape they must have, and what **not** to touch — so the
agent can't drift, invent, or hallucinate scope.

> **Goal of Phase 4 (locked):** be *ready* for Stripe without paying for or maintaining it now.
> Build the **service seam + clean route stubs + a Stripe-ready schema**. **Do NOT wire live
> Stripe.** No Stripe SDK, no API keys, no webhook signature verification — that is the future
> "monetize" phase and must FLAG COST FIRST (`memory/cost-and-free-tiers.md`).

## What already exists (built in Phase 3 — DO NOT rebuild)

Phase 3 already shipped most of the Phase-4 "now" checklist. Treat these as **done**:

- ✅ Tables `subscriptions`, `webhook_events` (unique `stripe_event_id`), `quota_events` exist
  in `apps/backend/server/db/schema.ts`.
- ✅ `PLANS`, `QUOTA_SECONDS`, `RATE_LIMIT_PER_HOUR` centralized in
  `packages/shared/src/constants.ts`.
- ✅ Billing route paths fixed in the contract: `API_ROUTES.billing` in
  `packages/shared/src/api-contract.ts` (`/billing/portal`, `/billing/checkout`, `/webhooks/stripe`).
- ✅ `resolvePlan(userId)` helper in `apps/backend/server/utils/respond.ts`.

So Phase 4 adds only three things: a **Stripe-ready schema upgrade**, a **`BillingService`
seam**, and **three clean route stubs**.

---

## How this runs (division of labor)

**The Gemini agent ONLY writes/edits files.** Its shell is broken on this box — it must
**never** run `pnpm`, `npx`, `drizzle-kit`, `git`, or any command. After writing the files for
its task, it lists every file it created/changed and **stops**.

**The orchestrator (Opus, Workspace 1) runs everything else** between tasks:
- `db:generate` / `db:migrate` after the schema task
- `pnpm --filter @speaktype/backend typecheck` and `pnpm lint`
- `pnpm dev:backend` + the route smoke-tests in each task's **Verify** block

**The DeepSeek agent reviews + tests** at the end (Task 4) — it audits the diff against this
README and runs the verification matrix; it does not add features.

Do the Gemini tasks **strictly in order (1 → 3)**. The orchestrator typechecks after each task
and only unblocks the next once it's green.

| # | Task | File | Agent | Depends on |
|---|------|------|-------|-----------|
| 1 | Make `subscriptions` Stripe-ready (schema only) | `task-1-billing-schema.md` | Gemini | — |
| 2 | `BillingService` seam (free-plan no-op) | `task-2-billing-service.md` | Gemini | 1 |
| 3 | Billing route stubs (portal, checkout, webhook) | `task-3-billing-routes.md` | Gemini | 1, 2 |
| 4 | Review, verify & prove (phase exit gate) | `task-4-deepseek-review.md` | DeepSeek | 1–3 |

### Orchestrator-only steps (NOT for the agent)
- **Before Task 3:** the orchestrator adds `billingStatusSchema` + `webhookAckSchema` to
  `packages/shared/src/schemas.ts` (the contract is locked from the agent's side — only the
  orchestrator edits `packages/shared/**`). Task 3 then imports them. See the exact shapes below.
- **After Task 1's file exists:** run `db:generate` → `db:migrate` against Neon.
- **After Task 3:** run `db:generate` → `db:migrate` again only if Task 1's schema changed.

---

## GLOBAL HARD RULES (every Gemini task — non-negotiable)

1. **Do not run any command.** Write files only, then report a file manifest and stop.
2. **Do not touch** `packages/shared/**` (locked contract — read-only for you),
   `apps/extension/**`, BetterAuth's generated `server/db/auth-schema.ts`, migration SQL under
   `server/db/migrations/**`, or any file outside `apps/backend/**` unless a task explicitly says so.
3. **NO live Stripe.** Do not add the `stripe` package, do not import a Stripe SDK, do not read
   a `STRIPE_*` secret, do not implement signature verification or checkout sessions. Stubs only.
4. **Conform to the contract exactly.** Import schemas/types/constants/routes from
   `@speaktype/shared` — never hand-redefine a payload. The route stub responses must match the
   `billingStatusSchema` / `webhookAckSchema` the orchestrator adds (shapes below).
5. **Routes live in `server/api/`** so they resolve under **`/api/...`**. Putting a route in
   `server/routes/` is WRONG.
6. **Secrets stay server-side**, read via `useRuntimeConfig()`. Never hardcode a key, never send
   a key to the client, never log a key value. (Phase 4 needs none — don't add any.)
7. **DB:** UUID PKs for every non-BetterAuth table. Never write or run `drizzle-kit push`. Don't
   hand-edit generated SQL. New billing columns are **nullable** (so the free plan is unaffected).
8. **Zero-cost MVP.** Don't add a paid service or swap any locked provider/library
   (`memory/stack-decisions.md`).
9. **No new dependencies.** If you think you need a package, you don't — this phase ships with
   what's already in `apps/backend/package.json`. List it and stop if you truly believe otherwise.
10. **Stay in your task.** Don't create files that belong to a later task. Don't refactor
    unrelated code. Behavior-preserving edits only, except the exact changes the task names.

---

## Contract the orchestrator adds to `packages/shared/src/schemas.ts` (reference only — do NOT edit shared)

```ts
/* --------------------------------- Billing --------------------------------- */
export const billingStatusSchema = z.object({
  enabled: z.boolean(),        // false for the whole MVP (Stripe deferred)
  plan: z.enum(PLANS),         // the caller's current plan (from resolvePlan)
  message: z.string(),         // human-readable "billing is disabled" note
});
export type BillingStatus = z.infer<typeof billingStatusSchema>;

export const webhookAckSchema = z.object({
  received: z.boolean(),       // always true; Stripe only needs a fast 200
});
export type WebhookAck = z.infer<typeof webhookAckSchema>;
```

The route stubs in Task 3 import these from `@speaktype/shared`. Field names/types must match
**exactly**.

---

## Definition of done (whole phase)
All three Gemini tasks merged; `typecheck` + `lint` clean; the `subscriptions` migration applied
to Neon; the three billing routes respond cleanly (never 500) while disabled; the free plan
still works end-to-end; and Task 4's DeepSeek review/test matrix passes. Then Phase 4 exits.
