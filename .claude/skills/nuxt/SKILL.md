---
name: nuxt
description: Conventions and gotchas for the SpeakType backend — Nuxt 4 + Nitro server (apps/backend). Read before adding/editing API routes, server middleware, server utils, the nuxt.config, or running the backend's typecheck/dev/build. Covers the server/ layout, the BetterAuth integration, and the verify commands.
---

# Nuxt 4 + Nitro backend (apps/backend)

The backend is **Nuxt `^4.4.8`** used mainly for its **Nitro** server. There is no real
frontend here — it's an API. Read this before touching `apps/backend/server/**` or `nuxt.config.ts`.

## Stack (locked — see memory/stack-decisions.md)
- **Nuxt 4 / Nitro** — HTTP + server routes.
- **Drizzle ORM `^0.41` over Neon serverless** — data layer (see the `drizzle` skill).
- **BetterAuth `^1.2`** — auth: **bearer JWT + refresh-token rotation, no cookies**
  (`server/utils/auth.ts`). BetterAuth owns its own tables (`user`, `session`, `account`,
  `verification`) via the drizzle adapter — **do not** define those in `schema.ts`.
- **Zod from `@speaktype/shared`** — never hand-redefine a payload; import the schema.

## server/ layout
```
server/
  api/         # Nitro API handlers
  routes/      # Nitro route handlers
  middleware/  # request middleware (guard order: cors→auth→rate-limit→quota→handler→usage-log)
  services/    # business logic
  utils/       # auth.ts (BetterAuth), helpers
  db/          # schema.ts, index.ts (neon client), migrations/  (see drizzle skill)
  agents/      # in-repo agent dispatch (pi); has a _routing.test.mjs
```
Keep edits localized; reuse `@speaktype/shared` types/schemas before defining new shapes.

## Scripts (run from apps/backend, or `pnpm --filter @speaktype/backend <script>`)
- `dev` = `nuxt dev` · `build` = `nuxt build` · `preview`
- `typecheck` = **`nuxt typecheck`** — first run is slow (it generates Nuxt types); be patient,
  it is not hung.
- `db:generate` / `db:migrate` — drizzle (see the `drizzle` skill; **never `push`**).

## Gotchas
- `nuxt typecheck` prints `npm warn Unknown env config …` lines under pnpm — **harmless noise**,
  not errors.
- Real type errors look like `server/...ts(line,col): error TSxxxx`. With strict
  `noUncheckedIndexedAccess`, `arr[i]` / `arr.at(-1)` is `T | undefined` — guard before use.
- BetterAuth peer deps currently mismatch (it wants `drizzle-orm ^0.45` / `drizzle-kit ≥0.31`;
  we pin 0.41/0.30). Tolerated for now; revisit when wiring live auth in Phase 2.

Verify a backend change with the monorepo gate — see the **`monorepo-gotchas`** skill.
