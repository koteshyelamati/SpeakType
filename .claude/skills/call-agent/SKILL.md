---
name: call-agent
description: Call a teammate pi agent (DeepSeek, Gemini, or Qwen) LIVE in a visible WMUX pane in Workspace 1 — and ONLY there. Use whenever you must run a pi agent: when the user says "use the <name> agent" / "call <name>", OR when the user describes a task and leaves the agent unnamed (you pick it from the routing table). pi agents are ALWAYS run in a user-visible pane, NEVER headless and NEVER in the background.
---

# Call Agent (live split-terminal launcher)

Purpose: call DeepSeek / Gemini / Qwen **live, in a pane the user can see**, in **Workspace 1**.
Find the right split terminal once, call the agent into it, keep it warm, reuse it.

---

## ⛔ NON-NEGOTIABLE RULE — read this first

**pi agents (Gemini, DeepSeek, Qwen) run ONLY in a live, user-visible WMUX pane in Workspace 1.**

- **NEVER** run a pi agent headless (`pi -p` / `pi --print`).
- **NEVER** run a pi agent in the background (`run_in_background`, detached PowerShell, `&`, jobs).
- **NEVER** spawn `pi` from the Bash/PowerShell tools at all. The ONLY way to launch a pi agent
  is by sending text into a WMUX pane the user can watch.
- If you cannot find or drive a pane in Workspace 1 → **STOP and ask the user to open a terminal
  in Workspace 1 and start `pi` there for you**, then send the task into that pane. Do not improvise
  a headless run as a "fallback." There is no headless fallback. Asking the user is the fallback.

Why: the user must be able to see what the pi agent is doing in real time. A backgrounded pi
agent edits the repo invisibly, can't be steered, and has burned us before. If in doubt, ask.

> This overrides any older guidance (including the `fast-delegate` skill and `delegation.md`) that
> describes headless pi as a default. For pi agents, it is not. Live pane or ask the user — nothing else.

---

## Step 0 — Precondition: is wmux identity working? (check FIRST)

Pane-driving needs the MCP to know its workspace. **Call `a2a_whoami` first.** If it returns a
workspace, continue. If it errors with **"Workspace identity unknown"**, **STOP — do not loop.**
The MCP launched without `WMUX_WORKSPACE_ID` and needs a one-time fix the *user* must apply:

> The fix is already written into `C:\Users\asad\.claude.json` (`mcpServers.wmux.env.WMUX_WORKSPACE_ID
> = ws-aa3abf3c-…`), but env is read **only at MCP startup**. Ask the user to **`/mcp` → wmux →
> reconnect** (or restart Claude Code). See memory [[wmux-identity-fix]].

While identity is broken you cannot drive a pane — **ask the user to start `pi` in their Workspace 1
terminal**, or use the Claude `Agent` tool (Sonnet/Haiku) for the work instead. **Do NOT run pi headless.**

## Step 1 — Find the live pane in Workspace 1 (the pane)

Run these in order and pick the pane that passes every gate:

1. `a2a_whoami` → confirm you are **Workspace 1** (`ws-aa3abf3c-…`); you can only drive panes you own.
2. `surface_list` / `pane_list` → list every terminal: `ptyId`, `paneId`, `shell`, `isActive`, metadata.
3. Pick the **ideal pane** — the first one that is ALL of:
   - **Owned by Workspace 1** (listed by `pane_list` for your ws). Cross-workspace `terminal_send`
     is blocked.
   - **Drivable RIGHT NOW** — confirm with a `terminal_read` that actually returns text. If
     `terminal_read` errors (e.g. `PTY … not in workspace`), that pane is NOT usable — do not send
     to it (you might be typing into your own Claude Code session). Treat it as "no pane".
   - **Not the Claude Code session pane.** Detect it: `terminal_read` shows the Claude Code UI
     (`●`, "Called wmux", tool chatter). Never type into that pane.
   - **A free shell** (PowerShell/bash prompt like `PS C:\…>`) OR **already running our pi agent**
     (a `pi` TUI we own — reuse it, see Step 3). Never hijack a pane running someone else's TUI.
   - **Wide enough: ≥72 columns** for the `pi` TUI (the banner crashes narrower panes).

4. **If no drivable free pane exists in Workspace 1:** there is no API to split/create a pane, and
   **headless is forbidden.** STOP and ask the user, in one line:
   > "I don't have a live pane to drive in Workspace 1. Please open a terminal beside me in
   > Workspace 1 and run `pi` (or just leave a free PowerShell prompt open) — then I'll call
   > <agent> into it." 
   Do not loop retrying; wait for the user.

