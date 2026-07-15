---
name: vue
description: Conventions and gotchas for the SpeakType browser extension — WXT + Vue 3 + Pinia + TypeScript (apps/extension). Read before adding/editing components, stores, composables, the content script, the popup, tsconfig, or running the extension's typecheck/dev/build.
---

# WXT + Vue 3 extension (apps/extension)

Manifest V3 extension built with **WXT `^0.20`**, **Vue `^3.5`**, **Pinia `^2.2`**, TypeScript.
Read this before touching `apps/extension/**`.

## Layout
```
src/
  entrypoints/   # background.ts, content.ts, popup/   (WXT entrypoints)
  components/    # Vue SFCs
  composables/   # reusable composition fns
  stores/        # Pinia (setup-store style: defineStore('x', () => { ... }))
  services/      # api.ts — typed client off @speaktype/shared API_ROUTES + Bearer
  styles/        # tokens.css — Material You tokens (single source: DESIGN.md)
  types/         # re-exports from @speaktype/shared
```

## Hard rules
- **Follow DESIGN.md** (Material You). The mic icon lives in a **Shadow DOM** in the content
  script so the host page can't restyle it and we can't leak CSS onto the host. Never inject
  global styles into the host page.
- **Import shapes from `@speaktype/shared`** (Settings, Quota, Language, CleanupMode,
  API_ROUTES…). Don't redefine payloads locally.
- The extension **never holds provider/DB secrets** (no Groq/Gemini/DB keys) — it only talks to
  the backend with a Bearer token.
- Pinia stores use the **setup-store** form already established in `stores/recorder.ts` and
  `stores/settings.ts` — match it.

## Typecheck — the WXT gotchas (these bit us; don't repeat)
- `typecheck` script **must be `wxt prepare && vue-tsc --noEmit`** — in that order. `wxt prepare`
  generates `.wxt/tsconfig.json` (and `.wxt/types/`); running `vue-tsc` first fails with
  `File '.wxt/tsconfig.json' not found`.
- `tsconfig.json` must extend **`"./.wxt/tsconfig.json"`** — the `./` is required. A relative
  `extends` without `./` is treated by TS as a *module* lookup and fails (TS6053), which also
  cascades into a bogus `moduleResolution: bundler` error (TS5095).
- **`vue-tsc` must be a devDependency** (`^2.1.x` for Vue 3.5). It is not pulled in automatically.
- `.wxt/` is generated — it's gitignored and eslint-ignored; regenerate with `wxt prepare`.

## Lint
- `<script lang="ts">` in `.vue` needs the TS parser. The flat eslint config wires
  `pluginVue.configs['flat/recommended']` + `parserOptions.parser = tseslint.parser` for `*.vue`.
- No `any` — use `unknown` or a precise union (eslint `@typescript-eslint/no-explicit-any`).

Verify with the monorepo gate — see the **`monorepo-gotchas`** skill.
