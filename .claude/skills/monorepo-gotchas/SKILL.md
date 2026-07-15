---
name: monorepo-gotchas
description: Hard-won fixes and the verify gate for the SpeakType pnpm monorepo — read BEFORE scaffolding, wiring tooling (tsconfig/eslint), or verifying any change, and BEFORE delegating scaffolding to another agent (so the same mistakes don't repeat). Captures the exact bugs hit while completing Phase 1.
---

# SpeakType monorepo — gotchas & the verify gate

pnpm workspace: `apps/extension`, `apps/backend`, `packages/shared` (`@speaktype/shared`).
This skill exists so the Phase-1 mistakes are **never repeated**. Read it before scaffolding,
wiring config, or running verification — and pass its rules to any delegated agent.

## The verify gate (run in this order, from repo root)
```
pnpm install
pnpm --filter @speaktype/backend db:generate
pnpm -r --if-present typecheck      # shared (tsc) + extension (wxt prepare && vue-tsc) + backend (nuxt typecheck)
pnpm lint                            # eslint . (flat config)
pnpm --filter @speaktype/backend db:migrate   # only when applying to Neon (unpooled URL)
```
- `pnpm -r` **stops at the first failing package** — fix it, then re-run to reach the others.
- For a single package's full error output, run it isolated and tee to a file:
  `pnpm --filter @speaktype/backend run typecheck *> .tc.log` then read `.tc.log`
  (**note: PowerShell `*>` writes UTF-16** — readable, just expect the encoding). Delete the
  temp log after.

## Mistakes hit in Phase 1 — and the fixes (don't repeat)

1. **tsconfig relative `extends` needs `./`.** `"extends": ".wxt/tsconfig.json"` fails (TS treats
   it as a module → TS6053, and cascades to a bogus `moduleResolution: bundler` TS5095). Correct:
   **`"./.wxt/tsconfig.json"`**.
2. **WXT typecheck order + dep.** Script must be **`wxt prepare && vue-tsc --noEmit`** (prepare
   generates `.wxt/tsconfig.json` first), and **`vue-tsc` must be a devDependency** (^2.1.x).
3. **ESLint flat config (v9).** Use the official pattern, not hand-rolled array indexing:
   ```js
   import js from '@eslint/js';            // <-- must be a devDependency
   import tseslint from 'typescript-eslint';
   import pluginVue from 'eslint-plugin-vue';
   export default tseslint.config(
     { ignores: ['**/node_modules/**','**/.output/**','**/.nuxt/**','**/.wxt/**','**/dist/**','**/*.d.ts'] },
     js.configs.recommended,
     ...tseslint.configs.recommended,
     ...pluginVue.configs['flat/recommended'],
     { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser } } },
   );
   ```
   Do **not** add `tseslint.configs.recommendedTypeChecked` without `projectService`/`project` —
   it throws at lint time. (Type-aware lint is a deferred Phase-2 enhancement.)
4. **Strict null + `noUncheckedIndexedAccess`.** `arr[arr.length-1]` / `arr.at(-1)` is
   `T | undefined`. Guard before use: `const last = arr.at(-1); if (!last) { … }`.
5. **No `any`** (`@typescript-eslint/no-explicit-any`). Use `unknown` or a precise union.
6. **`.env` is live + gitignored.** Never commit it; `.env.example` = placeholders only. When
   reading `.env`, print key *names* only, never values.

## Process lessons (cost real time/tokens in this project)
- **Run agents/commands visibly in the Workspace 1 WMUX pane** and let work report back — don't
  tight-poll a spinner. Scope `surface_list`/`pane_list`/`terminal_read` to **my own**
  `workspaceId` (from `a2a_whoami`), or they hit the *active* workspace and reject the PTY.
- **wmux identity** must resolve first (`a2a_whoami`); if "identity unknown", it needs an MCP
  reconnect — see memory [[wmux-identity-fix]]. Don't loop on it.
- **Headless `pi` needs `$null |`** or it hangs on open stdin — see [[fast-delegation-workflow]]
  and the `fast-delegate` skill.
- Prefer the **Claude `Agent` tool** for Claude-doable work; reserve `pi` for Gemini/DeepSeek/Qwen.
- When delegating a scaffold, **give the agent these rules up front** (esp. #1 and #2) — Gemini
  produced the tsconfig/vue-tsc mistakes precisely because they weren't stated.
