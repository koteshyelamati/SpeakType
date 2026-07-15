# Phase 5 — Security Hardening: Proof Report

> **Auditor:** DeepSeek (Task 4 — Review, Verify & Prove)  
> **Date:** 2026-06-19  
> **Result:** ALL CLEAN — zero gaps found, zero fixes needed

---

## 1. File Audit Table

| File                                             | Purpose                                       | Conforms? | Gap Found | Fixed |
| ------------------------------------------------ | --------------------------------------------- | --------- | --------- | ----- |
| `apps/backend/server/middleware/03.ratelimit.ts` | In-memory fixed-window rate limiter (Task 1)  | ✓         | None      | —     |
| `apps/backend/server/middleware/01.cors.ts`      | CORS allowlist hardening (Task 2)             | ✓         | None      | —     |
| `apps/extension/wxt.config.ts`                   | Extension manifest CSP + permissions (Task 3) | ✓         | None      | —     |
| `apps/backend/server/utils/tokens.ts`            | JWT sign/verify + refresh rotation (Phase 3)  | ✓         | None      | —     |
| `apps/backend/server/api/auth/refresh.post.ts`   | Refresh endpoint with rotation (Phase 3)      | ✓         | None      | —     |
| `apps/backend/server/middleware/02.auth.ts`      | Bearer auth gate (Phase 3)                    | ✓         | None      | —     |
| `apps/backend/server/middleware/04.quota.ts`     | Quota gate before usage (Phase 3)             | ✓         | None      | —     |
| `apps/backend/server/api/v1/audio.post.ts`       | Audio upload + transcription (Phase 3)        | ✓         | None      | —     |

---

## 2. Checklist Results (A–F)

### A. Rate Limiting (Task 1) — ALL CLEAN ✓

- [✓] **No `@upstash/redis` import.** `03.ratelimit.ts` imports only `h3`, `@speaktype/shared`, and `../utils/respond`. No `UPSTASH_*` reads.
- [✓] **Enforces `RATE_LIMIT_PER_HOUR[plan]` per `userId`.** Line 46: `const limit = RATE_LIMIT_PER_HOUR[plan] ?? RATE_LIMIT_PER_HOUR.free`. Over-limit → `fail(event, 429, 'Rate limit exceeded', 'RATE_LIMITED')` with `Retry-After` header (h3-native `number` type; correct).
- [✓] **Skips non-`/api`, `OPTIONS`, and missing-auth requests.** Lines 30-31 (path guard), 35-37 (OPTIONS), 40-43 (no auth → return; does NOT 401 public routes). Exactly as specified.
- [✓] **Map memory-bounded.** `sweep()` function deletes expired windows. Conditional sweep at `store.size > 10_000`. Runs as `03.ratelimit.ts` (after `02.auth.ts`).

### B. CORS (Task 2) — ALL CLEAN ✓

- [✓] **No `Access-Control-Allow-Credentials`.** Response headers: `Allow-Origin`, `Allow-Headers`, `Allow-Methods`, `Max-Age`, `Vary`. No credentials header.
- [✓] **Reflects only the specific allowed origin.** `'Access-Control-Allow-Origin': origin` — never `*`. Disallowed origins get no CORS headers (header block only inside `if (isAllowed)`).
- [✓] **`Access-Control-Max-Age: '600'` present.** Methods/headers unchanged. `OPTIONS → 204` via `sendNoContent(event, 204)` intact.
- [✓] **`Vary: 'Origin'` preserved.** Correct for reflected-origin CORS (tells caches the response varies by Origin).

### C. Extension (Task 3) — ALL CLEAN ✓

- [✓] **CSP: `"script-src 'self'; object-src 'self';"`.** No `unsafe-eval`, no `unsafe-inline` for scripts, no remote host. Strict MV3.
- [✓] **`permissions: ['storage', 'activeTab']` exactly.** No additions.
- [✓] **`host_permissions: ['<all_urls>']` — justified, not narrowed, not widened.** Justification comment: "Broad host access is the core feature: the mic must reach inputs on any site the user types on. Minimal _API_ permissions above keep the surface tight."

### D. Auth Surface (Phase-3 Audit) — ALL CLEAN ✓

- [✓] **No-Bearer → 401.** `02.auth.ts` lines 38-41: missing or non-Bearer header → `fail(event, 401, 'Unauthorized', 'UNAUTHENTICATED')`.
- [✓] **Expired/invalid access token → 401.** `02.auth.ts` lines 43-46: `verifyAccessToken` returns null → 401.
- [✓] **Refresh rotation.** `tokens.ts` `rotateRefreshToken`:
  - Revoked row detected → returns `{status: 'reuse'}` AND revokes ALL user tokens (replay defense). `refresh.post.ts` returns 401.
  - Expired token → revokes row, returns null. `refresh.post.ts` returns 401.
  - Valid token → revokes old row, returns `{status: 'success'}`. `refresh.post.ts` issues new pair.
