# Task 5 — Feature routes: settings, usage, audio, cleanup

## Load first
- `plan/phase-3-tasks/README.md` (GLOBAL HARD RULES + compatibility table)
- `plan/phase-3-tasks/task-2-auth.md` (`getAuth`, `respond` helpers), `task-3-middleware.md`
  (auth/quota already applied), `task-4-services.md` (the services to call)
- Skill: `.claude/skills/nuxt/SKILL.md`
- Contract: `packages/shared/src/{schemas,constants,api-contract}.ts`

## Goal
Wire the remaining protected routes to the services. Auth/CORS/rate-limit/quota are already
enforced by middleware; these handlers assume `event.context.auth = { userId, plan }` exists.
Every handler validates its body with the shared Zod schema and returns the **exact** response
shape from the compatibility table.

## Files to CREATE (under `server/api/`, so they resolve at `/api/...`)

### Settings
- `settings.get.ts` (`GET /api/settings`) — load the user's `settings` row; if none, return the
  defaults `{ language:'auto', preferredModel:'gemini-flash', autoCleanup:true,
  requireConfirmation:true }`. Shape = `settingsSchema`.
- `settings.put.ts` (`PUT /api/settings`) — body `updateSettingsSchema` (partial). Upsert the
  user's row (merge over existing/defaults) and return the **full** `settingsSchema`.

### Usage
- `usage/quota.get.ts` (`GET /api/usage/quota`) — `QuotaService.getQuota(userId, plan)` →
  `quotaSchema` `{ secondsUsed, remainingSeconds, plan }`.
- `usage/index.get.ts` (`GET /api/usage`) — a summary; return `quotaSchema` (same as quota) for
  MVP, or `{ ...quota }`. Keep it Bearer-guarded.
- `usage/history.get.ts` (`GET /api/usage/history`) — last N `usage_logs` for the user, newest
  first, shaped as `usageHistorySchema` `{ entries: UsageEntry[] }` where each entry is
  `{ id, createdAt (ISO string), durationSeconds, provider }`.

### Audio (the core route)
- `v1/audio.post.ts` (`POST /api/v1/audio`) — read **multipart** with
  `readMultipartFormData(event)`. Extract: `audio` (the file part → bytes + filename + mime),
  `language?`, `durationSeconds` (string → number; validate with `audioRequestSchema`).
  - Reject if mime ∉ `ALLOWED_AUDIO_MIME` or bytes fail `isAudioWithinLimit` → `400`/`413`.
  - `SttGateway.transcribe(...)`. On `SttUnavailableError` → `502`
    `{ error:'Transcription unavailable', code:'STT_UNAVAILABLE' }`.
  - On success: `QuotaService.recordUsage(userId, durationSeconds, provider)`, write an
    `audit_logs` row noting the audio was processed **and discarded** (we never persist audio),
    and return `audioResponseSchema` `{ transcript, provider, durationSeconds,
    requestId (uuid) }`. **Never** write the audio bytes to disk or DB.

### Cleanup
- `v1/cleanup.post.ts` (`POST /api/v1/cleanup`) — body `cleanupRequestSchema`
  `{ transcript, cleanupMode, websiteContext? }`. Call `CleanupService.clean(...)`. Return
  `cleanupResponseSchema` `{ cleanedText }`.

## Scope
- In scope: only the route files above, under `server/api/`.
- Out of scope: auth routes (Task 2), middleware (Task 3), services (Task 4). Don't re-check
  auth inside handlers (middleware did it) — just `getAuth(event)` to read the user.

## Constraints
- GLOBAL HARD RULES. Response shapes must equal the schemas **exactly**. Validate bodies with
  the shared Zod schemas; on failure return `400` with `errorResponseSchema`.
- Audio is processed in memory and **discarded immediately**; log the deletion in `audit_logs`
  (security requirement). Never persist raw audio.
- `requestId` is a fresh UUID per audio request (also used in `provider_failures`/logs).

## Do NOT run anything
Report the manifest + any packages to install (should be none), then STOP.

## Verify (orchestrator runs — full phase smoke test)
With `pnpm dev:backend` and a registered user's Bearer:
- `GET /api/settings` → defaults; `PUT /api/settings {language:'ar'}` → full settings with
  `language:'ar'`.
- `GET /api/usage/quota` → valid `quotaSchema`.
- `POST /api/v1/audio` (multipart sample) → `{ transcript, provider:'groq', durationSeconds,
  requestId }`; a `usage_logs` + `audit_logs` row appear; quota drops.
- Forced Groq failure → `502` + `provider_failures` row.
- `POST /api/v1/cleanup` → site-appropriate `cleanedText`; Arabic preserved.
- Any of these without a Bearer → `401`. Then load the **extension** against
  `http://localhost:3000/api` and confirm login + dictation work end-to-end (no fallback stubs).
