# Task 6 — Review, Harden & Prove (Phase 3 exit gate)

> **Mission:** audit every backend file built in Phase 3, **close the gaps**, and produce
> **proof** that the backend is correct, secure, performant, and senior-level — clean
> structure and reusable code. This is the gate we exit Phase 3 through. **Hardening only,
> not a redesign.** Do not gold-plate; fix what the checklist names, prove it, stop.

## When this runs
**After Task 5 (routes) is merged.** It covers the whole backend surface — config, schema,
auth, middleware, services, and routes — so it must run once everything exists.

## Load first (read in order)
- `plan/phase-3-tasks/README.md` (GLOBAL HARD RULES + the compatibility table)
- `plan/phase-3-backend-core.md` (the phase contract)
- Skills: `.claude/skills/nuxt/SKILL.md`, `.claude/skills/drizzle/SKILL.md`,
  `.claude/skills/monorepo-gotchas/SKILL.md` (the verify gate)
- Memory: `memory/security-and-performance.md`, `memory/api-contract.md`,
  `memory/stack-decisions.md`
- Contract: `packages/shared/src/{schemas,constants,api-contract}.ts` (the source of truth —
  responses must still match these byte-for-byte after your changes)

## Division of labor
- **Gemini (you):** audit + edit files, and **write the proof report** (below). You cannot run
  commands — list exactly what must be run.
- **Orchestrator (Workspace 1):** runs `typecheck` + `lint` + `build` and the route
  smoke-tests, then appends the green results to the proof. Your job is to make those pass and
  to leave a report that maps every claim to a file/line.

## Audit scope (only these)
Every file under **`apps/backend/server/**`** created in Tasks 1–5, plus `nuxt.config.ts` /
`drizzle.config.ts`. **Do NOT touch** `packages/shared/**`, `apps/extension/**`, generated
`server/db/auth-schema.ts`, or migration SQL. **No new dependencies. No new features.** Every
edit must be behavior-preserving except where the checklist says to change behavior.

---

## The hardening checklist (this is "exactly what to do")
Apply across **all** routes/services/middleware — the `login.post.ts` items are seeds, not the
whole list. For each item: fix it everywhere it occurs, or confirm in the report it's already clean.

### A. Error handling — distinguish *client* from *system* failures
- A wrong password / bad input is a **4xx**; a DB outage, Redis error, or provider crash is a
  **5xx (500/502/503)**. **Never** collapse a system failure into `401`/`400`.
- Replace blanket `try { … } catch {}` that returns a fixed 4xx with logic that **rethrows /
  maps** unexpected errors to a 5xx. (Seed: `login.post.ts` lines 18–25 return 401 for *any*
  signInEmail throw — separate "invalid credentials" from "auth system down".)
- Every route returns the contract error shape (`errorResponseSchema`: `{ error, code? }`).

### B. Observability — no silent failures, no secret leaks
- Every `catch` either handles meaningfully or **logs** (server-side, structured) before
  falling back. (Seed: `login.post.ts` lines 38–40 swallow the subscription lookup — log it;
  a silent downgrade of a paid user to `free` must be visible.)
- **Never log** tokens, refresh tokens, API keys, passwords, or full audio. Scrub before logging.

### C. Security (must all hold)
- Bearer-only (no cookie auth) on protected routes; public paths exactly per Task 3.
- Every request body validated with the shared Zod schema before use.
- Refresh tokens stored **only** as SHA-256 hashes; rotation revokes the old row.
- Audio: enforce `MAX_AUDIO_BYTES` + `ALLOWED_AUDIO_MIME`, and **delete the bytes right after
  transcription** with an `audit_logs` deletion entry. No secret ever reaches the client.
- Secrets read via `useRuntimeConfig()` only.

### D. Performance
- No redundant DB queries or duplicate `useRuntimeConfig()` calls per request (read config once
  into a local). Independent awaits use `Promise.all`. Redis is best-effort and never blocks or
  throws past a fallback. No module-level mutable caches.

### E. Structure & reuse (DRY — the senior bar)
- Extract repeated logic into small shared helpers in `server/utils/`, e.g. a single
  `resolvePlan(userId)` used by login/register/me, and one `validateBody(event, schema)` helper
  so every route validates identically. Reuse `respond.ts` (`ok`/`fail`) everywhere.
- Consistent validation + response style across all routes (no mix of `safeParse`+manual-fail
  in one route and bare `.parse()` in another for the same purpose).

### F. Types
- Remove unsafe casts where the type is already inferred (seed: `as Plan` in `login.post.ts`
  line 36 — Drizzle already infers the enum union). Zero `any`. No `@ts-expect-error` left
  behind once an import resolves.

---

## Proof deliverable (write this file)
Create **`plan/phase-3-tasks/PHASE-3-PROOF.md`** containing:
1. **File audit table:** every audited file → purpose → contract-conformance (✓ / note) →
   gaps found → fixed (✓ / N/A).
2. **Checklist results:** A–F above, each marked *clean* or *fixed-here* with the file:line.
3. **Compatibility table re-check:** each row of the README compatibility table → the handler
   that satisfies it → response shape matches the named Zod schema (✓).
4. **Security attestation:** explicit lines confirming C (no secrets logged, no raw tokens
   stored, all bodies validated, audio deleted + audited).
5. **Commands the orchestrator must run** to finish the proof (typecheck / lint / build / the
   smoke-tests), with the expected result for each.

## Do NOT run anything
Make the edits, write `PHASE-3-PROOF.md`, list the commands to run, then **reply to this task**
"Task 6 complete" with a summary of what changed + the gap count closed. STOP.

## Definition of done (orchestrator confirms)
`typecheck` + `lint` + `build` green; the route smoke-tests in Tasks 2–5 pass; every
compatibility-table row verified; `PHASE-3-PROOF.md` accurate and complete. Then Phase 3 exits.