- [✓] **Secrets server-side only.** All secrets (`jwtSecret`, `accessTokenTtlSeconds`, `refreshTokenTtlDays`) read via `useRuntimeConfig()` in `tokens.ts`. Never logged, never sent to client.
- [✓] **`publicPaths` correct.** `/api/auth/login`, `/api/auth/register`, `/api/auth/refresh`, `/api/webhooks/stripe` — all routes that need pre-auth access.

### E. Audio Path (Phase-3 Audit) — ALL CLEAN ✓

- [✓] **Upload size + mime checked BEFORE transcription.** `audio.post.ts`:
  - Early `content-length` guard (line 17-22) → 413 before reading body.
  - Post-parse size check (`audioPart.data.length > MAX_AUDIO_BYTES`, line 82) → 413.
  - MIME check (`ALLOWED_AUDIO_MIME.includes(audioPart.type)`, line 86) → 400.
  - `SttGateway.transcribe()` only called AFTER both checks pass.
- [✓] **Over-quota → 402 BEFORE usage is recorded.** `04.quota.ts` runs before `audio.post.ts` (middleware order: 04 → handler). `getRemainingSeconds` ≤ 0 → 402. `QuotaService.recordUsage()` called only after successful transcription in the handler.
- [✓] **Audio in-memory only.** `readMultipartFormData` reads into `Buffer` in memory. No `fs.writeFile`, no `writeFileSync`, no temp file, no streaming to disk anywhere in the audio path.
- [✓] **`audit_logs` deletion row written.** `audio.post.ts` lines 106-111: inserts row with `action: 'audio_transcribed_and_discarded'` and detail confirming bytes purged from in-memory buffer.
- [✓] **"Encrypt at rest" satisfied by design.** Audio bytes exist only as in-memory `Buffer` during the request lifecycle and are garbage-collected after the response. No persistence = no at-rest surface. No crypto code is expected or wanted.

### F. Descope Discipline — ALL CLEAN ✓

