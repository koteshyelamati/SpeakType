# SpeakType — Build Roadmap

This folder is the **public roadmap**. One file per phase. Each phase lists its goal,
the concrete tasks, and how to verify it's done.

> Full architecture + locked decisions live in the approved plan and in `../memory/`.
> The original design doc is `../doc/VoiceToText_Complete_Project_Documentation.md` (local only).

## Phases

| Phase | Status | File | Goal |
|---|---|---|---|
| 1 | ☑ | [phase-1-foundation.md](phase-1-foundation.md) | Scaffold the monorepo, DB, auth, shared contract, design + memory docs |
| 2 | ☐ | [phase-2-extension-mvp.md](phase-2-extension-mvp.md) | Mic-icon injection, recording, upload, cursor-aware insertion |
| 3 | ☐ | [phase-3-backend-core.md](phase-3-backend-core.md) | Auth, settings, usage/quota, STT gateway, AI cleanup |
| 4 | ☐ | [phase-4-billing.md](phase-4-billing.md) | Billing abstraction ready (Stripe deferred, not wired) |
| 5 | ☐ | [phase-5-security.md](phase-5-security.md) | Rate limiting, CORS, audit logging, upload validation |
| 6 | ☐ | [phase-6-testing.md](phase-6-testing.md) | Unit, injection, and end-to-end tests |

## Status legend
`☐` not started · `◐` in progress · `☑` done

## Cost guarantee
Every phase of the MVP runs on **free tiers only**. Any step that would introduce a paid
service is flagged in the relevant phase file and must be confirmed before it's done.
