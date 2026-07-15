# Task 1 — Make `subscriptions` Stripe-ready (schema only)

> **One file, one job.** Add a few **nullable** Stripe columns to the existing `subscriptions`
> table so turning Stripe on later is small, contained work. **Do not** add Stripe code, a new
> table, or touch any other table. **Do not** generate or run migrations — the orchestrator does.

## Load first
- `plan/phase-4-tasks/README.md` (GLOBAL HARD RULES + "what already exists")
- Skill: `.claude/skills/drizzle/SKILL.md` (UUID PKs, nullable columns, generate→migrate, NEVER push)
- Memory: `memory/stack-decisions.md` (Billing = Stripe deferred; schema seam now),
  `memory/db-schema-source-of-truth.md`

## The ONLY file you may edit
`apps/backend/server/db/schema.ts` — and **only** the `subscriptions` table block (currently
lines ~47–53) plus its inferred types (already present at the bottom — leave those as-is unless
a type needs no change; `$inferSelect`/`$inferInsert` pick up new columns automatically).

## Exactly what to change

The current table is:

```ts
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  plan: planEnum('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

Change it to **exactly** this (add the 5 marked columns; keep the existing ones unchanged except
add `.unique()` to `userId`):

```ts
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),                 // one subscription per user (enables future upsert-by-user)
  plan: planEnum('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(),       // NEW · nullable
  stripeSubscriptionId: text('stripe_subscription_id').unique(), // NEW · nullable
  priceId: text('price_id'),                                    // NEW · nullable
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }), // NEW · nullable
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
```

### Rules for this change (read carefully)
- The 4 new `text`/`timestamp` columns (`stripeCustomerId`, `stripeSubscriptionId`, `priceId`,
  `currentPeriodEnd`) are **nullable** — no `.notNull()`, no `.default(...)`. The free plan
  stores `null` for all of them; that's intended.
- `updatedAt` is **`.defaultNow().notNull()`** to match the pattern used by the `settings` table
  in the same file. Do not add an `onUpdate` trigger.
- `.unique()` on `userId`, `stripeCustomerId`, `stripeSubscriptionId` — Postgres allows multiple
  NULLs under a unique constraint, so the nullable Stripe columns are fine.
- Do **not** change column order of the existing columns beyond inserting the new ones where shown.
- Do **not** rename `status` or convert it to an enum — leave it as free `text`.

## Scope
- In scope: the `subscriptions` block in `apps/backend/server/db/schema.ts` only.
- Out of scope: every other table, the enums, `webhook_events`, `quota_events`, any service,
  any route, `packages/shared/**`, and **all** migration files. Do not create
  `server/services/billing.ts` (that is Task 2).

## Do NOT run anything
After editing `schema.ts`, report the manifest (one file changed) and **STOP**. The orchestrator
runs `pnpm --filter @speaktype/backend db:generate` then `db:migrate` against Neon — never `push`.

## Verify (orchestrator runs)
- `pnpm --filter @speaktype/backend typecheck` clean.
- `db:generate` produces a new migration adding the 5 columns + the unique constraints (no DROP
  of existing data).
- `db:migrate` applies cleanly to Neon; `subscriptions` now has the new columns, all nullable
  except `updated_at`.
