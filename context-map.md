# Context Map — start here

The **front door** for any agent (Opus, Sonnet, Haiku, or a pi agent) before doing work on
SpeakType. It answers one question: **"I'm about to work on X — what do I load first?"**

Load only what the row says. Don't read the whole repo — that wastes tokens and slows the run.
The detailed tables live in `AGENTS.md` (skills + memory) and `memory/README.md`; this file
ties them to the actual work areas and code folders.

> Reading order for a fresh agent: this file → the matching **phase file** in `plan/`
> (its `## Load first` block is the authoritative bundle) → the files it names.

---

## Routing by work area

### Scaffolding / tooling / build config (tsconfig, eslint, prettier, verify gate)
- Skill: `.claude/skills/monorepo-gotchas/SKILL.md`
- Memory: `memory/stack-decisions.md`, `memory/cost-and-free-tiers.md`
- Code: `package.json`, `*/package.json`, `*/tsconfig.json`, `eslint.config.mjs`

### Extension — `apps/extension/**` (components, stores, composables, content script, popup)
- Skill: `.claude/skills/vue/SKILL.md`  (+ `monorepo-gotchas` for build/typecheck)
- Design: `DESIGN.md`  (**required** for the mic icon and any UI)
- Memory: `memory/api-contract.md`, `memory/security-and-performance.md`
- Contract: `packages/shared/src/{api-contract,schemas,constants}.ts`
- Phase: `plan/phase-2-extension-mvp.md`

### Backend — `apps/backend/server/**` (API routes, middleware, services, utils, auth)
- Skill: `.claude/skills/nuxt/SKILL.md`  (+ `drizzle` if touching the DB)
- Memory: `memory/api-contract.md`, `memory/security-and-performance.md`, `memory/stack-decisions.md`
- Contract: `packages/shared/src/{api-contract,schemas,constants}.ts`
- Phase: `plan/phase-3-backend-core.md` · security: `plan/phase-5-security.md`

### Database / schema / migrations — `apps/backend/server/db/**`
- Skill: `.claude/skills/drizzle/SKILL.md`  (UUID PKs, generate→migrate, NEVER push)
- Memory: `memory/stack-decisions.md`, `memory/security-and-performance.md`
- Rule: see `AGENTS.md` → DATABASE SCHEMA CHANGES

### Shared contract — `packages/shared/**` (the extension↔backend boundary)
- Memory: `memory/api-contract.md` (source of truth — keep both apps in sync)
- Code: `packages/shared/src/index.ts` and siblings

### Billing — `apps/backend/server/services/**` + constants
- Memory: `memory/stack-decisions.md`, `memory/cost-and-free-tiers.md`
- Phase: `plan/phase-4-billing.md`  (**Stripe stays deferred — flag cost first**)

### Testing / verifying a change
- Skill: `.claude/skills/monorepo-gotchas/SKILL.md` (the verify gate) + `verify` / `run`
- Phase: `plan/phase-6-testing.md`

---

## Always-true constraints (every agent, every task)
1. **Zero-cost MVP** — flag any paid step before doing it (`memory/cost-and-free-tiers.md`).
2. **Decisions are locked** — don't silently swap a provider/library (`memory/stack-decisions.md`).
3. **Contract lives in `packages/shared`** — extension and backend must not drift.
4. **UTF-8 + Arabic safety** — never corrupt encoding (see `AGENTS.md` → Encoding Rules).
5. **Secrets are server-side only** — the extension never holds Groq/Gemini/DB keys.

## Delegating to another agent?
Use **`.task-template.md`** — copy it to `.task-<name>.md`, fill the read-list from the row
above, then point the agent at it. Delete the temp file when the task is done.
