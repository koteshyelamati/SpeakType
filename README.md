# SpeakType 🎙️

SpeakType is a high-performance, open-source browser extension that brings seamless, context-aware speech-to-text (Whisper-style transcription) and AI post-processing directly to your browser's input fields. 

Backed by a lightweight server, SpeakType detects editable fields (like Gmail, Slack, Notion, LinkedIn, and ChatGPT), injects a style-isolated microphone icon, and allows you to dictate text using hotkeys or mouse clicks. 

* **Fast:** Powered by high-speed, free-tier **Groq Whisper** Speech-to-Text.
* **Context-Aware:** Integrates with **Google Gemini** to refine, format, and adjust the tone of your transcript based on where you are typing (casual for Slack, professional for Gmail).
* **Privacy-First:** Audio clips are processed and immediately deleted from the backend server.

---

## 📽️ Demo

![SpeakType Demo](docs/assets/demo.gif)  
*(Placeholder — add `docs/assets/demo.gif` to enable)*

---

## ✨ Key Features

* **Dual Activation Triggers:** Click the floating mic button or use cross-platform keyboard shortcuts (`Alt+Shift+W` on Windows/Linux, `Ctrl+Shift+W` on macOS).
* **Style Isolation:** Injected microphone button sits within a **Shadow DOM** to prevent website CSS from bleeding in and distorting the UI.
* **Smart AI Formatting:** Optional auto-cleanup formats your transcripts, corrects grammar, and matches target-site context.
* **Safe Undo (Ctrl+Z):** Transcribed text is inserted in a single-step, undo-safe synthetic input block.
* **Modern Stack:** Built as a modern pnpm monorepo using **WXT (Web Extension Framework) + Vue 3** on the frontend, and **Nuxt 4 + Nitro** on the backend.
* **Drizzle ORM & Neon:** Fully type-safe migrations and Postgres interactions.
* **BetterAuth Session Security:** Passwordless bearer JWT & refresh token rotation security (no cookie-sharing dependencies).

---

## 📖 Key Documentation

* 🗺️ **[Public Roadmap](ROADMAP.md)** — Check out our developmental phases, timeline, and current progress.
* 📐 **[System Architecture](docs/ARCHITECTURE.md)** — Deep dive into the API contracts, the audio processing path, database schema, and security layers.
* 🤝 **[Contributing Guide](CONTRIBUTING.md)** — Learn how to set up local environments, run coding checks, and submit code.
* 🤖 **[AI Workflow](docs/AI-WORKFLOW.md)** — How this project uses AI agents (optional). **No subscription needed to contribute** — plain editor + `git` is fully supported.
* 🛡️ **[Security Policy](SECURITY.md)** — Guidelines on reporting vulnerabilities.
* 📜 **[Code of Conduct](CODE_OF_CONDUCT.md)** — Rules for a healthy and welcoming community.

---

## 📁 Project Structure

```
wissper-extanction/
├── apps/
│   ├── backend/        # Nuxt server (API / backend logic)
│   │   └── server/
│   │       └── agents/ # Backend agent code (work in progress)
│   └── extension/      # Browser extension — WXT + Vue 3
├── packages/
│   └── shared/         # Code shared between backend & extension (@speaktype/shared)
├── doc/                # Project documentation
├── docs/               # System architecture & developer docs
├── pnpm-workspace.yaml # Declares the workspaces (apps/*, packages/*)
└── package.json        # Root scripts that drive the whole repo
```

| Workspace               | Package name            | Stack            |
| ----------------------- | ----------------------- | ---------------- |
| `apps/backend`          | `@speaktype/backend`    | Nuxt 4           |
| `apps/extension`        | `@speaktype/extension`  | WXT + Vue 3      |
| `packages/shared`       | `@speaktype/shared`     | TypeScript       |

The apps depend on the shared package via `workspace:*`, so **pnpm is required** (it resolves the workspace links and the `pnpm --filter` scripts).

---

## ⚡ 60-Second Quickstart

### Prerequisites

* [Node.js](https://nodejs.org/) (v20+ recommended)
* [pnpm](https://pnpm.io/) (v9+ recommended)

### Step 1: Install Dependencies
Install all packages from the repo root:
```bash
pnpm install
```

### Step 2: Configure Environment
Copy `.env.example` templates in `apps/backend/` and configure your database, Redis cache, Groq, and Gemini credentials (details in [Architecture](docs/ARCHITECTURE.md)).

### Step 3: Run Development Servers
Each app runs in its own process. Open **two terminal sessions**:

* **Terminal 1: Run Nuxt Backend**
  ```bash
  pnpm dev:backend
  ```
  *Serves at http://localhost:3000 by default.*

* **Terminal 2: Run WXT Chrome Extension**
  ```bash
  pnpm dev:extension
  ```
  *WXT will launch a Chrome window pre-loaded with the SpeakType extension and hot-reload changes.*

---

## 💻 All Root Scripts

| Command                  | What it does                                  |
| ------------------------ | --------------------------------------------- |
| `pnpm dev:backend`       | Run the Nuxt backend in dev mode              |
| `pnpm dev:extension`     | Run the extension in dev mode (WXT)           |
| `pnpm build`             | Build every workspace (`pnpm -r build`)       |
| `pnpm build:backend`     | Build only the backend                        |
| `pnpm build:extension`   | Build only the extension                      |
| `pnpm typecheck`         | Typecheck every workspace                     |
| `pnpm lint`              | Lint every workspace                          |

### Extension-only scripts

Run from `apps/extension` (or with `pnpm --filter @speaktype/extension <script>`):

| Command            | What it does                          |
| ------------------ | ------------------------------------- |
| `build:firefox`    | Build the extension for Firefox       |
| `zip`              | Package the extension as a `.zip`     |

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
