# Task 2 — CORS allowlist hardening (bearer model)

> **One file, small edit.** `01.cors.ts` already does an env-driven allowlist with dev reflection.
> Harden it for the **bearer-only** model: stop advertising credentials (we use no cookies), cache
> preflight, and keep production strict. **Do not** widen the allowlist or add wildcards.

## Load first
- `plan/phase-5-tasks/README.md` (GLOBAL HARD RULES)
- Skill: `.claude/skills/nuxt/SKILL.md`
- Memory: `memory/security-and-performance.md` (CORS allowlist = dashboard origin +
  `chrome-extension://<id>` only; **Bearer JWT, no cookies, no CSRF**)

## The ONLY file you may edit
`apps/backend/server/middleware/01.cors.ts`

## Exactly what to change
The current handler resolves an allowlist from `config.corsOrigins`, reflects allowed origins,
and reflects `chrome-extension://` + `http://localhost:*` **only in dev**. Keep all of that.
Make exactly these hardening changes to the response-header block:

1. **Remove** `'Access-Control-Allow-Credentials': 'true'`. The app is bearer-token only (no
   cookies), so credentials must not be advertised.
2. **Add** `'Access-Control-Max-Age': '600'` so browsers cache the preflight (fewer OPTIONS round
   trips — a perf win that doesn't loosen security).
3. Keep reflecting the **specific** matched `origin` (never `*`), and keep
   `Access-Control-Allow-Headers: 'authorization, content-type'` and
   `Access-Control-Allow-Methods: 'GET, POST, PUT, OPTIONS'`.

So the `setResponseHeaders` call becomes:

```ts
if (isAllowed) {
  setResponseHeaders(event, {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Max-Age': '600',
  });
}
```

### Rules for this change
- Do **not** change the allowlist-resolution logic, the dev-reflection branch, the `import.meta.dev`
  guard, or the `OPTIONS → 204` short-circuit. Only the header object changes as shown.
- Never emit `Access-Control-Allow-Origin: *`. Disallowed origins get **no** CORS headers (the
  existing behavior — leave it).
- Do not add new env keys. `config.corsOrigins` stays the single source of the allowlist.

## Scope
- In scope: `apps/backend/server/middleware/01.cors.ts` only.
- Out of scope: every other middleware, the runtime config schema, `packages/shared/**`, and the
  extension. Do not introduce a CORS library.

## Do NOT run anything
After editing the file, report the manifest (one file changed) and **STOP**.

## Verify (orchestrator runs)
- `typecheck` + `lint` clean.
- A preflight `OPTIONS /api/usage/quota` from an allowed origin returns `204` with
  `Access-Control-Allow-Origin: <that origin>`, the methods/headers above, `Max-Age: 600`, and
  **no** `Access-Control-Allow-Credentials` header.
- A request from an origin **not** in the allowlist (in production mode) receives **no**
  `Access-Control-Allow-Origin` header.
