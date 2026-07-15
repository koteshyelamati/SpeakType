# Phase 3 — Backend Core

**Goal:** All MVP API routes live, guarded, and validated, with STT (Groq) + cleanup (Gemini)
working behind a provider-fallback gateway.

**Cost:** Free (Groq + Gemini free tiers; keys server-side only).

> **Execution:** broken into agent-sized, ordered tasks in **`plan/phase-3-tasks/`** (start at
> its `README.md`). Those tasks are written for the Gemini agent (file-authoring only; the
> orchestrator runs all installs/migrations/typechecks). They bake in the **compatibility
> contract** so Phase 3 can't break the shipped extension MVP:
> routes must resolve under **`/api/...`**, responses must match the `@speaktype/shared` Zod
> schemas exactly, audio is multipart, CORS must allow `chrome-extension://`, BetterAuth must
> emit **UUID** user ids, and `packages/shared` + `apps/extension` are **read-only**.

## Load first
- Skill: `.claude/skills/nuxt/SKILL.md` (+ `drizzle` for DB work)
- Memory: `memory/api-contract.md`, `memory/security-and-performance.md`, `memory/stack-decisions.md`
- Contract: `packages/shared/src/{api-contract,schemas,constants}.ts`
- Code: `apps/backend/server/**`

## Routes (from the design doc)
- ☐ Auth: `POST /auth/login|register|logout|refresh`, `GET /auth/me` (BetterAuth)
- ☐ Settings: `GET /settings`, `PUT /settings`
- ☐ Usage: `GET /usage`, `/usage/history`, `/usage/quota`
- ☐ Audio: `POST /v1/audio` (multipart/base64 + optional `language`)
- ☐ Cleanup: `POST /v1/cleanup` (transcript + websiteContext + cleanupMode)

## Services
- ☐ `SttGateway`: try Groq Whisper → secondary on fail → 502 + log `provider_failures`
- ☐ `CleanupService`: Gemini with site-context system prompt (professional/casual per site)
- ☐ `QuotaService`: read/decrement quota in Redis, fallback Neon; write `usage_logs`
- ☐ `AuthService`: refresh-token rotation, revoke old
- ☐ Audio deleted right after processing + `audit_logs` deletion entry

## Middleware (order matters)
- ☐ CORS allowlist → auth (JWT) → rate-limit (Redis) → quota → handler → usage log
- ☐ Zod-validate every request body (schemas from `@speaktype/shared`)

## Verify
- Each route hit locally (`pnpm dev:backend`)
- `/usage/quota` returns before recording; `/v1/audio` returns transcript via Groq
- Forced primary failure → secondary → error toast path; `/v1/cleanup` returns site-appropriate text
- No-Bearer request → 401