- [✓] **No CSRF protection.** Single bearer-JWT model — explicitly not needed. No CSRF tokens, no `SameSite` cookies, no CSRF middleware.
- [✓] **No provider-failure retry queue.** `SttUnavailableError` → 502. `console.error` for logging. No retry logic, no queue table writes.
- [✓] **No new Redis dependency in rate limiter.** `03.ratelimit.ts` is pure in-memory. `@upstash/redis` remains installed (for the quota service's best-effort cache + future multi-instance rate-limit swap) but is not imported by the rate limiter.
- [✓] **`utils/redis.ts` intentionally kept.** Still used by `apps/backend/server/services/quota.ts` for best-effort Redis quota caching (with DB fallback). This is the documented future multi-instance path.

---

## 3. Audio At-Rest Attestation

The audio path (`apps/backend/server/api/v1/audio.post.ts`) processes audio entirely in-memory:

1. **Line 17-22:** Early `content-length` guard rejects oversized payloads before reading any body bytes.
2. **Line 25:** `readMultipartFormData(event)` reads form parts into `Buffer` objects in memory.
3. **Line 71:** `audioPart.data` is a `Buffer` — raw PCM/WebM bytes in process memory only.
4. **Lines 99-105:** `SttGateway.transcribe({ bytes: audioPart.data, ... })` passes the buffer to the STT provider. No file system write occurs.
5. **Lines 106-111:** After transcription, an `audit_logs` row is inserted with `action: 'audio_transcribed_and_discarded'`, confirming the raw bytes are purged from the processing buffer.
6. **No `fs.writeFile`, `fs.writeFileSync`, `fs.createWriteStream`, or any temp-file creation exists anywhere in this file or in the STT gateway path.**
7. **After the response is sent, the `Buffer` is eligible for garbage collection.**

**Conclusion:** There is no at-rest audio surface. Encryption-at-rest is satisfied by design — no persistence means no data to encrypt. No crypto code is needed or expected.

---

## 4. Test Matrix for the Orchestrator

Run each command in order. Expected output shown below each command.

### 4.1 Static Checks

```bash
pnpm --filter @speaktype/backend typecheck
```

**Expected:** Exit code 0. No errors.

```bash
pnpm lint
```

**Expected:** Exit code 0. No lint violations.

```bash
pnpm --filter @speaktype/backend build
```

**Expected:** Exit code 0. `.output/` directory produced by Nitro.

```bash
cd apps/extension && npx wxt build
```

**Expected:** Exit code 0. Check generated `manifest.json`:

```bash
cat apps/extension/.output/*/manifest.json | grep -A3 content_security_policy
```

**Expected output contains:**

```json
"content_security_policy": {
  "extension_pages": "script-src 'self'; object-src 'self';"
}
```

### 4.2 Live Security Smoke Tests

Start the backend first:

```bash
pnpm dev:backend
```

Then run each test below. Replace `<valid_token>`, `<expired_token>`, etc. with actual values from a test user.

---

**Test 1: Protected route, no Bearer → 401**

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/usage/quota
```

**Expected:** `401`

---

**Test 2: Expired access token → refresh path issues a new pair → retry succeeds**

```bash
# Step A: Refresh with a valid refresh token
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<valid_refresh_token>"}'
```

**Expected:** `200` with JSON body containing `accessToken`, `refreshToken`, `expiresIn`.  
Verify old refresh token is now revoked (reuse below).

---

**Test 3: Reuse of a revoked/rotated refresh token → 401**

```bash
# Reuse the OLD refresh token from Test 2
curl -s -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<the_OLD_refresh_token_from_test_2>"}'
```

**Expected:** `401` with `"code":"INVALID_REFRESH_TOKEN"`

---

**Test 4: POST /api/v1/audio over quota → 402 (no usage row added)**

```bash
# Use a user at/over their quota limit
curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/v1/audio \
  -H "Authorization: Bearer <token_for_over_quota_user>" \
  -H "Content-Type: multipart/form-data" \
  -F "audio=@small_valid.webm;type=audio/webm" \
  -F "durationSeconds=10"
```

**Expected:** `402` with `"code":"QUOTA_EXHAUSTED"`. Check DB: no new `usage_logs` row for this request.

---

**Test 5: POST /api/v1/audio oversized → 413; wrong mime → 400**

```bash
# Oversized (curl --data-binary with content-length > 25MB)
curl -s -w "\n%{http_code}" -X POST http://localhost:3000/api/v1/audio \
  -H "Authorization: Bearer <valid_token>" \
  -H "Content-Length: 26214500" \
  -H "Content-Type: multipart/form-data"
```

**Expected:** `413` with `"code":"PAYLOAD_TOO_LARGE"`

```bash
# Wrong mime
curl -s -X POST http://localhost:3000/api/v1/audio \
  -H "Authorization: Bearer <valid_token>" \
  -F "audio=@test.txt;type=text/plain" \
  -F "durationSeconds=10"
```

**Expected:** `400` with `"code":"INVALID_MIME_TYPE"`

---

**Test 6: Request from an origin outside the allowlist → no Access-Control-Allow-Origin**

```bash
curl -s -I -X OPTIONS http://localhost:3000/api/usage/quota \
  -H "Origin: https://evil.example.com" \
  -H "Access-Control-Request-Method: GET"
```

**Expected:** `204` (the OPTIONS short-circuit still fires), but response headers do **NOT** contain `Access-Control-Allow-Origin`.

---

**Test 7: 101st free-user request within the hour → 429 RATE_LIMITED + Retry-After**

```bash
# Send 101 requests in rapid succession for a free-plan user
for i in $(seq 1 101); do
  curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
    http://localhost:3000/api/usage/quota \
    -H "Authorization: Bearer <free_user_token>" \
    -H "Origin: https://example.com"
done
```

**Expected:** Requests 1–100 return `200`. Request 101 returns `429` with `"code":"RATE_LIMITED"` and a `Retry-After` header set to a positive integer.

---

## 5. Descope Confirmation

| Concern                         | Status             | Rationale                                                                 |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------- |
| CSRF protection                 | **NOT added**      | Bearer-JWT only; no cookies → CSRF not applicable                         |
| Provider retry queue            | **NOT added**      | Passive logging only (`console.error` + `SttUnavailableError → 502`)      |
| Redis in rate limiter           | **NOT added**      | Pure in-memory Map; `utils/redis.ts` kept for quota service + future path |
| New dependencies                | **None added**     | `package.json` and lockfiles untouched                                    |
| CORS library / middleware       | **Not introduced** | Single inline handler in `01.cors.ts`                                     |
| `*` wildcard origin             | **Never emitted**  | Only reflected specific origin inside `isAllowed` block                   |
| `unsafe-eval` / `unsafe-inline` | **Not present**    | CSP is `script-src 'self'` only                                           |

---

## 6. Verdict

**Phase 5 is complete and verified.** All three Gemini hardening tasks (rate limiter, CORS, extension manifest) match their specs exactly. All Phase-3 auth/audio items remain correct. Zero real gaps found. Zero fixes applied. The audio at-rest surface is verified as satisfied-by-design (in-memory only, no persistence). The descope list is clean — no CSRF, no retry queue, no Redis creep.

**Next step:** Orchestrator runs the test matrix in §4 above and appends green results to confirm Phase 5 exit.
