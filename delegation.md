# Agent Roles & Delegation

How the AI assistants work together on **SpeakType**. Opus 4.8 is the leader; it
orchestrates the work and delegates execution to faster/cheaper models when that's
worth it.

## Leader: Opus 4.8

Opus stays responsible for the thinking that needs it:

- Understanding intent and requirements
- Planning and splitting work into pieces
- Reviewing and integrating everything that comes back
- The final decision and the answer to the user

Opus is **not** the sole worker — it hands off heavy or repetitive execution.
Opus is still the only orchestrator: it decides which agent works, what context
the agent receives, when an agent should stop, when work escalates, and whether
the result is accepted. Sub-agents may recommend escalation or a different route,
but they do not self-organize or override Opus.

## Delegation policy: auto-delegate when worth it

Delegation is an Opus decision. The goal is faster execution and lower waste, not
delegation for its own sake.

| Task type                         | Who handles it                              |
| --------------------------------- | ------------------------------------------- |
| Trivial / quick                   | Opus, inline (no agent spawned)             |
| Long, repetitive, parallelizable  | Delegated automatically (no need to ask)    |

When Opus delegates, it tells the user **who it used and why**, and it always
reviews/integrates the result before reporting back.

## Who Opus can delegate to

| Agent / route             | Best for                                            |
| ------------------------- | --------------------------------------------------- |
| `sonnet-engineer`         | Bulk coding: features, refactors, bug fixes, docs   |
| `haiku-util`              | Quick cheap tasks: summaries, status, small edits   |
| `Explore`                 | Broad read-only searches across the codebase        |
| `general-purpose`         | Multi-step research / open-ended searches           |
| `agent-team` / `call-agent` skills | Run agents in side panes; can also reach DeepSeek, Gemini, Qwen via the `pi` CLI |

## Rules of thumb

- Default to delegating long execution; keep judgment and review on Opus.
- Never pass delegated output to the user unchecked.
- Always name who did the work and why.

> This policy is also kept in the assistant's persistent memory so it carries
> across sessions. To change it (e.g. "ask before each spawn" or "Opus does it
> all"), just say so.

---

## Fast delegation — how to actually run the `pi` agents (DeepSeek / Gemini / Qwen)

> ⛔ **pi agents run LIVE in a WMUX pane in Workspace 1 — ONLY.** Never headless (`pi -p`),
> never in the background (`run_in_background`, detached shell, `&`/jobs), never spawned from
> the Bash/PowerShell tools. Asad must be able to watch a pi agent work in real time. If there
> is no drivable pane, **STOP and ask Asad to open a terminal in Workspace 1 and run `pi`**, then
> call into it — there is no headless fallback. See the `call-agent` skill and memory
> [[pi-agents-live-pane-only]].

- **Live pane (the ONLY mode for pi agents).** Interactive TUI in a side WMUX pane via the
  **`call-agent`** skill: find the pane, send the task (`terminal_send` + enter — for long tasks
  write a temp `.md` and send `Read ./.task-X.md and execute it fully.`), then `terminal_read`
  the result. Defaults: provider `vertex`, model `gemini-3.5-flash`; override per the roster.

- **Prefer the Claude `Agent` tool first.** For anything a Claude model can do (features,
  refactors, docs, summaries), use `sonnet-engineer` / `haiku-util` — results return directly,
  no pane needed. Reach for a pi agent only for Gemini/DeepSeek/Qwen specifically, and run it live.

### Environment prerequisites (already configured on this machine — don't re-diagnose)

- `NODE_OPTIONS=--dns-result-order=ipv4first --no-network-family-autoselection` (User env) —
  fixes the daily Vertex **OAuth/IPv6 failure under VPN**. Without it `pi` (vertex) dies with
  `request to oauth2.googleapis.com/token failed`.
- `gh` is on PATH (no more full-path dance).
- This repo is trusted in `~/.pi/agent/trust.json`, so `-a` loads project context cleanly
  with no "project not trusted" prompt.

### Hard-won gotchas (this Windows box)

- The **Bash tool is broken** here (`fork: Resource temporarily unavailable`, exit 254) and
  `Start-Sleep` is blocked — so the `Monitor` tool can't pace waits. That's NOT a reason to go
  headless (forbidden — see above); just re-read the live pane after doing other useful work.
  Prefer **PowerShell** for shell work.
- For `git commit` messages, write the message to a temp file and use `git commit -F` —
  PowerShell mangles embedded quotes in `-m`.
- When listing WMUX panes, **scope to your own workspace id** (from `a2a_whoami`); the active
  workspace's panes are not yours and `terminal_read` will reject them.

Full recipe: **`.claude/skills/fast-delegate/SKILL.md`**.
