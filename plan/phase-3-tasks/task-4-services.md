# Task 4 — Services: STT (Groq), Cleanup (Gemini), Quota

## Load first
- `plan/phase-3-tasks/README.md` (GLOBAL HARD RULES)
- `plan/phase-3-tasks/task-1-foundation.md` (schema + `db` client + runtimeConfig keys)
- Skill: `.claude/skills/nuxt/SKILL.md`
- Memory: `memory/stack-decisions.md` (Groq Whisper primary, Gemini cleanup),
  `memory/cost-and-free-tiers.md`, `memory/security-and-performance.md`
- Contract: `packages/shared/src/constants.ts` (`STT_PROVIDERS`, `QUOTA_SECONDS`,
  `MAX_AUDIO_BYTES`, `ALLOWED_AUDIO_MIME`), `schemas.ts`

## Goal
Three stateless services with clean, typed I/O. **Pure logic + provider HTTP only — no route
handlers, no middleware.** All providers are called via `fetch` (no SDK dependency).

## Files to CREATE (all in `apps/backend/server/services/`)

### 1. `stt.ts` — `SttGateway`
- `transcribe(audio: { bytes: Uint8Array|Buffer; filename: string; mime: string },
  language?: Language): Promise<{ transcript: string; provider: SttProvider }>`.
- **Primary = Groq Whisper.** POST multipart to
  `https://api.groq.com/openai/v1/audio/transcriptions` with `Authorization: Bearer
  ${groqApiKey}`, fields: `file` (the audio), `model` = `groqModel`, `response_format: 'json'`,
  and `language` only when not `'auto'`. Parse `{ text }` → `{ transcript, provider: 'groq' }`.
- **On Groq failure** (non-2xx or throw): insert a `provider_failures` row, then attempt the
  **secondary** provider. For MVP there is no second STT key wired, so the secondary is a
  **stub that throws** `SttUnavailableError` — the route maps that to `502`. (Leave a clearly
  marked `// TODO secondary STT` seam; do NOT wire a paid provider.)
- Validate inputs against `MAX_AUDIO_BYTES` and `ALLOWED_AUDIO_MIME` defensively (the route
  also checks, but be safe). Export a typed error class `SttUnavailableError`.

### 2. `cleanup.ts` — `CleanupService`
- `clean(input: { transcript: string; cleanupMode: CleanupMode; websiteContext?: string }):
  Promise<{ cleanedText: string }>`.
- If `cleanupMode === 'off'` → return the transcript unchanged (no API call).
- Else call **Gemini** via `fetch`:
  `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiApiKey}`,
  POST `{ contents:[{ parts:[{ text: <prompt> }] }] }`. Build a **system-style prompt** that:
  - keeps the user's meaning and language (English **or Arabic** — never translate; preserve
    UTF-8 / Arabic exactly),
  - applies tone by mode: `light` = fix punctuation/casing/disfluencies only; `formal` =
    professional rewrite,
  - uses `websiteContext` (host + field label) to pick register (e.g. email vs chat),
  - returns **only** the cleaned text, no preamble.
- Parse `candidates[0].content.parts[0].text`. **On any failure, return the original
  transcript** (cleanup is best-effort; never fail the request because cleanup failed).

### 3. `quota.ts` — `QuotaService`
- `getRemainingSeconds(userId: string, plan: Plan): Promise<number>` — read used seconds from
  Redis key `quota:{userId}:{yyyymm}`; if Redis miss/unreachable, fall back to `SUM(duration_
  seconds)` from `usage_logs` for the current month. `remaining = QUOTA_SECONDS[plan] - used`
  (clamp ≥ 0).
- `getQuota(userId, plan): Promise<Quota>` — returns `{ secondsUsed, remainingSeconds, plan }`
  (matches `quotaSchema`).
- `recordUsage(userId: string, durationSeconds: number, provider: SttProvider): Promise<void>`
  — insert a `usage_logs` row, insert a `quota_events` row (`deltaSeconds`), and `INCRBY` the
  Redis monthly key (best-effort; DB is the source of truth).
- Redis is best-effort everywhere; **never throw from a Redis error** — fall back to Neon.

## Scope
- In scope: the three service files only.
- Out of scope: routes (Task 5), middleware (Task 3). Don't read multipart here — the route
  passes you bytes. Don't add SDK deps — use `fetch`.

## Constraints
- GLOBAL HARD RULES. Keys via `useRuntimeConfig()` only. Zero-cost: Groq + Gemini free tiers;
  do not wire a paid fallback.
- UTF-8 / Arabic safety in cleanup is critical — say so in the prompt and don't transcode.
- Stateless + idempotent; no module-level mutable caches.

## Do NOT run anything
Report the manifest + any packages to install (should be none — `fetch` is built in,
`@upstash/redis` already installed), then STOP.

## Verify (orchestrator runs)
- `typecheck` clean.
- With a real Groq key, a sample audio → `{ transcript, provider:'groq' }`.
- Forcing a Groq error → a `provider_failures` row + `SttUnavailableError`.
- `getQuota` returns a valid `quotaSchema`; `recordUsage` then lowers `remainingSeconds`.
- `clean(...,'off')` returns the input unchanged; `'formal'` returns rewritten text; Arabic in
  → Arabic out (not mangled).
