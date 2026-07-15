# Phase 4 — Proof Report (DeepSeek Review · Exit Gate)

**Audit date:** 2026-06-18
**Auditor:** DeepSeek (pi agent)
**Phase status:** All three Gemini tasks merged; orchestrator typecheck + lint + migration green.

---

## 1. File Audit Table

| #   | File                                                          | Purpose                                                  | Conforms? | Gap found | Fixed |
| --- | ------------------------------------------------------------- | -------------------------------------------------------- | --------- | --------- | ----- |
| 1   | `apps/backend/server/db/schema.ts` (subscriptions block only) | Stripe-ready schema: 5 new columns, 3 unique constraints | ✓         | —         | N/A   |
| 2   | `apps/backend/server/services/billing.ts`                     | BillingService interface + freeBillingService no-op      | ✓         | —         | N/A   |
| 3   | `apps/backend/server/api/billing/portal.get.ts`               | GET /api/billing/portal (protected)                      | ✓         | —         | N/A   |
| 4   | `apps/backend/server/api/billing/checkout.post.ts`            | POST /api/billing/checkout (protected)                   | ✓         | —         | N/A   |
| 5   | `apps/backend/server/api/webhooks/stripe.post.ts`             | POST /api/webhooks/stripe (public)                       | ✓         | —         | N/A   |
| 6   | `apps/backend/server/middleware/02.auth.ts`                   | publicPaths: added `/api/webhooks/stripe`                | ✓         | —         | N/A   |

---

## 2. Checklist Results (A–E)

### A. Stripe-Deferred Discipline — **CLEAN**

| #   | Item                                                                                                                | Result | Evidence                                                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| A1  | Zero Stripe code: no `stripe` import, no `STRIPE_*` secret, no signature verification, no checkout-session creation | ✓      | grep of all 6 files: no `stripe` import, no `STRIPE`, no `createCheckoutSession`, no `constructEvent` |
| A2  | No new dependency in `apps/backend/package.json`                                                                    | ✓      | Orchestrator confirmed: merge unchanged, no new packages                                              |
| A3  | `billingService.isEnabled()` returns `false`; no env flag for enablement                                            | ✓      | `billing.ts:25` — `return false;` hardcoded                                                           |

### B. Contract Conformance — **CLEAN**

| #   | Item                                                                                                                    | Result | Evidence                                                                                                                                                                                                                          |
| --- | ----------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | portal + checkout return `{ enabled, plan, message }` (`BillingStatus`), `enabled === false`, `plan` from `resolvePlan` | ✓      | `billing.ts:28-32` — `getStatus()` returns `{ enabled: false, plan, message }` via `resolvePlan(userId)`                                                                                                                          |
| B2  | webhook returns `{ received: true }` (`WebhookAck`)                                                                     | ✓      | `stripe.post.ts:9` — `return { received: true };`                                                                                                                                                                                 |
| B3  | Types imported from `@speaktype/shared` — no hand-redefined shapes                                                      | ✓      | `billing.ts:2` imports `BillingStatus`; `stripe.post.ts:3` imports `WebhookAck`; portal/checkout rely on `billingService.getStatus()` return type                                                                                 |
| B4  | Route file paths resolve at contract paths                                                                              | ✓      | `api/billing/portal.get.ts` → `/api/billing/portal`; `api/billing/checkout.post.ts` → `/api/billing/checkout`; `api/webhooks/stripe.post.ts` → `/api/webhooks/stripe` — all match `API_ROUTES.billing` in `api-contract.ts:31-35` |

### C. Auth & Security — **CLEAN**

| #   | Item                                                                | Result | Evidence                                                                                                                           |
| --- | ------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| C1  | `/api/webhooks/stripe` in `publicPaths`; nothing else added/removed | ✓      | `02.auth.ts:20-25` — array contains exactly the original 3 auth paths + `/api/webhooks/stripe`                                     |
| C2  | portal + checkout protected (use `getAuth`; no-Bearer → 401)        | ✓      | `portal.get.ts:6`, `checkout.post.ts:6` — both call `getAuth(event)` before handler logic                                          |
| C3  | No secret/token/webhook body logged; no body persisted              | ✓      | `billing.ts:36-39` — `handleWebhook` discards param via `_rawBody` prefix; no `console.log` on body; no DB write                   |
| C4  | Webhook never throws on empty/malformed body                        | ✓      | `stripe.post.ts:7` — `readRawBody` may return `undefined`; `handleWebhook` takes `unknown` and returns `false`; no parse, no throw |

### D. Schema Correctness (Task 1) — **CLEAN**

