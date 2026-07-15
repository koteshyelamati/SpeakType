# Task 7 — Final fixes: green the gate + close the 3 robustness gaps

> Task 6 made real gains (validation, DRY helpers, performance, structure — all good) but left
> **3 lint errors that turn the gate RED** and **3 partially-fixed areas** (error
> classification, type safety, production robustness). This task closes them precisely. **No
> redesign, no new features, no new deps.** Fix exactly what's listed, prove the gate is green
> (lint included), stop.

## Load first
- `plan/phase-3-tasks/README.md` (GLOBAL HARD RULES)
- `plan/phase-3-tasks/task-6-review-hardening.md` (the A–F bar this finishes)
- Skill: `.claude/skills/nuxt/SKILL.md`
- Contract: `packages/shared/src/{schemas,constants}.ts` (`Plan`, `authTokensSchema`,
  `userSchema` — responses must still match byte-for-byte)
- **Reference these two files — they ALREADY do error handling the right way; copy their
  approach:** `server/api/auth/refresh.post.ts` and `server/api/auth/me.get.ts`
  (try/catch around the call → `500` + `console.error` on a thrown system error; an explicit
  `4xx` for the known client case; **no `any`, no `err.message.includes(...)`**).

## The exact errors (verified by `pnpm lint` + read of each file)

### 🔴 Gate-blocking lint errors (fix first — the gate is RED until these are gone)
1. `server/api/auth/login.post.ts:23` — `catch (err: any)` → `@typescript-eslint/no-explicit-any`.
2. `server/api/auth/register.post.ts:24` — `catch (err: any)` → same.
3. `server/utils/respond.ts:51` — `catch (err)` where `err` is unused →
   `@typescript-eslint/no-unused-vars`. Change to `catch {` (the function already returns a
   generic message).

## Idea 1 — Error Classification (make it robust, not string-based)
The intent in `login`/`register` is right (split client `4xx` from system `5xx`) but the
**detection is fragile**: it matches `err.message?.includes('Invalid'|'password'|'email'|
'already exists'|'Conflict'|'Validation')`. A DB error whose text contains "Invalid" is
mis-classified as `401`; a worded-differently credential error becomes `500`.

**Do this instead:**
- Add ONE shared helper to `server/utils/respond.ts` (DRY) and export it:
  ```ts
  /** Safely read an HTTP-ish status off an unknown thrown error. */
  export function getErrorStatus(err: unknown): number | undefined {
    if (err && typeof err === 'object') {
      const e = err as { statusCode?: unknown; status?: unknown };
      if (typeof e.statusCode === 'number') return e.statusCode;
      if (typeof e.status === 'number') return e.status;
    }
    return undefined;
  }
  ```
- **Preferred:** if BetterAuth's `APIError` is importable in the installed version
  (`better-auth` `^1.2.7`), use `err instanceof APIError` to gate the classification, then read
  its numeric status. **Verify the export exists** in `node_modules/better-auth` before relying
  on it; if you cannot confirm it, use `getErrorStatus(err)` alone — do not guess an import.
- `login.post.ts`: `catch (err: unknown)` → `const status = getErrorStatus(err);` →
  `status === 401 || status === 403` ⇒ `fail(401, 'Invalid email or password',
  'INVALID_CREDENTIALS')`; **anything else** ⇒ `console.error(...)` + `fail(500, ...)`.
- `register.post.ts`: `catch (err: unknown)` → `409`/`422`/`409`-ish conflict ⇒ `409
  REGISTRATION_CONFLICT`; `400` ⇒ `400 VALIDATION_ERROR`; **else** ⇒ `console.error` +
  `fail(500, ...)`. No `message.includes` anywhere.

## Idea 2 — Type Safety (kill the casts at the source)
- **Root cause:** `getAuth` in `server/utils/respond.ts:24` returns `{ userId: string; plan:
  string }`, which forces `plan as Plan` at the call-sites. The auth middleware sets
  `event.context.auth` from a JWT payload whose `plan` is already `Plan`. **Change `getAuth` to
  return `{ userId: string; plan: Plan }`** (type the context cast inside `getAuth`).
- Then **delete the now-redundant casts**: `server/api/usage/quota.get.ts:9` and
  `server/api/usage/index.get.ts:9` (`plan as Plan` → `plan`).
- `server/utils/respond.ts:68` — `rows[0].plan as Plan`: Drizzle already infers the pgEnum
  column as `'free' | 'pro'`. Remove the cast; keep it ONLY if `typecheck` truly requires it.
- Leave the `as string` / `as number` on `useRuntimeConfig()` values — that is a known Nuxt
  runtimeConfig typing limitation and is acceptable. Do **not** churn those.
- Zero `any` anywhere when done.

## Idea 3 — Production Robustness (one careful pass)
- After Idea 1, no request path may mis-report a system outage as a client error. Re-confirm
  every `catch` in the auth routes either maps to the correct status **and logs system errors**
  (never logging tokens/passwords/keys).
- `server/api/auth/me.get.ts:14` uses a raw `sql\`SELECT ... FROM "user"\`` against the
  BetterAuth table. It is parameterized (safe), so **this is OPTIONAL**: if quick, switch to the
  typed Drizzle query using the generated `user` table from `~/server/db` / `auth-schema`; if it
  risks breaking typecheck, leave it and note it in the proof. Do not destabilize a green file.

## Hard rules
- WRITE/EDIT FILES ONLY. Run no commands. Files only under `apps/backend/server/**`.
- Behavior-preserving EXCEPT the error-status mapping above. Response bodies still match the Zod
  schemas exactly; error bodies still match `errorResponseSchema` (`{ error, code? }`).
- Do NOT touch `packages/shared/**`, `apps/extension/**`, `auth-schema.ts`, or migrations. No
  new dependencies.

## Proof
- Update `plan/phase-3-tasks/PHASE-3-PROOF.md`: mark the 3 lint errors fixed (file:line), and
  the 3 ideas now ✅ with the file:line of each fix.
- Reply to THIS task "Task 7 complete" with: the diff summary, and the commands for the
  orchestrator to run.

## Definition of done (orchestrator confirms)
`pnpm --filter @speaktype/backend typecheck` **and** `lint` **and** `build` all exit 0 (lint
MUST be clean), and no `any` / no `err.message.includes(...)` remain in the auth routes.
