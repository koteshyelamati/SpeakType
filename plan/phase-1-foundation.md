# Phase 1 — Foundation  ☑ DONE

**Goal:** Stand up the monorepo skeleton, the database + auth, the shared API contract,
and the project's reference docs (design, analysis, memory) — so feature work in later
phases has a stable, consistent base.

**Cost:** Free. Neon, Upstash, Groq, Gemini all on free tiers. No paid step.

## Load first
- Skill: `.claude/skills/monorepo-gotchas/SKILL.md`
- Memory: `memory/stack-decisions.md`, `memory/cost-and-free-tiers.md`
- Code: root + `*/package.json`, `*/tsconfig.json`, `eslint.config.mjs`, `apps/backend/server/db/**`

## Tasks

### Docs & reference (no dependencies — done first)
- ☑ `plan/` folder with phase files + this index
- ☑ `doc/analysis/analysis-en.md` (plain English working reference)
- ☑ `doc/analysis/analysis-ar.md` (rich Arabic version, UTF-8 verified)
- ☑ `memory/` folder (`stack-decisions`, `cost-and-free-tiers`, `api-contract`, `security-and-performance`, `README`)
- ☑ `AGENTS.md` → "Project memory — when to read" section added
- ☑ `DESIGN.md` (Material You / Google theme + mic-icon spec)
- ☑ `LICENSE` (MIT)

### Scaffolding (installs dependencies)
- ☑ `apps/extension` — WXT + Vue 3 + TS (`pnpm create wxt`), Pinia, folders: components/composables/stores/services/types/styles
- ☑ `apps/backend` — Nuxt 4 + Nitro, folders: server/api, server/middleware, server/services, server/db, server/utils
- ☑ `packages/shared` — `@speaktype/shared`: `api-contract.ts`, `schemas.ts` (Zod), `constants.ts`
- ☑ Wire `workspace:*` deps; confirm `pnpm install` resolves links

### Database + auth
- ☑ Drizzle config + schema (tables from the design doc, UUID PKs for non-auth tables)
- ☑ Neon connection via `@neondatabase/serverless`; `.env.example` with all keys
- ☑ `drizzle generate` + `migrate` (NEVER `push`) against a free Neon database
- ☑ BetterAuth set up (bearer JWT + refresh rotation), its tables migrated

## Verify
- `pnpm install`, `pnpm typecheck`, `pnpm lint` all clean
- `drizzle generate` + `migrate` succeed against Neon
- `plan/`, `doc/analysis/{ar,en}`, `memory/`, `DESIGN.md`, `LICENSE` all exist
- Arabic analysis file opens with correct UTF-8 (no mojibake)
