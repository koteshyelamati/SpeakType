# Stack Decisions (locked 2026-06-14)

These were chosen with the project owner. Do not silently change them.

| Topic | Decision | Why |
|---|---|---|
| Repo | pnpm monorepo: `apps/extension`, `apps/backend`, `packages/shared` | one contract, shared types |
| Extension | WXT + Vue 3 + TypeScript + Vite, Manifest V3 | matches README; WXT handles MV3 boilerplate |
| Backend | Nuxt 4 + Nitro | matches README; edge-friendly |
| Database | Neon Postgres (serverless, free) | free tier; owner's choice |
| ORM | **Drizzle** (`generate` + `migrate`, never `push`) | per AGENTS.md; type-safe |
| Auth | **BetterAuth** — bearer JWT + refresh rotation, no cookies | self-hosted, free, matches AGENTS.md; chosen over Supabase Auth |
| Cache / quota / rate-limit | Upstash Redis (free) | free tier |
| STT | **Groq Whisper** (free, ~2000 req/day) | replaces paid OpenAI Whisper |
| AI cleanup | **Google Gemini** free tier | replaces paid GPT/Claude; context-aware tone |
| Billing | **Stripe deferred** — schema + `BillingService` interface now, no live wiring | no money now; cheap to add later |
| `graphifiy` | **Skipped** | not needed for a voice→text→insert pipeline |
| License | MIT (open source) | simplest for adoption |
| IDs | UUID, randomly generated for all non-BetterAuth tables | per AGENTS.md |

## Conflicts resolved
- Design doc said **Supabase Auth**; AGENTS.md mandated **BetterAuth + Drizzle**. → BetterAuth + Drizzle wins.
- Design doc STT/AI = OpenAI (paid). → Replaced with Groq + Gemini (free).

## Activation (UX, locked — updated 2026-06-16 after Phase 2)
- **UI:** a **bottom-center, viewport-fixed pill** (Wispr-style), shown when an editable field
  is focused. `position:fixed` so it never drifts on scroll; not anchored to the field. It is
  NOT a field-attached dot. Lives in a Shadow DOM (styles injected into the shadow root via
  `src/styles/content-ui.css`, since page-level CSS can't cross the boundary).
- **Two triggers, same state machine:** mic-pill **click**, or the **keyboard**.
- **Keyboard = `Ctrl+Space`, handled in the content script** (`keydown`/`keyup`), NOT the
  Chrome `commands` API. It supports BOTH:
  - **Tap** (quick press) → toggle recording on; tap again → off.
  - **Hold** (> ~350 ms) → push-to-talk; records while held, stops on release.
  Push-to-talk is therefore **shipped**, not deferred. Only fires when an editable is focused;
  otherwise `Ctrl+Space` passes through to the page.
- **Why not `commands` API:** it only fires on key-DOWN (can't do hold), and 3-key combos
  (`Alt+Shift+W`) often fail to auto-bind. The `Alt+Shift+W` command still exists in
  `wxt.config.ts` as a best-effort secondary toggle, but `Ctrl+Space` is the reliable path.
- Windows/Meta key remains OS-reserved/unusable for the `commands` fallback.

## Deferred to V2
Realtime streaming (Deepgram/OpenAI Realtime), multi-language, team plans, retry queue.
