# Task 1 — Foundation: config, env, DB schema + client

## Load first (read in order)
- `plan/phase-3-tasks/README.md` (the GLOBAL HARD RULES — they apply here)
- `plan/phase-3-backend-core.md`
- Skills: `.claude/skills/drizzle/SKILL.md`, `.claude/skills/nuxt/SKILL.md`
- Memory: `memory/stack-decisions.md`, `memory/api-contract.md`, `memory/security-and-performance.md`
- Contract: `packages/shared/src/{constants,schemas,api-contract}.ts`

## Goal
Stand up the backend's foundation so later tasks have config, env, a typed Neon DB client, and
the full app schema. **No routes or business logic in this task.**

## Files to CREATE (exact paths)

### 1. `apps/backend/server/db/schema.ts`
All **app** tables + pgEnums + inferred types. **Do NOT define BetterAuth's tables**
(`user`, `session`, `account`, `verification`) — those are generated in Task 2.

- **pgEnums** mirroring `@speaktype/shared` constants (import the arrays, don't retype values):
  `plan` (`PLANS`), `stt_provider` (`STT_PROVIDERS`), `cleanup_mode` (`CLEANUP_MODES`),
  `language` (`LANGUAGES`), `preferred_model` (`PREFERRED_MODELS`).
- **Tables** (every PK: `uuid('id').primaryKey().defaultRandom()`; every table `createdAt`
  `timestamp('created_at', { withTimezone: true }).defaultNow().notNull()`):
  - `settings` — `userId text not null unique` (FK → BetterAuth `user.id`, added in Task 2;
    for now just a `text` column, no FK constraint yet), `language` (enum, default `'auto'`),
    `preferredModel` (enum, default `'gemini-flash'`), `autoCleanup boolean default true`,
    `requireConfirmation boolean default true`, `updatedAt`.
  - `usageLogs` (`usage_logs`) — `userId text not null`, `durationSeconds integer not null`,
    `provider` (stt_provider enum) not null. (Shape must satisfy `usageEntrySchema`:
    `{id, createdAt, durationSeconds, provider}`.)
  - `refreshTokens` (`refresh_tokens`) — `userId text not null`, `tokenHash text not null`
    (SHA-256 hex of the refresh token — never store the raw token), `revoked boolean default
    false not null`, `expiresAt timestamp not null`.
  - `subscriptions` — `userId text not null`, `plan` (enum, default `'free'`),
    `status text default 'active'`. (Billing deferred — minimal columns only.)
  - `auditLogs` (`audit_logs`) — `userId text`, `action text not null`, `detail text`.
  - `providerFailures` (`provider_failures`) — `provider` (stt_provider enum) not null,
    `error text`, `requestId text`. (Passive log.)
  - `quotaEvents` (`quota_events`) — `userId text not null`, `deltaSeconds integer not null`,
    `reason text`.
  - `webhookEvents` (`webhook_events`) — `stripeEventId text not null` **with a UNIQUE
    constraint** (idempotency), `payload text`. (Billing deferred — table only.)
- Export inferred types with `$inferSelect` / `$inferInsert` for each table.

### 2. `apps/backend/server/db/index.ts`
The Neon serverless client. Use `drizzle-orm/neon-serverless` with
`@neondatabase/serverless` (websocket `Pool`). Read the **pooled** URL from runtime config
(`useRuntimeConfig().databaseUrl`). Export `db` (a `drizzle()` instance bound to the schema)
and re-export `* from './schema'` for convenience.

### 3. `apps/backend/drizzle.config.ts`
`defineConfig` from `drizzle-kit`: `dialect: 'postgresql'`, `schema:
['./server/db/schema.ts', './server/db/auth-schema.ts']` (the second file is generated in
Task 2 — listing it now is fine), `out: './server/db/migrations'`,
`dbCredentials.url: process.env.DATABASE_URL_UNPOOLED`. (Migrations use the **unpooled** URL.)

### 4. `apps/backend/nuxt.config.ts` (EDIT the existing file)
Add a `runtimeConfig` block binding env → server-only config. Keep `compatibilityDate` and
`devtools`. Bind exactly these (all server-side; do NOT put any under `public`):
```
runtimeConfig: {
  databaseUrl: process.env.DATABASE_URL,
  databaseUrlUnpooled: process.env.DATABASE_URL_UNPOOLED,
  upstashRedisRestUrl: process.env.UPSTASH_REDIS_REST_URL,
  upstashRedisRestToken: process.env.UPSTASH_REDIS_REST_TOKEN,
  groqApiKey: process.env.GROQ_API_KEY,
  groqModel: process.env.GROQ_MODEL || 'whisper-large-v3-turbo',
  geminiApiKey: process.env.GEMINI_API_KEY,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  jwtSecret: process.env.JWT_SECRET,
  accessTokenTtlSeconds: Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 900),
  refreshTokenTtlDays: Number(process.env.REFRESH_TOKEN_TTL_DAYS || 30),
  betterAuthSecret: process.env.BETTER_AUTH_SECRET,
  betterAuthUrl: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  corsOrigins: process.env.CORS_ORIGINS || '',
}
```

### 5. `apps/backend/.env.example` (CREATE — placeholders only, NEVER real values)
List every var above with placeholder values and a one-line comment each. Note the pooled vs
unpooled split for `DATABASE_URL` / `DATABASE_URL_UNPOOLED`, and that `CORS_ORIGINS` is a
comma-separated allowlist that must include the extension origin
(`chrome-extension://<your-id>`) and `http://localhost:3000`.

## Scope
- In scope: only the 5 files above, all under `apps/backend/`.
- Out of scope: routes, middleware, services, auth, BetterAuth tables, any command.

## Constraints
- All GLOBAL HARD RULES in the README. Especially: UUID PKs, never `push`, import enum arrays
  from `@speaktype/shared` (don't retype the literals), `userId` columns are `text` (they FK
  to BetterAuth's `user.id`, which Task 2 makes a UUID-typed text — keep them `text`).
- `strict` + `noUncheckedIndexedAccess` are on — write types accordingly.

## Do NOT run anything
After creating the files, output a manifest: each file path + a 1-line description, and the
list of any npm packages you referenced that may need installing. Then STOP.

## Verify (orchestrator runs)
- `pnpm --filter @speaktype/backend typecheck` compiles (schema + client only).
- `pnpm --filter @speaktype/backend db:generate` produces a migration under
  `server/db/migrations/` with the app tables (auth tables come after Task 2).
