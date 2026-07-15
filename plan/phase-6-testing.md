# Phase 6 — Testing

**Goal:** Prove the pipeline works end-to-end and stays working. Per AGENTS.md: never
assume changes work — test them.

**Cost:** Free.

## Load first
- Skill: `.claude/skills/monorepo-gotchas/SKILL.md` (verify gate) + `verify` / `run`
- Memory: `memory/api-contract.md`, `memory/security-and-performance.md`
- Code: the area under test (`apps/extension/**`, `apps/backend/server/**`, `packages/shared/**`)

## Tasks
- ☐ Unit tests: shared Zod schemas, `SttGateway` fallback logic, `QuotaService`, insertion helpers
- ☐ Extension injection tests on real sites (Gmail/Slack/ChatGPT) via the browser MCP
- ☐ Insertion correctness: cursor position respected; single-step undo
- ☐ End-to-end: real voice → transcript (Groq) → cleanup (Gemini) → preview → insert
- ☐ Failure paths: primary STT down → secondary → error toast; offline retain+retry; mic denied
- ☐ Security checks from Phase 5 re-run as tests where feasible
- ☐ `pnpm typecheck` + `pnpm lint` green; build (`pnpm build`) succeeds

## Tooling
- Test runner available to the project (Vitest fits Vite/Nuxt) — confirm/add in Phase 1 or here
- Browser MCP (via wmux) for live extension testing
- `verify` / `run` skills to launch and observe the app

## Verify
- Full green test run; manual end-to-end dictation works on at least two real sites
