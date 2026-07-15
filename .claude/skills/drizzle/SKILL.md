---
name: drizzle
description: The SpeakType data layer — Drizzle ORM + Neon serverless Postgres + the migration workflow (apps/backend/server/db). Read before changing the DB schema, adding tables/columns/enums, or running migrations. Covers UUID-PK rules, generate→migrate (NEVER push), the pooled vs unpooled URL split, and BetterAuth's own tables.
---

# Drizzle ORM + Neon Postgres (apps/backend/server/db)

Data layer: **Drizzle ORM `^0.41`** + **drizzle-kit `^0.30`** over **Neon serverless**
(`@neondatabase/serverless`, websocket driver). Read before any schema change.

## Files
- `server/db/schema.ts` — all app tables + pgEnums + inferred TS types.
- `server/db/index.ts` — the Neon client (`db`).
- `drizzle.config.ts` — dialect `postgresql`, schema path, `out: ./server/db/migrations`,
  `dbCredentials.url = process.env.DATABASE_URL_UNPOOLED`.
- `server/db/migrations/` — generated SQL + `meta/` snapshots. **Commit these.**

## Hard rules (from AGENTS.md + memory/stack-decisions.md)
- **UUID PKs** for every non-BetterAuth table: `uuid('id').primaryKey().defaultRandom()`.
- **NEVER run `drizzle-kit push`.** Always the two-step: **`db:generate` → `db:migrate`**.
- **BetterAuth owns `user`, `session`, `account`, `verification`** via its drizzle adapter — do
  NOT define them in `schema.ts`. (Open Phase-2 item: BetterAuth `user.id` is `text`, our
  `users.id` is `uuid` — must be reconciled before wiring auth.)
- Enums mirror `@speaktype/shared` constants (plan, stt_provider, cleanup_mode).
- `webhook_events.stripe_event_id` has a UNIQUE constraint (idempotency).

## The pooled vs unpooled URL split (important)
- `DATABASE_URL` = **pooled** (PgBouncer) — for the app's runtime queries.
- `DATABASE_URL_UNPOOLED` = **direct** — for **migrations** (DDL is unreliable through the
  pooler). `drizzle.config.ts` already points migrations at the unpooled URL.
- Both live in `apps/backend/.env` (**gitignored, live secrets — never commit**). `.env.example`
  holds placeholders only.

## Workflow
Run from `apps/backend` (drizzle-kit auto-loads `.env` from cwd):
```
pnpm --filter @speaktype/backend db:generate   # schema -> server/db/migrations/NNNN_*.sql
pnpm --filter @speaktype/backend db:migrate     # applies to Neon via the UNPOOLED url
```
Or `Push-Location apps/backend; pnpm db:generate; pnpm db:migrate; Pop-Location`.

## Gotchas
- The Neon serverless driver prints `Warning '@neondatabase/serverless' can only connect …
  through a websocket` — **expected**, not an error. Success line: `[✓] migrations applied
  successfully!`.
- After editing `schema.ts`, ALWAYS `db:generate` (and `db:migrate` if applying) — don't
  hand-edit generated SQL.
- BetterAuth peer-dep wants newer drizzle (see the `nuxt` skill) — tolerated for now.
