# Phase 6 — Testing & Pipeline Repair · Task Breakdown (LOCATE-ONLY for the Gemini agent)

This folder splits **`plan/phase-6-testing.md`** into **3 tightly-scoped, LOCATE-ONLY tasks**
for the **Gemini** pi agent. The single most important goal:

> **MAKE THE VOICE WORK.** Real microphone audio → real Groq transcript → text inserted into
> the focused field, on a real web page. Right now it does **not** work end-to-end — it returns a
> hard-coded stub. If this stays broken, everything built in Phases 1–5 is worthless. Task 1 is
> make-or-break; Tasks 2–3 are the surrounding safety net.

## Division of labor (READ THIS FIRST — it is the whole point)

**Gemini = the DETECTIVE, not the surgeon.**
- Gemini **LOCATES** errors by **reading and tracing** the code. It does **NOT fix anything**.
- Gemini **writes every finding** into ONE shared temp file it creates at the repo root:
  **`.phase6-findings.md`** (create it in Task 1; **append** in Tasks 2–3 — never overwrite).
- Gemini **cannot run commands** (broken shell on this box) — it reasons from the code only.
- When Gemini finds an error, it records it in the file **and** reports a short summary back in
  its reply, then **STOPS**.

**Opus (orchestrator, Workspace 1) = the surgeon.**
- Opus reads `.phase6-findings.md`, **implements every fix**, runs the verify gate, and confirms
  the voice works live. Gemini never edits source code.

## The format Gemini MUST use for every finding (in `.phase6-findings.md`)

```md
## Task <N> — <area>

### Finding <N>.<M>: <short title>   [BLOCKER | major | minor]
- **Location:** `relative/path/to/file.ext:<line>`  (give the exact line or tight range)
- **Symptom:** what the user/dev observes (1 line)
- **Root cause:** the precise technical reason (1–2 lines)
- **Suggested fix:** one concrete sentence the orchestrator can implement
- **Confidence:** high | medium | low
```

Order findings inside each task by severity: **BLOCKER first**, then major, then minor.

## The tasks (run strictly in order 1 → 3)

| # | Task | File | Focus |
|---|------|------|-------|
| 1 | Locate everything blocking **real voice → text** (the critical path) | `task-1-locate-voice-pipeline.md` | THE fix |
| 2 | Locate **error-masking + failure-path** defects | `task-2-locate-masking-and-failure-paths.md` | safety net |
| 3 | Locate **test + build/verify-gate** gaps | `task-3-locate-test-and-build-gaps.md` | proof |

After each task: append findings to `.phase6-findings.md`, reply with a count + one-line summary
per BLOCKER, and STOP. The orchestrator fixes, re-runs, and only then unblocks the next task.

## GLOBAL HARD RULES (every Gemini task — non-negotiable)
1. **LOCATE ONLY. Do NOT edit, fix, refactor, or create any file except `.phase6-findings.md`.**
2. **Do not run any command** (no pnpm/npx/git). Trace by reading the code.
3. **Be explicit.** Every finding needs an exact `file:line`, not a vague area. If you can't pin a
   line, say so and give your best range + why.
4. **Don't invent.** If the path looks correct, say "looks correct" — do not manufacture a bug to
   look productive. A short, accurate list beats a long, padded one.
5. **Stay UTF-8.** When reading files with Arabic text, never corrupt encoding (you're only reading).
6. **One findings file**, repo root, `.phase6-findings.md`. Create in Task 1, append after.
