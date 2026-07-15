# Phase 2 — Extension MVP  ☑ DONE

**Goal:** The extension detects editable fields, shows the mic icon, records, uploads,
and inserts the transcript at the cursor — undo-safe.

**Cost:** Free.

## Load first
- Skill: `.claude/skills/vue/SKILL.md` (+ `monorepo-gotchas` for build/typecheck)
- Design: `DESIGN.md` (**required** — mic icon states + UI)
- Memory: `memory/api-contract.md`, `memory/security-and-performance.md`
- Contract: `packages/shared/src/{api-contract,schemas,constants}.ts`
- Code: `apps/extension/**`

## Tasks
- ☑ Field detection: `input`, `textarea`, `contenteditable` (Gmail/Notion/Slack/ChatGPT/LinkedIn)
- ☑ Mic-icon injection in a **Shadow DOM** (style-isolated); attach on focus, detach on blur/removal
- ☑ Single `MutationObserver`; debounced focus/blur handlers (no orphaned icons)
- ☑ Mic-icon states per `DESIGN.md`: idle → hover (quota tooltip) → recording ("breathing") → uploading
- ☑ `useRecorder` composable: `getUserMedia`, record clip, compress to Opus/WebM
- ☑ Permission-denied → static help panel; offline → "tap to retry", blob retained
- ☑ `useQuota`: read cached `/usage/quota`, **block recording before start if over quota**
- ☑ Upload via `POST /v1/audio`; if `autoCleanup` → `POST /v1/cleanup` with site context
- ☑ `requireConfirmation` on → inline Accept/Reject/Edit preview; off → insert immediately
- ☑ Insertion: `Range`/`setRangeText` + **one synthetic `input` event** (one-step Ctrl+Z)
- ☑ Re-evaluate `websiteContext` from focused element at the moment recording starts
- ☑ Popup: sign-in (BetterAuth), store JWT in extension storage, show status

### Keyboard activation (toggle, cross-platform)
- ☑ `commands` entry `toggle-dictation` in the MV3 manifest — **toggle**: press = start, press = stop
- ☑ Platform-aware `suggested_key` (keeps the "W"): `default` = `Alt+Shift+W`, `mac` = `MacCtrl+Shift+W` (= Ctrl+Shift+W on Mac; `⌘`-based combos close tabs/windows, so avoided)
- ☑ `background.ts` listens to `chrome.commands.onCommand` → toggles dictation on the **currently focused** editable field (same path as a mic click)
- ☑ If no editable field is focused → no-op (or focus hint); never record blind
- ☑ Onboarding/popup documents safe alternatives + links to `chrome://extensions/shortcuts` for rebinding (Win key is OS-reserved and unavailable)
- ☑ Optional later: push-to-talk (hold) mode via content-script keydown/keyup — deferred unless requested
- ⚠️ Constraint: Chrome `commands` allows only Ctrl/Alt/Shift (and ⌘/MacCtrl on Mac), **not the Windows/Meta key**

## Verify
- Load unpacked in Chrome (WXT dev); focus field on Gmail/Slack → icon appears with correct states
- Dictate → text inserted at cursor; Ctrl+Z undoes the whole block once
- Over-quota blocks before recording; mic-denied shows help panel; offline retains + retries
- Keyboard: `Alt+Shift+W` (Win/Linux) / `Ctrl+Shift+W` (Mac) toggles recording on the focused field; pressing again stops; rebinding in `chrome://extensions/shortcuts` works
