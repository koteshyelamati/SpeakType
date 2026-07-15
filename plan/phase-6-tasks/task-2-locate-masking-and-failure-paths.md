# Task 2 — LOCATE error-masking + failure-path defects (the safety net)

> Task 1 found why the happy path is broken. This task finds the defects that **hide** breakage and
> the failure paths that will bite next. **Locate and document only** — append to
> `.phase6-findings.md` under a `## Task 2` section. The orchestrator fixes.

## Why this matters
The whole reason the voice bug was invisible for so long is that the extension **silently swallows
real errors and returns fake data**. Until that masking is gone, every future bug will also hide.
Find every place that does this, plus the failure paths Phase 6 must guarantee.

## What to TRACE and document

### A. Silent stub / mock fallbacks that mask real failures
`apps/extension/src/services/api.ts` returns hard-coded fake data in the `catch` of **multiple**
methods — not just `transcribe`. Locate **each** one and document it (these make a broken backend
look healthy):
- `getQuota()` → returns fake `{ secondsUsed: 120, … }`
- `cleanup()` → returns `[Cleaned (…)]: …`
- `getSettings()` → returns fake defaults
- `updateSettings()` → returns echoed fake settings
For each: exact `file:line`, what real error it hides, and whether it should (a) be removed so the
error surfaces, or (b) keep a fallback but **log/flag** it. Note your recommendation.

### B. Error propagation across the content → background → backend boundary
- `apps/extension/src/services/content-api.ts` (`send`) and
  `apps/extension/src/entrypoints/background.ts` (the proxy `catch`): when the backend returns a
  real error, does a useful message reach the content script, or is it flattened to a generic
  string? Document where a real status/code is lost.
- `apps/extension/src/entrypoints/content.ts` (`uploadAndApply` `catch`): does it distinguish
  "quota exhausted" / "mic denied" / "network" / "server error", or show one generic "Tap to
  retry"? Document the lost distinctions.

### C. Failure paths Phase 6 requires (locate gaps, don't build them)
Trace whether these are handled and where they would break:
- **Mic permission denied** → `useRecorder.ts` `_categorizeError` → does the UI show the right
  state? (`apps/extension/src/stores/recorder.ts`, `MicIcon.vue`.)
- **Offline / network down** → is the recorded blob retained for retry? Where is retry wired
  (`content.ts` `_retainedBlob`)? Document any path where the blob is lost.
- **STT provider down** → `apps/backend/server/services/stt.ts` returns 502 `STT_UNAVAILABLE`;
  trace what the extension shows the user for a 502 (vs. the stub masking it).
- **Auth token missing/expired in the background worker** → `apps/extension/src/services/auth-storage.ts`
  (`seedApiToken`, `watchAccessToken`) + `background.ts`: if no token is set, what does a transcribe
  attempt do? (It currently hits the stub — confirm and locate.)

### D. State-machine correctness (the "goes forever" symptom)
`apps/extension/src/stores/recorder.ts` + the transitions in `content.ts`: list every state and
check that **every** path (success, stub, error, reject, blur-mid-record) returns to `idle`.
Document any state with no exit (the stuck "Transcribing…"/"Uploading…" spinner).

## For EACH finding
Append to `.phase6-findings.md` (do **not** overwrite Task 1's section) using the README format:
Location `file:line`, Symptom, Root cause, Suggested fix, Confidence. BLOCKERs first.

## Hard rules
- **LOCATE ONLY** — edit nothing except `.phase6-findings.md`. **No commands.** Be explicit with
  `file:line`. Don't invent defects — "handled correctly" is a valid, welcome finding.

## When done
Append the `## Task 2` section, **reply** with the finding count (BLOCKER/major/minor) + a one-line
summary of each BLOCKER, and **STOP**. The orchestrator fixes.
