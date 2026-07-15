# AI-Assisted Development Workflow

SpeakType is built with help from a team of AI coding agents. This document explains
**how that workflow works, why it helps, and — most importantly — how to contribute
without it.**

> **TL;DR for contributors:** You do **not** need any AI subscription, paid model, or
> special tooling to contribute to SpeakType. The agent workflow below is an *optional
> accelerator the maintainer uses* — never a requirement. The project must always be
> fully buildable, testable, and contributable with a plain editor and `git`.

---

## 1. The mentality

The core idea is **one thinker, many hands**.

- A **leader** model (Opus 4.8) owns the parts that need judgment: understanding what's
  being asked, planning the work, splitting it into pieces, and reviewing/integrating
  everything that comes back. It also makes the final decision and writes the answer.
- **Worker** agents (faster, cheaper models) do the heavy, repetitive, or parallelizable
  execution — bulk coding, refactors, docs, searches, summaries.
- The leader **delegates when it's worth it**, not for its own sake. Trivial work stays
  inline; long or parallel work gets handed off. The leader always reviews the result
  before it reaches you.

This keeps quality decisions in one place while letting the boring/bulk work run in
parallel. The full role table and rules live in **[`delegation.md`](../delegation.md)**.

## 2. Agent-to-agent (A2A)

"Agent-to-agent" just means the leader can hand a scoped task to another agent and get a
result back, instead of doing everything in a single conversation. Two shapes:

- **Headless / one-shot** — the leader sends a task to a worker, the worker does it,
  prints the result, and exits. Best for "just do this," with no need to watch.
- **Live pane** — the worker runs in a visible side terminal so a human can watch it work.
  Used only when you *want* to see it happen.

The leader decides who gets the task, what context they receive, when they stop, and
whether the result is accepted. Workers can *recommend* escalation but don't self-organize.

## 3. WMUX — why it helps

**WMUX** is a terminal multiplexer that lets several agents run side-by-side in their own
panes, each visible at once. It's useful because it makes a few things concrete:

- **Parallelism you can see.** Backend and extension work (or several files) can progress
  in separate panes at the same time instead of one-at-a-time.
- **Warm, reusable panes.** An idle agent pane can be reused for the next task, so calls
  are fast instead of cold-starting every time.
- **Live observability.** You can watch an agent work, read its output, and step in.

WMUX is part of the *maintainer's* environment. **Contributors never need it.**

## 4. Contributing by tool budget — the tiers

Different people have different access to AI tools. SpeakType supports all of them. Pick
the tier that matches what you have; **all three produce equally valid contributions.**

### Tier 0 — No AI at all *(the baseline — always supported)*
A plain editor and `git`. Clone, build, test, open a PR. This is the floor the project is
guaranteed to support: if anything ever *requires* an AI tool to contribute, that's a bug
in our process, not in your setup.

### Tier 1 — Free or low-cost AI *(optional accelerator)*
Any assistant you already have access to works fine:
- A free Claude / ChatGPT / Gemini chat in the browser
- GitHub Copilot or a similar inline assistant
- A local model (e.g. via Ollama)
- The `pi` CLI pointed at its **free providers** (Gemini / DeepSeek / Qwen)

Use it however helps — none of it changes how your PR is reviewed.

### Tier 2 — Full agent stack *(what the maintainer runs)*
Opus 4.8 as leader + worker models + WMUX + the `pi` CLI. This is a personal productivity
setup, documented in [`delegation.md`](../delegation.md) and the project's `.claude/`
skills. **You are never expected to reproduce it**, and PRs are judged on the code, not the
tools that produced it.

## 5. Ground rules (so the agents never become a barrier)

1. **Tier 0 is sacred.** Every feature, script, and test must work with no AI tooling.
2. **No agent-only files in the critical path.** Build/test/run instructions live in the
   README and `CONTRIBUTING.md`, in plain commands anyone can run.
3. **Humans own the merge.** AI can draft, refactor, and review, but a human decision and
   review stand behind every merged change.
4. **Tools are private; standards are shared.** Use whatever assistant you like (or none);
   the coding standards in [`CONTRIBUTING.md`](../CONTRIBUTING.md) are what we all hold to.

---

### Maintainer references
The maintainer-specific configuration (exact models, delegation policy, `pi`/WMUX recipes,
environment fixes) lives in:
- [`delegation.md`](../delegation.md) — roles, delegation policy, `pi` recipes
- [`AGENTS.md`](../AGENTS.md) — project rules agents follow
- `.claude/skills/` — the runnable agent skills (fast-delegate, call-agent, agent-team)

These are reference material for anyone curious — **not** prerequisites for contributing.
