# Task 4 — Review, verify & prove (Phase 5 exit gate · DeepSeek)

> **Mission:** audit the whole Phase-5 security surface — the three files Gemini hardened in
> Tasks 1–3 **and** the items Phase 3 already shipped — confirm it matches `plan/phase-5-security.md`
> and the locked decisions, **close any gap you find in-file**, and produce a proof report + the
> exact test matrix the orchestrator will execute. **Review/harden only — no redesign, no Redis,
> no new dependency.**

## When this runs
After Gemini's Tasks 1–3 are merged and the orchestrator's `typecheck` / `lint` / `build` are green.

## Division of labor (important — your shell is broken on this box)
- **DeepSeek (you):** read + audit the files, fix any gap by **editing the file in place**, and
  **write the proof report** `plan/phase-5-tasks/PHASE-5-PROOF.md`. You **cannot run commands** —
  for every check that needs execution, write the **exact command** and its **expected output**
  into the proof so the orchestrator can run it verbatim.
- **Orchestrator (Opus, Workspace 1):** runs `typecheck` + `lint` + backend `build` + extension
  `build`, and the live security smoke-tests; appends the green results to the proof.

## Load first (read in order)
- `plan/phase-5-tasks/README.md` (GLOBAL HARD RULES + locked decisions + "what already exists")
- `plan/phase-5-tasks/task-1-ratelimit-inmemory.md`, `task-2-cors-hardening.md`,
  `task-3-extension-hardening.md` (what each task was supposed to produce)
- `plan/phase-5-security.md` (the phase contract + the "Explicitly NOT needed" list)
- Skills: `.claude/skills/nuxt/SKILL.md`, `.claude/skills/vue/SKILL.md`
- Memory: `memory/security-and-performance.md`, `memory/api-contract.md`, `memory/stack-decisions.md`

## Audit scope (only these files)
**Gemini's Phase-5 changes:**
- `apps/backend/server/middleware/03.ratelimit.ts` (in-memory limiter)
- `apps/backend/server/middleware/01.cors.ts` (hardened CORS)
- `apps/extension/wxt.config.ts` (manifest CSP + permissions)

**Phase-3 items you AUDIT but DO NOT rebuild** (confirm still correct; only fix a real defect):
- `apps/backend/server/utils/tokens.ts` + `apps/backend/server/api/auth/refresh.post.ts`
  (refresh rotation: old token revoked, new pair issued, revoked/expired rejected)
- `apps/backend/server/middleware/02.auth.ts` (Bearer required; `publicPaths` correct)
- `apps/backend/server/middleware/04.quota.ts` (over-quota → 402 before record)
- `apps/backend/server/api/v1/audio.post.ts` (size+mime validated **before** processing; audio
  discarded in-memory; `audit_logs` deletion row written; no key logged)

**Do NOT touch** `packages/shared/**`, generated `auth-schema.ts`, migration SQL, `package.json`,
or any lockfile. No new dependencies. No Redis. No new features.

---

## Review checklist (exactly what to verify and fix)

### A. Rate limiting (Task 1)
- [ ] No `@upstash/redis` import and no `UPSTASH_*` read anywhere in `03.ratelimit.ts`.
- [ ] Enforces `RATE_LIMIT_PER_HOUR[plan]` per `userId`; over-limit → `429` `RATE_LIMITED` via `fail`.
- [ ] Skips non-`/api`, `OPTIONS`, and missing-auth requests (does not 401 public routes).
- [ ] Map is memory-bounded (windows expire / swept); runs after `02.auth.ts`.

### B. CORS (Task 2)
- [ ] No `Access-Control-Allow-Credentials` header (bearer model, no cookies).
- [ ] Reflects only the specific allowed origin — never `*`; disallowed origins get no CORS headers.
- [ ] `Access-Control-Max-Age` present; methods/headers unchanged; `OPTIONS → 204` intact.

### C. Extension (Task 3)
- [ ] `content_security_policy.extension_pages` = `script-src 'self'; object-src 'self';`
      (no `unsafe-eval`, no `unsafe-inline` script, no remote host).
- [ ] `permissions` is exactly `['storage', 'activeTab']`; nothing added.
- [ ] `host_permissions` still `['<all_urls>']` (justified) — not narrowed, not widened.

### D. Auth surface (Phase-3 audit)
- [ ] No-Bearer on a protected route → 401; refresh rotates (old revoked, new issued); revoked or
      expired refresh → 401; secrets only via `useRuntimeConfig()`, never logged or sent to client.

### E. Audio path (Phase-3 audit)
- [ ] Upload size + mime checked **before** transcription; over-limit → 413 / wrong-mime → 400.
- [ ] Over-quota → 402 **before** usage is recorded.
- [ ] Audio bytes are in-memory only (never written to disk) and an `audit_logs` "discarded" row
      is written. **Attest** that "encrypt at rest" is N/A by design (no persistence) — no crypto
      code is expected or wanted.

### F. Descope discipline
- [ ] No CSRF protection added (single bearer model — explicitly not needed).
- [ ] No provider-failure retry queue added (passive logging only).
- [ ] No Redis, no new dependency, no `package.json`/lockfile change.

For each item: confirm clean **or** fix it in-file and record the fix with `file:line` in the proof.

---

## Proof deliverable (write this file)
Create **`plan/phase-5-tasks/PHASE-5-PROOF.md`** containing:
1. **File audit table:** each audited file → purpose → conforms? (✓ / note) → gap found → fixed.
2. **Checklist results:** A–F above, each *clean* or *fixed-here* with `file:line`.
3. **Audio at-rest attestation:** explicit lines confirming in-memory-only + the `audit_logs` row
   ⇒ encrypt-at-rest is satisfied by design.
4. **Test matrix for the orchestrator** — the exact commands + expected results:
   - `pnpm --filter @speaktype/backend typecheck` → no errors
   - `pnpm lint` → clean
   - `pnpm --filter @speaktype/backend build` → succeeds
   - extension typecheck + `build` → succeeds; generated `manifest.json` carries the CSP
   - live (with `pnpm dev:backend`):
     - protected route, no Bearer → `401`
     - expired access token → refresh path issues a new pair → retry succeeds
     - reuse of a **revoked/rotated** refresh token → `401`
     - `POST /api/v1/audio` over quota → `402` (no usage row added)
     - `POST /api/v1/audio` oversized → `413`; wrong mime → `400`
     - request from an origin outside the allowlist → no `Access-Control-Allow-Origin`
     - 101st `free`-user request within the hour → `429 RATE_LIMITED` (+ `Retry-After`)

## Do NOT run anything
Make any fixes, write `PHASE-5-PROOF.md`, list the commands, then **reply** "Task 4 complete"
with a summary of what you changed + the gap count closed. **STOP.**

## Definition of done (orchestrator confirms)
`typecheck` + `lint` + both builds green; every row of the test matrix passes; no Redis / new
dependency / CSRF / retry-queue introduced; `PHASE-5-PROOF.md` accurate and complete. Then Phase 5
exits.
