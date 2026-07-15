# Phase 5 — Security Hardening · Task Breakdown (for the Gemini agent)

This folder splits **`plan/phase-5-security.md`** into small, ordered, tightly-scoped tasks
sized for the **Gemini** pi agent, then a final **DeepSeek** review/verify task. Each task names
the exact file to edit, the exact change, and what **not** to touch — so the agent can't drift,
invent scope, or hallucinate.

> **Goal of Phase 5 (locked):** lock down the audio path and auth surface. **Harden what exists;
> do not redesign.** This is mostly a hardening + audit pass — Phase 3 already shipped the
> skeleton.

## Decisions locked for this round (owner-approved 2026-06-18)
1. **Rate limiting stays IN-MEMORY.** Redis/Upstash is **deferred** (documented as the
   multi-instance path, not wired now). Zero new external service this round.
2. **Implement ALL of Phase 5** — backend **and** the extension hardening items.
3. **Audio "encrypt at rest" = satisfied by design.** Audio is processed in-memory and never
   written to disk, so there is **no crypto code** — a task documents the no-persistence guarantee
   instead.

## What already exists (built in Phase 3 — DO NOT rebuild, only audit)
Treat these as **done**; the DeepSeek task (Task 4) audits them, it does not re-implement:
- ✅ **Bearer JWT everywhere** + **refresh-token rotation** — `server/utils/tokens.ts`
  (`rotateRefreshToken` revokes the old row + `issueRefreshToken` mints a new one) wired in
  `server/api/auth/refresh.post.ts`. Revoked/expired tokens are rejected.
- ✅ **Upload validation** (size + mime) **before** processing — `server/api/v1/audio.post.ts`
  (`MAX_AUDIO_BYTES`, `ALLOWED_AUDIO_MIME`).
- ✅ **Audio discarded after processing** + an `audit_logs` row
  (`action: 'audio_transcribed_and_discarded'`).
- ✅ **Quota gate** before recording usage — `server/middleware/04.quota.ts`.
- ✅ **Secrets server-side only** via `useRuntimeConfig()`; the extension only calls our backend.

So Phase 5 adds only three real changes: an **in-memory rate limiter**, a **CORS hardening pass**,
and an **extension manifest hardening pass**.

---

## How this runs (division of labor)
**The Gemini agent ONLY writes/edits files.** Its shell is broken on this box — it must **never**
run `pnpm`, `npx`, `git`, or any command. After writing the file(s) for its task, it lists every
file it changed and **stops**.

**The orchestrator (Opus, Workspace 1) runs everything else:** `pnpm --filter @speaktype/backend
typecheck`, `pnpm lint`, `pnpm --filter @speaktype/backend build`, the extension typecheck/build,
`pnpm dev:backend` + the live security smoke-tests in each task's **Verify** block.

**The DeepSeek agent reviews + verifies** at the end (Task 4) — it audits the whole Phase-5
surface against `plan/phase-5-security.md`, closes any gap in-file, and writes the proof +
test matrix. It does not add features.

Do the Gemini tasks **strictly in order (1 → 3)**; the orchestrator typechecks after each and
only unblocks the next once it's green.

| # | Task | File | Agent | Depends on |
|---|------|------|-------|-----------|
| 1 | In-memory rate limiter (replace Redis-only, fail-open) | `task-1-ratelimit-inmemory.md` | Gemini | — |
| 2 | CORS allowlist hardening (bearer model) | `task-2-cors-hardening.md` | Gemini | — |
| 3 | Extension manifest hardening (CSP, permissions) | `task-3-extension-hardening.md` | Gemini | — |
| 4 | Review, verify & prove (phase exit gate) | `task-4-deepseek-review.md` | DeepSeek | 1–3 |

Tasks 1–3 touch disjoint files, but run them in order for clean per-task typecheck gates.

---

## GLOBAL HARD RULES (every Gemini task — non-negotiable)
1. **Do not run any command.** Write files only, then report a file manifest and stop.
2. **Harden, don't redesign.** Behavior-preserving edits + the exact change the task names. Do not
   refactor unrelated code, rename exports, or change response shapes.
3. **Do not touch** `packages/shared/**` (locked contract — read-only), any file outside the one
   your task names, BetterAuth's generated `server/db/auth-schema.ts`, or migration SQL.
4. **No new dependencies and no removed dependencies.** Do not edit `package.json` or any lockfile.
   (Task 1 stops *importing* `@upstash/redis` in the middleware but leaves the package installed
   for the future Redis swap — it does NOT uninstall it.)
5. **Conform to the contract.** Import constants/types from `@speaktype/shared` — never
   hand-redefine `RATE_LIMIT_PER_HOUR`, plans, or limits.
6. **Secrets stay server-side**, read via `useRuntimeConfig()`. Never hardcode, log, or ship a key
   to the client.
7. **No Redis this round.** Do not import `@upstash/redis`, do not read `UPSTASH_*`. In-memory only.
8. **UTF-8 + no encoding changes.** Preserve file encoding and line endings.
9. **Stay in your task.** Don't create files that belong to another task. One file per task unless
   the task explicitly says otherwise.

---

## Definition of done (whole phase)
All three Gemini tasks merged; `typecheck` + `lint` + backend `build` + extension `build` clean;
the security smoke-tests pass (no-Bearer → 401; expired → refresh works; revoked refresh →
rejected; over-quota blocked before record; oversized/wrong-mime upload rejected; CORS rejects
origins outside the allowlist; rate limit returns 429 after the per-plan cap); and Task 4's
DeepSeek proof/test matrix passes. Then Phase 5 exits.