| #   | Item                                                                                                                                            | Result | Evidence                                                                                                                           |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| D1  | 5 new columns: `stripeCustomerId`, `stripeSubscriptionId`, `priceId`, `currentPeriodEnd` (all nullable); `updatedAt` (`defaultNow().notNull()`) | ✓      | `schema.ts:52-56` — 4 Stripe columns have no `.notNull()` / `.default()`; `updatedAt` at line 56 has `.defaultNow().notNull()`     |
| D2  | `userId`, `stripeCustomerId`, `stripeSubscriptionId` carry `.unique()`                                                                          | ✓      | `schema.ts:48` — `userId.unique()`; `schema.ts:52` — `stripeCustomerId.unique()`; `schema.ts:53` — `stripeSubscriptionId.unique()` |
| D3  | UUID PK unchanged; no other table touched                                                                                                       | ✓      | `schema.ts:47` — `id: uuid('id').primaryKey().defaultRandom()` unchanged; all other tables untouched                               |

### E. Structure & Reuse / Types — **CLEAN**

| #   | Item                                                                                                                 | Result | Evidence                                                                                                                                                                    |
| --- | -------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Routes reuse `ok`/`getAuth` from `respond.ts` and `billingService` seam; service mirrors `QuotaService` object style | ✓      | portal/checkout import `{ getAuth, ok }`; service exports `const billingService: BillingService = freeBillingService` — object-export matching `QuotaService` in `quota.ts` |
| E2  | No `any`, no unused imports, no dead `console.log`                                                                   | ✓      | All 6 files use `unknown` not `any`; no unused imports; no `console.log` calls                                                                                              |

---

## 3. Contract Re-Check

| Route                        | File                           | Handler                                                               | Response Shape                      | Matches Shared Schema                     |
| ---------------------------- | ------------------------------ | --------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------- |
| `GET /api/billing/portal`    | `api/billing/portal.get.ts`    | `billingService.getStatus(userId)` → `ok(event, status)`              | `{ enabled: false, plan, message }` | ✓ `BillingStatus` (`billingStatusSchema`) |
| `POST /api/billing/checkout` | `api/billing/checkout.post.ts` | `billingService.getStatus(userId)` → `ok(event, status)`              | `{ enabled: false, plan, message }` | ✓ `BillingStatus` (`billingStatusSchema`) |
| `POST /api/webhooks/stripe`  | `api/webhooks/stripe.post.ts`  | `billingService.handleWebhook(rawBody)` → `return { received: true }` | `{ received: true }`                | ✓ `WebhookAck` (`webhookAckSchema`)       |

---

## 4. Stripe-Deferred Attestation

I, the DeepSeek reviewer, attest after full-file audit of all six Phase-4 files:

1. **No Stripe code exists.** grep across all audited files confirms zero `stripe` imports, zero Stripe SDK calls (`createCheckoutSession`, `constructEvent`, `stripe.webhooks`), and zero `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` secret reads.
2. **No Stripe dependency.** No new package was added to `apps/backend/package.json`; the only imports touching billing are `@speaktype/shared` (contract types) and `~/server/utils/respond` (helpers).
3. **Billing is disabled.** `billingService.isEnabled()` returns `false` unconditionally; no runtime-config flag, env variable, or conditional toggles enablement.
4. **Free plan is the only plan.** `resolvePlan(userId)` returns the user's DB plan; `getStatus()` wraps it in `{ enabled: false, plan, message }`. All three routes return 200 with the disabled payload — never a 500.
5. **The seam is real.** A future `StripeBillingService` implementing the same `BillingService` interface can be swapped into `export const billingService` without touching any route file. The webhook is already public.

**Phase 4 is Stripe-deferred by design and Stripe-deferred in code.**

---

## 5. Test Matrix for Orchestrator

> Run these commands verbatim after confirming `pnpm dev:backend` is running.

### 5.1 Static gates

```bash
# TypeScript check — must exit 0 with no errors
pnpm --filter @speaktype/backend typecheck

# Lint — must be clean (no warnings, no errors)
pnpm lint

# Build — must succeed
pnpm --filter @speaktype/backend build
```

Expected: all three exit 0, no errors, no warnings.

### 5.2 Migration check (Neon)

```sql
-- Run against the Neon database
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'subscriptions'
ORDER BY ordinal_position;
```

Expected columns (exact): `id`, `user_id`, `plan`, `status`, `stripe_customer_id`, `stripe_subscription_id`, `price_id`, `current_period_end`, `updated_at`, `created_at`.
`updated_at` must be `NOT NULL` with `now()` default; the 4 Stripe columns must be nullable.

### 5.3 Live route smoke-tests

