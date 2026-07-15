# Phase 4 — Billing (deferred wiring)

**Goal:** Be *ready* for Stripe without paying for or maintaining it now. The schema and a
clean service seam exist so turning billing on later is small, contained work.

**Cost:** Free. Stripe itself costs nothing until you actually charge users (then a % per
transaction, no fixed fee). **Do not wire live Stripe in MVP.**

## Load first
- Skill: `.claude/skills/nuxt/SKILL.md` (+ `drizzle` for the billing tables)
- Memory: `memory/stack-decisions.md`, `memory/cost-and-free-tiers.md`, `memory/api-contract.md`
- Code: `apps/backend/server/services/**`, `apps/backend/server/db/**`, `packages/shared/src/constants.ts`

## Tasks (now)
- ☐ Drizzle tables present: `subscriptions`, `webhook_events` (unique `stripe_event_id`), `quota_events`
- ☐ `BillingService` interface defined with no-op / "free plan only" implementation
- ☐ Route stubs that return "billing disabled" cleanly: `GET /billing/portal`, `POST /billing/checkout`, `POST /webhooks/stripe`
- ☐ Plans + quota limits centralized in `@speaktype/shared/constants.ts`

## Tasks (later — only when monetizing — FLAG COST FIRST)
- ☐ Implement `BillingService` with Stripe SDK (Checkout, Customer Portal)
- ☐ `POST /webhooks/stripe`: signature verification + idempotency via `webhook_events`
- ☐ Map Stripe subscription status → `subscriptions.status` → plan/quota

## Verify
- Free plan works end-to-end with no Stripe configured
- Billing routes respond cleanly (not 500) while disabled
- Adding Stripe later touches only `BillingService` + webhook handler, not the rest of the app