Tag the chosen pane so the whole team can find it again:
`pane_set_metadata { label: "agent:<name>", role: "<name>", status: "warm" }`.

---

## Step 2 — Decide WHICH agent

**Mode A — the user names the agent (explicit).**
Triggers: "use the DeepSeek agent", "call Gemini", "ask Qwen to…". → Use exactly that agent.

**Mode B — the user describes a task, no name (you choose).**
Name it yourself from the routing table, then tell the user which you picked and why.

| The user's demand looks like… | Call |
|---|---|
| deep debug / root-cause / algorithm / perf (text only) | **DeepSeek** |
| boilerplate / unit tests / format / tiny patch (≤8K) | **Qwen** |
| image / screenshot / OCR / visual review | **Gemini** (never DeepSeek/Qwen) |
| fallback when a pi agent fails/times out | **Gemini** |

Guardrail: **never** send vision to DeepSeek or Qwen.

> Sonnet and Haiku are Claude agents — run them with the `Agent` tool, NOT in a pi pane. This
> skill's pane mechanism is ONLY for the pi agents: **DeepSeek, Gemini, Qwen** — and always live.

---

## Step 3 — Make the call (live TUI in the pane — the ONLY launch style)

`pi` agent identities (provider / model / role file):

| Agent | provider | model | role file |
|---|---|---|---|
| DeepSeek | `deepseek` | `deepseek-v4-pro` | `.claude/roles/deepseek-analyst.md` |
| Gemini | `vertex` | `gemini-3.5-flash` | `.claude/roles/gemini-fallback.md` |
| Qwen | `modal-qwen` | `qwen2.5-coder-7b` | `.claude/roles/qwen-coder.md` |

**There is exactly one launch style: an interactive TUI in the live pane.** No `--print`, no `-p`,
no background.

- **REUSE before relaunch (the #1 speedup).** If the chosen pane already has a warm `pi` TUI we own
  and it is `Idle`, **don't relaunch** — just send the new task into it.
- **If the pane is a fresh shell and the user has not started pi:** prefer to **ask the user to run
  `pi` in that pane** (the user explicitly wants to start pi themselves). If the user has told you
  to launch it yourself, send the interactive launch line into the pane (NO `--print`):
  ```
  pi --no-approve --no-context-files \
     --provider vertex --model gemini-3.5-flash \
     --append-system-prompt .claude/roles/gemini-fallback.md
  ```
- **Long prompts:** the command parser caps a single line at ~965 bytes, and the TUI eats long
  pasted text. So for any non-trivial task, write the full prompt to a temp file
  (`.task-<name>.md`) and send the short line: `Read ./.task-<name>.md and execute it fully.`
  Delete the temp file when the task is done.

Send the task in two moves: `terminal_send { ptyId, text }` then `terminal_send_key { ptyId, key:"enter" }`.

---

## Step 4 — Know when it's done, then report

- `pi` is slow cold (~30–120s). Don't busy-wait. Re-read the pane after doing other useful work.
- Detect completion from the TUI status line: **`Orchestrator · Idle`** = finished and still running.
  While generating it shows activity / a spinner.
- `terminal_read { ptyId, tail_lines: 30 }` to grab the answer. Relay the reply to the user; don't
  make them read the pane.
- **Always review/integrate the pi agent's output yourself before reporting it** (Opus is the surgeon).

**Environment gotchas (this repo):**
- The **Bash tool's `fork` is broken** here (`Resource temporarily unavailable`, exit 254) and
  `Start-Sleep` may be blocked — so you can't pace waits cheaply. That is NOT a reason to go
  headless; just re-read the pane after other work.
- When listing panes, scope to your own workspace id (from `a2a_whoami`); other workspaces' panes
  are not yours and `terminal_read` will reject them.

---

## One-glance recipe (live, warm-reusable, NEVER headless)

```
1. a2a_whoami → confirm Workspace 1
2. surface_list / pane_list → find a pane I own whose terminal_read RETURNS TEXT, ≥72 cols,
   not the Claude Code pane
3. no drivable pane? → STOP, ask the user to open a terminal + run pi in Workspace 1. Do NOT go headless.
4. pane_set_metadata { label:"agent:<name>", status:"warm" }
5. reuse a warm pi TUI if Idle; else ask the user to start pi (or, if told to, send the interactive launch line)
6. write the task to .task-<name>.md → terminal_send "Read ./.task-<name>.md and execute it fully." + enter
7. re-read the pane later → terminal_read → review → relay. Leave the pane warm for next time.
```
