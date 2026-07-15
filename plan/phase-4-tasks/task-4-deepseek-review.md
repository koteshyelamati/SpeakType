# Task 4 — Review, verify & prove (Phase 4 exit gate · DeepSeek)

> **Mission:** audit everything Gemini built in Tasks 1–3, confirm it matches this README's
> contract and the locked "Stripe deferred" decision, **close any gap you find**, and produce a
> proof report + the exact test matrix the orchestrator will execute. **Review/harden only — not
> a redesign, and absolutely no live Stripe.**

## When this runs
**After Gemini's Tasks 1–3 are merged and the orchestrator's `typecheck`/`lint`/migration are
green.** It covers the whole Phase-4 surface: the schema change, the service, the routes, and
the one middleware edit.

## Division of labor (important — your shell is broken on this box)
- **DeepSeek (you):** read + audit the files, fix any gap by **editing the file**, and **write
  the proof report** `plan/phase-4-tasks/PHASE-4-PROOF.md`. You **cannot run commands** — for
  every check that needs execution, write the **exact command** and its **expected output** into
  the proof so the orchestrator can run it verbatim.
- **Orchestrator (Opus, Workspace 1):** runs `typecheck` + `lint` + `build`, the migration
  state check, and the live route smoke-tests; appends the green results to the proof.

## Load first (read in order)
- `plan/phase-4-tasks/README.md` (GLOBAL HARD RULES + the exact contract shapes + "what already
  exists")
- `plan/phase-4-tasks/task-1-billing-schema.md`, `task-2-billing-service.md`,
  `task-3-billing-routes.md` (what each task was supposed to produce)
- `plan/phase-4-billing.md` (the phase contract — esp. "Stripe stays deferred")
- Skills: `.claude/skills/nuxt/SKILL.md`, `.claude/skills/drizzle/SKILL.md`
- Memory: `memory/stack-decisions.md` (Billing deferred), `memory/cost-and-free-tiers.md`
  (zero-cost MVP), `memory/api-contract.md`, `memory/security-and-performance.md`
- Contract: `packages/shared/src/{schemas,constants,api-contract}.ts` (source of truth — billing
  responses must match `billingStatusSchema` / `webhookAckSchema` byte-for-byte)

## Audit scope (only these files)
- `apps/backend/server/db/schema.ts` (the `subscriptions` change)
- `apps/backend/server/services/billing.ts`
- `apps/backend/server/api/billing/portal.get.ts`
- `apps/backend/server/api/billing/checkout.post.ts`
- `apps/backend/server/api/webhooks/stripe.post.ts`
- `apps/backend/server/middleware/02.auth.ts` (the `publicPaths` edit)

**Do NOT touch** `packages/shared/**`, `apps/extension/**`, generated `auth-schema.ts`, or
migration SQL. No new dependencies. No new features.

---

## Review checklist (this is "exactly what to verify and fix")

### A. Stripe-deferred discipline (the #1 gate)
- [ ] **Zero** Stripe code anywhere: no `stripe` import, no `STRIPE_*` secret read, no signature
      verification, no checkout-session creation. If any exists → remove it and note it.
- [ ] No new dependency was added to `apps/backend/package.json` for billing.
- [ ] `billingService.isEnabled()` returns `false`; nothing reads an "enable billing" env flag.

### B. Contract conformance
- [ ] `portal.get.ts` and `checkout.post.ts` return exactly `{ enabled, plan, message }`
      (`BillingStatus`), `enabled === false`, `plan` from `resolvePlan` (not hardcoded).
- [ ] `webhooks/stripe.post.ts` returns exactly `{ received: true }` (`WebhookAck`).
- [ ] Routes import the types from `@speaktype/shared` — no hand-redefined shapes.
- [ ] Route file paths resolve at the contract paths in `API_ROUTES.billing`
      (`/api/billing/portal`, `/api/billing/checkout`, `/api/webhooks/stripe`).

### C. Auth & security
- [ ] `/api/webhooks/stripe` is in `publicPaths` (Stripe sends no Bearer) — and **nothing else**
      was added to or removed from that array.
- [ ] `/api/billing/portal` and `/api/billing/checkout` are **protected** (use `getAuth`; a
      no-Bearer request 401s before the handler).
- [ ] No secret, token, or webhook body is logged. No body is persisted.
- [ ] The webhook never throws on an empty/malformed body (still acks 200).

### D. Schema correctness (Task 1)
- [ ] `subscriptions` has the 5 new columns; the 4 Stripe columns are **nullable**; `updatedAt`
      is `defaultNow().notNull()`.
- [ ] `userId`, `stripeCustomerId`, `stripeSubscriptionId` carry `.unique()`.
- [ ] UUID PK unchanged; no other table touched; no `drizzle-kit push` implied anywhere.

### E. Structure & reuse / types
- [ ] Routes reuse `ok` / `getAuth` from `respond.ts` and the `billingService` seam — no
      duplicated plan-lookup logic. Service mirrors the `QuotaService` object style.
- [ ] No `any`, no unused imports, no dead `console.log`.

For each item: confirm clean **or** fix it in-file and record the fix with `file:line` in the proof.

---

## Proof deliverable (write this file)
Create **`plan/phase-4-tasks/PHASE-4-PROOF.md`** containing:
1. **File audit table:** each audited file → purpose → conforms? (✓ / note) → gap found → fixed
   (✓ / N/A).
2. **Checklist results:** A–E above, each marked *clean* or *fixed-here* with `file:line`.
3. **Contract re-check:** the three billing routes → handler → response shape matches the named
   shared schema (✓).
4. **Stripe-deferred attestation:** explicit lines confirming A (no Stripe code, no secret, no
   dependency, billing disabled).
5. **Test matrix for the orchestrator** — the exact commands + expected results:
   - `pnpm --filter @speaktype/backend typecheck` → no errors
   - `pnpm lint` → clean
   - `pnpm --filter @speaktype/backend build` → succeeds
   - migration check: `subscriptions` has the new columns on Neon
   - live (with `pnpm dev:backend`):
     - `GET /api/billing/portal` + Bearer → `200 {"enabled":false,"plan":"free","message":...}`
     - `GET /api/billing/portal` no Bearer → `401`
     - `POST /api/billing/checkout` + Bearer → `200` `BillingStatus`
     - `POST /api/webhooks/stripe` no Bearer, empty body → `200 {"received":true}`
     - regression: `POST /api/auth/login` and `POST /api/v1/audio` still behave as in Phase 3
       (proves the `publicPaths` edit didn't break the auth gate)

## Do NOT run anything
Make any fixes, write `PHASE-4-PROOF.md`, list the commands, then **reply** "Task 4 complete"
with a summary of what you changed + the gap count closed. **STOP.**

## Definition of done (orchestrator confirms)
`typecheck` + `lint` + `build` green; the migration applied; every row of the test matrix passes;
no Stripe code present; `PHASE-4-PROOF.md` accurate and complete. Then Phase 4 exits.
