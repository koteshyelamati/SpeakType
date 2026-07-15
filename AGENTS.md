# CRITICAL RULES - MUST FOLLOW

## RESPONSES

- Keep responses concise and to the point - unless the user asks otherwise
- explain the terminal commands you are going to run before running them,in short 
- use the terminal wmux tool to run service when every you see an ideal pane instead of runing it  in the background.  
- Prefer an existing warm, idle agent pane when it matches the needed agent. If no matching warm pane exists, run the agent in a free owned pane. If there is no ideal pane, ask the user to open a terminal beside you and run the agent there.

## DELEGATING TO PI AGENTS (long prompts)

- ⛔ **pi agents (Gemini/DeepSeek/Qwen) run LIVE in a WMUX pane in Workspace 1 — never headless, never in the background.** See the `call-agent` skill. No drivable pane → STOP and ask the user to open a terminal in Workspace 1 and run `pi`, then send the task into it.
- The TUI eats long pasted text and the command parser caps a line at ~**965 bytes**. So for any non-trivial pi prompt: write the full prompt to a temp markdown file in the repo (e.g. `.task-<name>.md`), then send the short line **into the live pane**: `Read ./.task-<name>.md and execute it fully.` (pi has repo file access via `-a`).
- **Delete the temp `.md` file when the task is done.**

## CONTEXT MAP — the front door

Before any task, open **@context-map.md**. It routes each work area → the exact files to load
(skill + memory + contract + code), and points to the matching `plan/phase-N.md` whose
**`## Load first`** block is the authoritative per-phase bundle. Load only what the row names —
don't read the whole repo. When delegating, copy **`.task-template.md`** → `.task-<name>.md`,
fill its read-list from the map, and delete the temp file when done.

## SKILLS — read the matching one BEFORE you start

Project skills live in `.claude/skills/<name>/SKILL.md`. At the **start of a task**, read the
skill(s) whose trigger matches — and when you delegate, pass the relevant skill's rules to the
agent (the Phase-1 scaffolding bugs happened because the rules weren't given up front).

| Read this skill | Before you… |
| --- | --- |
| **`monorepo-gotchas`** | scaffold anything, wire tooling (tsconfig/eslint/prettier), run the verify gate, or **delegate a scaffold**. Always read this first for build/config work. |
| **`vue`** | touch `apps/extension/**` — components, stores, composables, content script, popup, tsconfig, or the extension typecheck/dev/build. |
| **`nuxt`** | touch `apps/backend/server/**` or `nuxt.config.ts` — API routes, middleware, utils, BetterAuth, or the backend typecheck/dev/build. |
| **`drizzle`** | change the DB schema or run migrations (`apps/backend/server/db/**`). Pairs with the DATABASE SCHEMA CHANGES rule below. |
| **`fast-delegate`** | decide WHERE to delegate — routes pi work to `call-agent` (live pane) and Claude work to the `Agent` tool. Headless pi is **deprecated/forbidden**. |
| **`call-agent`** | delegate to a pi agent (Gemini/DeepSeek/Qwen) — **always live in a visible WMUX pane in Workspace 1**, never headless/background (check `a2a_whoami` first). |

## PLANNING MODE

- Always ask clarifying questions
- Never assume design, tech stack or features
- Use deep-dive sub-agents to assist with research
- Use deep-dive sub-agents to review the different aspects of your plan before presenting to the user

## CHANGE / EDIT MODE

- Identify changes from the plan that can be implemented in parallel, and use sub-agents or agents  to implement the features efficiently
- When using sub-agents to implement features, act as a coordinator only
- Use the best model for the task - premium models for complex tasks (like coding) and mid-tier models for simpler tasks, like documentation
- After completing features (large or small), always run commands like lint, type check and next build to check code quality

## DATABASE SCHEMA CHANGES

- Whenever you make changes to the database schema, ALWAYS run the drizzle generate and migrate commands
- NEVER run drizzle push!
- For all ID columns NOT related to BetterAuth, use UUID for the ID columns and be randomly generated

## TESTING

- Use any testing tools, libraries available to the project for testing your changes
- Never assume your changes simply work, always test!
- If the project does not have any testing tools, scripts, MCP tools, skills, etc. available for testing, ask the user whether testing should be skipped.

## UI DESIGN

- Always follow the UI design system when creating or reviewing components or pages.
- Design System: @DESIGN.md

# AGENTS

Guidance for AI agents working on **SpeakType**.

## PROJECT MEMORY (read before working)

Durable project facts live in **`memory/`**. Read the relevant file(s) at the **start of any
task** before proposing changes:

- `memory/stack-decisions.md` — touching the stack, auth, ORM, STT/AI providers, or anything architectural
- `memory/cost-and-free-tiers.md` — adding/changing a service or anything that might cost money
- `memory/api-contract.md` — API routes, payload shapes, the extension↔backend boundary
- `memory/security-and-performance.md` — auth, the audio path, uploads, rate limits, performance-sensitive code

The build roadmap is in **`plan/`**; local analysis (AR/EN) is in `doc/analysis/`.
Decisions in `memory/` are **locked** — don't silently swap a provider/library; if a decision
must change, update the memory file and flag it (especially anything introducing cost).

## Encoding Rules (CRITICAL)
Always preserve UTF-8 encoding for all files.
- read this when you see files with arabic text or context:

    Never convert Arabic text into escaped, ANSI, Windows-1252, or mojibake characters.
    Before editing a file:
    detect file encoding
    preserve BOM and line endings
    When saving files:
    use UTF-8
    do not change encoding unless explicitly requested
    If Arabic text appears corrupted (example: ط§ظ„...):
    stop editing
    reload file using UTF-8
    verify characters visually before saving
    Never overwrite a file if encoding confidence is low.

## Avoid Reading
Do not scan:
node_modules
dist
build
coverage
lockfiles unless dependency-related
pnpm-lock.yaml unless dependency-related

## Security Rules
Never bypass ProtectedRoute
Preserve RBAC behavior
Validate uploads before storage operations
Never expose secrets or service keys
Preserve auth flow

# Performance Rules
Avoid unnecessary rerenders
Avoid duplicate queries
Lazy-load large routes when appropriate
Keep edits localized
Reuse code before abstracting
