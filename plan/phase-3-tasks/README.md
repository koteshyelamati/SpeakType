# Phase 3 — Backend Core · Task Breakdown (for the Gemini agent)

This folder splits **`plan/phase-3-backend-core.md`** into small, ordered, tightly-scoped
tasks sized for the **Gemini** pi agent. Each task says exactly which files to create, what
shape they must have, and what **not** to touch — so the agent can't drift or waste time.

> **Source of truth:** the Zod schemas + route constants in `packages/shared/src`. Both the
> extension and backend import them. The backend must conform to them **exactly** — the
> extension is already built against them and is **out of scope** here.

---

## How this runs (division of labor)

**The Gemini agent ONLY writes/edits files.** Its shell is broken on this box — it must
**never** run `pnpm`, `npx`, `drizzle-kit`, `git`, or any command. After writing the files for
its task, it lists every file it created/changed and **stops**.

**The orchestrator (Opus) runs everything else** between tasks:
- dependency installs, the BetterAuth CLI, `db:generate` / `db:migrate`
- `pnpm --filter @speaktype/backend typecheck` and `pnpm lint`
- `pnpm dev:backend` + the route smoke-tests in each task's **Verify** block

Do tasks **strictly in order (1 → 5)**. The orchestrator typechecks after each task and only
unblocks the next once it's green. If a task needs a dependency that isn't installed, the
agent **lists it and stops** — it does not install anything.

| # | Task | File | Depends on |
|---|------|------|-----------|
| 1 | Foundation: config, env, DB schema + client | `task-1-foundation.md` | — |
| 2 | Auth: BetterAuth + contract token routes | `task-2-auth.md` | 1 |
| 3 | Middleware: CORS → auth → rate-limit → quota | `task-3-middleware.md` | 1, 2 |
| 4 | Services: STT (Groq), Cleanup (Gemini), Quota | `task-4-services.md` | 1 |
| 5 | Feature routes: settings, usage, audio, cleanup | `task-5-routes.md` | 2, 3, 4 |
| 6 | Review, harden & prove (phase exit gate) | `task-6-review-hardening.md` | 1–5 |
| 7 | Final fixes: green the gate + close 3 robustness gaps | `task-7-final-fixes.md` | 6 |

### Orchestrator-only steps (NOT for the agent)
- **Before Task 2:** install `jose` and `@upstash/redis` in `apps/backend`.
- **After Task 2's files exist:** run the BetterAuth CLI to generate its drizzle tables into
  `server/db/auth-schema.ts`, then `db:generate` → `db:migrate`.
- **After Tasks 1 & 4:** re-run `db:generate` → `db:migrate` if the schema changed.

---

## GLOBAL HARD RULES (every task — non-negotiable)

1. **Do not run any command.** Write files only, then report a file manifest and stop.
2. **Do not touch** `packages/shared/**` (locked contract — read-only), `apps/extension/**`,
   or any file outside `apps/backend/**` unless a task explicitly says so.
3. **Conform to the contract exactly.** Import schemas/types/constants/routes from
   `@speaktype/shared` — never hand-redefine a payload. Response JSON field names and types
   must match the Zod schemas in `packages/shared/src/schemas.ts` byte-for-byte.
4. **Routes live in `server/api/`** so they resolve under **`/api/...`** (the extension calls
   `http://localhost:3000/api` + path). Putting a route in `server/routes/` is WRONG.
5. **Secrets stay server-side**, read via `useRuntimeConfig()`. Never hardcode a key, never
   send a key to the client, never log a key value.
6. **DB:** UUID PKs for every non-BetterAuth table (`uuid('id').primaryKey().defaultRandom()`).
   Never write or run `drizzle-kit push`. Don't hand-edit generated SQL.
7. **Zero-cost MVP.** Groq + Gemini + Upstash + Neon free tiers only. Don't add a paid service.
   Don't swap any locked provider/library (see `memory/stack-decisions.md`).
8. **Preserve UTF-8**; never corrupt Arabic text (the `ar` language path matters).
9. **No new dependencies on your own.** If you need a package that isn't in
   `apps/backend/package.json`, list it in your report and stop.
10. **Stay in your task.** Don't create files that belong to a later task.

---

## Compatibility contract (what Phase 3 must NOT break)

The extension MVP is already wired to these. Verify against them, don't change them:

| Method + path (under `/api`) | Request | Response (exact) |
|---|---|---|
| `POST /auth/register` | `{email, password, name?}` | `{accessToken, refreshToken, expiresIn}` |
| `POST /auth/login` | `{email, password}` | `{accessToken, refreshToken, expiresIn}` |
| `POST /auth/refresh` | `{refreshToken}` | `{accessToken, refreshToken, expiresIn}` |
| `POST /auth/logout` | (Bearer, no body) | `204` / `{}` |
| `GET /auth/me` | (Bearer) | `{id (uuid), email, name (nullable), plan}` |
| `GET /settings` | (Bearer) | `{language, preferredModel, autoCleanup, requireConfirmation}` |
| `PUT /settings` | partial of settings | full settings (same shape) |
| `GET /usage/quota` | (Bearer) | `{secondsUsed, remainingSeconds, plan}` |
| `GET /usage` · `GET /usage/history` | (Bearer) | `{entries: UsageEntry[]}` for history |
| `POST /v1/audio` | multipart: `audio`(blob), `language?`, `durationSeconds` | `{transcript, provider, durationSeconds, requestId (uuid)}` |
| `POST /v1/cleanup` | `{transcript, cleanupMode, websiteContext?}` | `{cleanedText}` |

Also fixed:
- Backend dev runs on **port 3000** (Nuxt default) — do not change it.
- Bearer header: `Authorization: Bearer <accessToken>`.
- Auth routes throw on the client (no fallback) — they MUST return the exact token shape or
  login breaks. The other routes have client-side fallbacks but should still be correct.
- `provider` is one of `['groq','secondary']`; `plan` is `['free','pro']`;
  `language` is `['auto','en','ar']`; `cleanupMode` is `['off','light','formal']`.

---

## Definition of done (whole phase)
All five tasks merged; `typecheck` + `lint` clean; migrations applied to Neon; and every row
in the compatibility table verified live with `pnpm dev:backend` (incl. no-Bearer → 401, and
a forced Groq failure → `secondary`/502 path).
