# Task 3 — Extension manifest hardening (CSP, permissions, no remote code)

> **One file, manifest only.** Add a strict MV3 Content-Security-Policy and confirm the
> permission surface is minimal and justified. **Do not** add features, change the content
> script, or touch the build pipeline.

## Load first
- `plan/phase-5-tasks/README.md` (GLOBAL HARD RULES)
- Skill: `.claude/skills/vue/SKILL.md` (extension/WXT conventions)
- Memory: `memory/security-and-performance.md` (Extension: strict CSP, **no remote code**,
  minimal host permissions)

## The ONLY file you may edit
`apps/extension/wxt.config.ts` — only the `manifest` object.

## Exactly what to change
The current manifest declares `permissions: ['storage', 'activeTab']`,
`host_permissions: ['<all_urls>']`, and a `commands` block. Make exactly these changes:

1. **Add a strict MV3 CSP** for extension pages (popup/options/background) that forbids remote
   code — `script-src 'self'`, `object-src 'self'`:

```ts
content_security_policy: {
  extension_pages: "script-src 'self'; object-src 'self';",
},
```

2. **Keep** `permissions: ['storage', 'activeTab']` as-is — that is already minimal. Do **not**
   add `tabs`, `scripting`, `webRequest`, `<all_urls>` into `permissions`, or anything else.

3. **Keep** `host_permissions: ['<all_urls>']` but add a short justification comment above it:
   the product injects the dictation mic into inputs on **any** site the user types on, so
   broad host access is the feature, not over-reach. Do **not** narrow it (that would break the
   core "voice-to-text for every input on the web" promise) and do **not** widen it either.

The resulting `manifest` object (preserve the existing `name`, `description`, and `commands`):

```ts
manifest: {
  name: 'SpeakType',
  description: 'Voice-to-text for every input on the web',
  permissions: ['storage', 'activeTab'],
  // Broad host access is the core feature: the mic must reach inputs on any site
  // the user types on. Minimal *API* permissions above keep the surface tight.
  host_permissions: ['<all_urls>'],
  content_security_policy: {
    extension_pages: "script-src 'self'; object-src 'self';",
  },
  commands: {
    'toggle-dictation': {
      suggested_key: {
        default: 'Alt+Shift+W',
        mac: 'MacCtrl+Shift+W',
      },
      description: 'Toggle SpeakType dictation',
    },
  },
},
```

### Rules for this change
- **No remote code anywhere** — the CSP must not include `unsafe-eval`, `unsafe-inline` for
  scripts, or any remote host in `script-src`. `'self'` only.
- Do not add `web_accessible_resources`, new permissions, or a `background.service_worker` entry
  here — out of scope.
- Do not touch `srcDir`, `modules`, or anything outside the `manifest` object.
- Preserve the file's existing import and `defineConfig` structure and its formatting/quote style.

## Scope
- In scope: the `manifest` object in `apps/extension/wxt.config.ts` only.
- Out of scope: the content script, popup, stores, `packages/shared/**`, the backend, and the
  WXT build config keys other than `manifest`.

## Do NOT run anything
After editing the file, report the manifest (one file changed) and **STOP**. The orchestrator runs
the extension typecheck/build and confirms the generated `manifest.json` carries the CSP.

## Verify (orchestrator runs)
- Extension typecheck + `build` clean.
- The built `.output/**/manifest.json` contains `content_security_policy.extension_pages` with
  `script-src 'self'` and no remote/`unsafe-*` script source.
- `permissions` is exactly `['storage', 'activeTab']`; no permission was added.
