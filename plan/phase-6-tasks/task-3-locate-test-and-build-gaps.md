# Task 3 — LOCATE test + build/verify-gate gaps (the proof)

> The last net: find what's missing or wrong in the **automated proof** so that once the
> orchestrator fixes Tasks 1–2, we can *keep* it working. **Locate and document only** — append to
> `.phase6-findings.md` under a `## Task 3` section. The orchestrator writes/fixes tests and runs
> the gate.

## What to TRACE and document

### A. Existing tests vs. the bugs they should have caught
The repo already has tests under `apps/extension/src/__tests__/` (e.g. `api.test.ts`,
`recorder.test.ts`, `insert-text.test.ts`, `auth-storage.test.ts`, `useQuota.test.ts`). For each:
- Does it assert the **stub fallback** behavior (i.e. does a test actually *expect* the fake
  "stubbed transcription" string)? If so, that test is **enforcing the bug** — flag it with
  `file:line`, because the orchestrator's fix will need to update it.
- Does any test cover the **MIME round-trip** (`audio/webm;codecs=opus` → backend accept)? If not,
  document the missing coverage (this is the gap that let the BLOCKER ship).

### B. Coverage gaps Phase 6 calls for (locate what's absent — don't write the tests)
From `plan/phase-6-testing.md`, check which of these have **no** test and note it:
- Shared Zod schemas (`packages/shared/src/schemas.ts`) — request/response validation.
- `SttGateway` fallback logic (`apps/backend/server/services/stt.ts`) — missing key, Groq !ok, 502.
- `QuotaService` (`apps/backend/server/services/quota.ts`) — over-quota → blocked before record.
- Insertion helper (`apps/extension/src/utils/insert-text.ts`) — input/textarea/contenteditable +
  single-step undo + cursor position.
- The backend audio route's MIME/size guards (`apps/backend/server/api/v1/audio.post.ts`).
For each absent area: name the file that *should* be tested and one line on the key case to cover.

### C. Build / verify gate
- Is there a test runner wired? Look for `vitest` / a `test` script in the root `package.json`,
  `apps/extension/package.json`, `apps/backend/package.json`, and any `vitest.config.*`. Document
  whether `pnpm test` exists and where, or that it's missing.
- Note the commands the orchestrator should run for the gate (typecheck, lint, build, test) and
  which package each belongs to. (You do **not** run them — just locate/list them for Opus.)

## For EACH finding
Append to `.phase6-findings.md` (do not overwrite earlier sections) using the README format:
Location `file:line` (or "missing — should live at `path`"), Symptom, Root cause, Suggested fix,
Confidence.

## Hard rules
- **LOCATE ONLY** — edit nothing except `.phase6-findings.md`. **No commands.** Be explicit. A test
  that correctly covers its case is a fine "looks correct" finding — don't pad.

## When done
Append the `## Task 3` section, **reply** with the gap count + a one-line summary, and **STOP**. The
orchestrator writes the tests, fixes the bug-enforcing ones, and runs the gate.