```bash
# --- Assumes a valid Bearer token in $TOKEN ---

# 1. GET /api/billing/portal + Bearer → 200 BillingStatus
curl -s -o- -w "\n%{http_code}" \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/billing/portal
# Expected: HTTP 200, body {"enabled":false,"plan":"free","message":"Billing is not enabled..."}

# 2. GET /api/billing/portal NO Bearer → 401
curl -s -o- -w "\n%{http_code}" \
  http://localhost:3000/api/billing/portal
# Expected: HTTP 401

# 3. POST /api/billing/checkout + Bearer → 200 BillingStatus
curl -s -o- -w "\n%{http_code}" \
  -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/billing/checkout
# Expected: HTTP 200, body {"enabled":false,"plan":"free","message":"Billing is not enabled..."}

# 4. POST /api/webhooks/stripe NO Bearer, empty body → 200 WebhookAck
curl -s -o- -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  http://localhost:3000/api/webhooks/stripe
# Expected: HTTP 200, body {"received":true}

# 5. POST /api/webhooks/stripe NO Bearer, arbitrary body → 200 (still ack)
curl -s -o- -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"type":"checkout.session.completed","garbage":true}' \
  http://localhost:3000/api/webhooks/stripe
# Expected: HTTP 200, body {"received":true}

# 6. Regression: POST /api/auth/login → still works
curl -s -o- -w "\n%{http_code}" \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123456"}' \
  http://localhost:3000/api/auth/login
# Expected: HTTP 200 or 401 (auth still functional, not broken by publicPaths edit)

# 7. Regression: POST /api/v1/audio → 401 without Bearer (quota gate intact)
curl -s -o- -w "\n%{http_code}" \
  -X POST \
  http://localhost:3000/api/v1/audio
# Expected: HTTP 401 (auth middleware still protects non-public routes)
```

### 5.4 Pass criteria

- All 3 static gates exit 0.
- Migration schema matches the column list above.
- Smoke tests 1–5 return the exact HTTP codes + shapes listed.
- Regression tests 6–7 prove the `publicPaths` edit didn't break existing auth.

---

## 6. Summary

| Metric                | Value                        |
| --------------------- | ---------------------------- |
| Files audited         | 6                            |
| Gaps found            | **0**                        |
| Gaps fixed            | **0**                        |
| Checklist items       | 16 (A:3, B:4, C:4, D:3, E:2) |
| Items clean           | 16                           |
| Items needing fix     | 0                            |
| Stripe code present   | No                           |
| New dependencies      | None                         |
| Service seam correct  | Yes                          |
| Routes match contract | Yes                          |

**Verdict:** Phase 4 passes audit. All Gemini deliverables conform exactly to the task specs and the locked "Stripe deferred" decision. Ready for orchestrator test-matrix execution.

---

## 7. Orchestrator Execution Results (Opus · Workspace 1 · 2026-06-18)

The orchestrator ran the matrix from §5. All gates **green**.

### 7.1 Static gates

| Gate | Command | Result |
| --- | --- | --- |
| Typecheck | `pnpm --filter @speaktype/backend typecheck` | ✅ exit 0, no errors |
| Lint | `pnpm --filter @speaktype/backend lint` | ✅ exit 0, clean |
| Build | `pnpm --filter @speaktype/backend build` | ✅ exit 0; billing routes emitted (`api/billing/portal.get.mjs`, `api/billing/checkout.post.mjs`, `api/webhooks/stripe.post.mjs`) |

> Orchestrator note: the lint pass required a config fix — `eslint.config.mjs` did not honor the
> `^_` unused-arg convention the Task 2 spec relies on (`_rawBody`). Added
> `argsIgnorePattern/varsIgnorePattern/caughtErrorsIgnorePattern: '^_'` to the shared ESLint
> config (orchestrator scope, not the agent's code). Re-lint clean.

### 7.2 Migration (Neon)

`pnpm --filter @speaktype/backend db:generate` → `0002_mean_nico_minoru.sql` (5 `ADD COLUMN` +
3 unique constraints, purely additive, no DROP). `db:migrate` → **applied successfully** to Neon.
`subscriptions` now carries the new columns (4 Stripe columns nullable, `updated_at`
`NOT NULL DEFAULT now()`).

### 7.3 Live route smoke-tests (`pnpm dev:backend`, localhost:3000)

| # | Request | Expected | Actual |
| --- | --- | --- | --- |
| 1 | `GET /api/billing/portal` + Bearer | 200 `BillingStatus` | ✅ 200 `{"enabled":false,"plan":"free","message":…}` |
| 2 | `GET /api/billing/portal` no Bearer | 401 | ✅ 401 `UNAUTHENTICATED` |
| 3 | `POST /api/billing/checkout` + Bearer | 200 `BillingStatus` | ✅ 200 same shape |
| 4 | `POST /api/webhooks/stripe` no Bearer, empty body | 200 `{"received":true}` | ✅ 200 |
| 5 | `POST /api/webhooks/stripe` no Bearer, arbitrary body | 200 `{"received":true}` | ✅ 200 (no throw) |
| 6 | `POST /api/auth/login` (regression) | works | ✅ 200, token issued |
| 7 | `POST /api/v1/audio` no Bearer | 401 | ✅ 401 (auth gate intact) |

**Phase 4 exit gate: PASSED.** Static gates green, migration applied, all 7 live checks match the
contract. Stripe remains fully deferred (no SDK, no secret, no dependency, `isEnabled() === false`).
