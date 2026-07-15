# Phase 5 — Security Hardening

**Goal:** Lock down the audio path and auth surface. This product is sequential and
high-demand, and it handles voice — security is first-class, not an afterthought.

**Cost:** Free.

## Load first
- Skill: `.claude/skills/nuxt/SKILL.md` (+ `drizzle` for `refresh_tokens`/`audit_logs`)
- Memory: `memory/security-and-performance.md`, `memory/api-contract.md`, `memory/stack-decisions.md`
- Code: `apps/backend/server/middleware/**`, `apps/backend/server/utils/auth.ts`

## Tasks
- ☐ Bearer JWT everywhere; refresh-token **rotation** (`refresh_tokens.revoked`)
- ☐ CORS allowlist: dashboard origin + `chrome-extension://<id>` only
- ☐ Rate limiting via Redis (free: 100 req/hr, pro: 1000 req/hr)
- ☐ Upload validation: size + mime checked **before** processing
- ☐ Audio deleted right after processing; deletion recorded in `audit_logs`
- ☐ Encrypt any temporarily-stored audio at rest
- ☐ Secrets server-side only — extension never holds Groq/Gemini/DB keys
- ☐ Extension CSP; no remote code; minimal host permissions
- ☐ (Ready) Stripe webhook signature + idempotency for when billing lands

## Explicitly NOT needed (single bearer-JWT model)
- CSRF protection — removed
- Provider-failure retry queue — descoped (passive logging only)

## Verify
- No-Bearer → 401; expired token → refresh path works; revoked refresh → rejected
- Over-quota blocked before record; oversized/wrong-mime upload rejected
- Audio file absent after processing + `audit_logs` deletion row present
- CORS rejects origins outside the allowlist
