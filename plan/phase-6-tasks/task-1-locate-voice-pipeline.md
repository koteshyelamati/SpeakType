# Task 1 — LOCATE everything blocking real voice → text (THE critical path)

> **Make-or-break.** Trace the complete dictation pipeline, end to end, and write down **every**
> defect that stops a real microphone recording from becoming real inserted text. You **locate and
> document only** — the orchestrator (Opus) fixes. Write findings to `.phase6-findings.md`.

## The symptom the user is hitting (reproduced, real)
On a live page, the user focuses a text box, records voice, and the preview card shows the literal
text **"This is a stubbed transcription from SpeakTypeApiClient."** — never their real words. The
"Transcribing…" spinner also appears to hang ("goes forever"). No request is visible in the **page**
Network tab. Backend logs show only the Gemini cleanup warning, never a Groq transcription line.

## A CONFIRMED root cause to document FIRST (then keep hunting for more)
The orchestrator has already traced one BLOCKER chain — **document it precisely** in the findings
file as Finding 1.1 + 1.2, with exact lines, then continue tracing for anything else:

1. **MIME mismatch.** The recorder records as `audio/webm;codecs=opus`
   (`apps/extension/src/composables/useRecorder.ts` — see `_preferredMimeType`, ~line 18). The
   backend upload check does an **exact-match** against `ALLOWED_AUDIO_MIME`
   (`apps/backend/server/api/v1/audio.post.ts` — the `INVALID_MIME_TYPE` check, ~line 70), and the
   allow-list (`packages/shared/src/constants.ts`, `ALLOWED_AUDIO_MIME`) only contains bare
   `audio/webm`. So `audio/webm;codecs=opus` is rejected with **400 INVALID_MIME_TYPE** before
   transcription ever runs.
2. **Silent stub fallback hides the 400.** `apps/extension/src/services/api.ts` → `transcribe()`
   wraps the real call in `try { … } catch { return { transcript: 'This is a stubbed
   transcription from SpeakTypeApiClient.', … } }` (~lines 128–151). Any backend error is swallowed
   and replaced with the stub — so the user sees fake text and **no error surfaces**.

Confirm both with exact line numbers, then look for the rest.

## What to TRACE (follow the audio from mic to inserted text)
Read each file and verify the data/control flow. Record any defect, mismatch, or footgun:

1. `apps/extension/src/composables/useRecorder.ts` — mime selection, the recorded Blob's `type`,
   duration, chunk handling, track cleanup.
2. `apps/extension/src/entrypoints/content.ts` — `runToggle`, `uploadAndApply`, the
   recording/preview **state machine** (the "goes forever" / stuck-spinner symptom likely lives
   here: is `setUploading`/`reset`/`setSuccess` reached on every path? can two recordings overlap?).
3. `apps/extension/src/services/content-api.ts` — how the Blob becomes `audioBuffer` + `mimeType`
   across the message boundary; does the reconstructed mime keep the `;codecs=opus` suffix?
4. `apps/extension/src/entrypoints/background.ts` — the `transcribe` proxy: Blob rebuild from
   `audioBuffer`, token seeding (`seedApiToken`/`watchAccessToken`), error propagation.
5. `apps/extension/src/services/api.ts` — `transcribe()` real call + the stub fallback; the
   `FormData` it builds (note: the `audio` part is appended **without a filename** — flag if that
   matters); whether the auth token is actually set on this client.
6. `apps/backend/server/api/v1/audio.post.ts` — multipart parse, the early Content-Length guard,
   the size check, the **MIME check**, what `type` value it actually compares.
7. `apps/backend/server/services/stt.ts` — the Groq call: does the mime/`;codecs=opus` reach Groq
   and is that OK? what happens on a missing/!ok response?
8. `packages/shared/src/constants.ts` — `ALLOWED_AUDIO_MIME` contents vs. what the browser emits.
9. `apps/extension/src/utils/insert-text.ts` + the preview path in `content.ts` — once a real
   transcript exists, does it actually land in the field (input / textarea / contenteditable)?

## For EACH finding, write to `.phase6-findings.md` (create the file in this task)
Use the exact format in `plan/phase-6-tasks/README.md` (Location `file:line`, Symptom, Root cause,
Suggested fix, Confidence). Put **BLOCKERs first**. The MIME mismatch and the stub fallback are the
two known BLOCKERs — there may be more (e.g. the stuck state machine, a filename/duration issue, a
token-not-set issue). Find them.

## Hard rules
- **LOCATE ONLY** — do not edit any file except `.phase6-findings.md`. Do not "fix while you're
  there." The orchestrator fixes.
- **Do not run commands.** Trace by reading.
- Be explicit: exact `file:line` for every finding. No vague "somewhere in content.ts".

## When done
Create/write `.phase6-findings.md` with the `## Task 1 — voice pipeline` section, then **reply**
with: the BLOCKER count and a one-line summary of each BLOCKER, and **STOP**. Do not fix anything —
the orchestrator (Opus) will read your file and implement the fixes.
