---
name: fast-delegate
description: DEPRECATED launch mode. Headless one-shot pi (`pi -a -p`) is NO LONGER ALLOWED for pi agents on this project — they must run live in a WMUX pane (see call-agent). This skill now only routes you to the right place and keeps the shared pi env prereqs. For Claude models use the Agent tool; for Gemini/DeepSeek/Qwen use call-agent.
---

# Fast Delegate — ⛔ headless pi is DEPRECATED

> **Do NOT run pi agents headless or in the background.** No `pi -p` / `pi --print`, no
> `run_in_background`, no detached PowerShell, no `&`/jobs, and do not spawn `pi` from the
> Bash/PowerShell tools at all. Asad must be able to watch a pi agent work in real time.
> See memory [[pi-agents-live-pane-only]]. This revokes the old "headless by default" guidance
> that used to live in this file.

This skill used to be the headless one-shot path. That path is closed for pi agents. Its only
jobs now are to **send you to the right tool** and to hold the **env prerequisites** that still
apply when pi runs live.

---

## Where to actually delegate

| What you're delegating | Use |
|---|---|
| Anything a **Claude model** can do (features, refactors, docs, bug fixes, summaries) | the **`Agent` tool** (`sonnet-engineer`, `haiku-util`) — returns results directly, no pane |
| **Gemini / DeepSeek / Qwen** (vision, second opinion, or the user named them) | the **`call-agent`** skill — **live in a WMUX pane in Workspace 1** |
| No drivable pane available for a pi agent | **STOP and ask Asad** to open a terminal in Workspace 1 and run `pi` there, then call into it |

Reliability first: prefer the **`Agent` tool** for everything Claude can do. Only reach for a pi
agent when you specifically need Gemini/DeepSeek/Qwen — and when you do, run it **live** via
`call-agent`, never headless.

### Agent roster (provider / model — for the live launch line in call-agent)

| Agent | provider | model | Best for |
|---|---|---|---|
| Gemini | `vertex` | `gemini-3.5-flash` | default; docs, vision, general execution |
| DeepSeek | `deepseek` | `deepseek-v4-pro` | deep debug / root-cause / algorithm (text only) |
| Qwen | `modal-qwen` | `qwen2.5-coder-7b` | boilerplate / tiny patches |

Never send images to DeepSeek/Qwen.

---

## Env prerequisites (ALREADY configured — apply to live pi too; do not re-diagnose)

- **`NODE_OPTIONS=--dns-result-order=ipv4first --no-network-family-autoselection`** (User env).
  Without it, `pi` (vertex) dies with `request to oauth2.googleapis.com/token failed` because
  the VPN has no IPv6 route and Node races IPv6 first. If you ever see that error, this env var
  is missing — reset it, don't re-investigate. See [[pi-vertex-oauth-ipv6-fix]].
- **`gh`** is on PATH.
- This repo is in **`~/.pi/agent/trust.json`**, so `-a` loads project context with no
  "not trusted" prompt.
- Pitfall: `--no-approve` does **NOT** mean "skip approval" — it means "ignore project files".
  Use `-a`/`--approve` to trust, or omit both.
- Long prompts: the command parser caps a line at ~965 bytes and the TUI eats long pasted text,
  so write the task to a temp `.md` and send `Read ./.task-X.md and execute it fully.` into the
  pane; delete the temp file after. See [[pi-long-prompt-tempfile]].

---

## Relationship to the other skills

- **`call-agent`** — the canonical way to run a pi agent (DeepSeek/Gemini/Qwen): **live in a
  WMUX pane in Workspace 1.** This is where pi work goes now.
- **`agent-team`** — full roster / routing / escalation policy (the org chart).

Policy of record: `delegation.md` (repo root).
