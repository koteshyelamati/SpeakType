# Contributing to SpeakType

Thank you for your interest in contributing to **SpeakType**! We are excited to build a powerful speech-to-text and dictation experience together.

This document outlines the guidelines, workflows, and standards for contributing to the project. Following these rules helps ensure a smooth, high-quality collaboration process.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

---

## Do I Need an AI Subscription? No.

SpeakType is developed with help from AI coding agents, but **you do not need any paid AI
subscription, special model, or tooling to contribute.** The project is guaranteed to be
fully buildable, testable, and contributable with nothing more than a plain editor and
`git`. Use whatever assistant you like — a free chat tool, Copilot, a local model, or
none at all. PRs are judged on the code, not the tools that produced it.

If you're curious how the maintainer's agent workflow is organized (and the optional
"tiers" of tooling you can use), see **[AI Workflow](docs/AI-WORKFLOW.md)**.

---

## How Can I Contribute?

### 1. Reporting Bugs
* Check the existing issues to see if the bug has already been reported.
* If not, open a new issue using our **Bug Report** template.
* Provide a clear summary, detailed steps to reproduce, expected vs. actual behavior, and environment details (OS, Chrome version, extension version).

### 2. Suggesting Enhancements
* Check the existing issues and the public roadmap to see if your idea is already planned.
* If not, open a new issue using our **Feature Request** template.
* Explain the use case, why this enhancement would be valuable, and how it should work.

### 3. Submitting Pull Requests (PRs)
* Fork the repository and create your branch from `main`.
* Keep your changes focused. Small, targeted PRs are reviewed and merged much faster.
* Ensure all code quality checks (linting, typechecking, and builds) pass before submitting.
* Reference any related issues in your PR description.

---

## Local Development Setup

SpeakType is structured as a **pnpm monorepo**. You will need:
* **Node.js** (v20+ recommended)
* **pnpm** (v9+ recommended)

### Step 1: Clone the Repo
```bash
git clone https://github.com/asadeisa/SpeakType.git
cd SpeakType
```

### Step 2: Install Dependencies
```bash
pnpm install
```

### Step 3: Run in Development Mode
To run development servers for different components:

* **Chrome Extension:**
  ```bash
  pnpm dev:extension
  ```
* **Backend Server:**
  ```bash
  pnpm dev:backend
  ```

### Step 4: Build the Project
* **Build Everything:**
  ```bash
  pnpm build
  ```
* **Build Extension Only:**
  ```bash
  pnpm build:extension
  ```
* **Build Backend Only:**
  ```bash
  pnpm build:backend
  ```

---

## Coding Standards & Guidelines

To maintain code quality and architectural integrity, please adhere to these rules:

### 1. UTF-8 & Arabic Encoding (CRITICAL)
* Always preserve **UTF-8 encoding** for all files.
* SpeakType supports Arabic dictation and translation. **Never convert Arabic text** into escaped characters, ANSI, Windows-1252, or mojibake.
* Ensure your editor is configured to save in UTF-8 without changing line endings or converting existing BOMs.

### 2. Database Schema Changes (Drizzle ORM)
* If your changes affect the database schema, **ALWAYS** generate and run the migrations:
  ```bash
  pnpm --filter @speaktype/backend drizzle-kit generate
  pnpm --filter @speaktype/backend drizzle-kit migrate
  ```
* **NEVER run `drizzle-kit push`!** All schema modifications must go through versioned migrations.
* For all new ID columns (unless explicitly required by BetterAuth), use **UUIDs** and ensure they are randomly generated on insertion.

### 3. Security & Performance
* **Never bypass `ProtectedRoute`** or security middleware.
* Preserve Role-Based Access Control (RBAC) behavior.
* Validate all user uploads (such as audio files) before storage operations.
* **Never expose secrets**, API keys, or private service credentials. Keep configuration in `.env` files and templates in `.env.example`.
* Avoid unnecessary re-renders, duplicate database queries, and memory leaks.

### 4. Code Quality Verification
Before pushing your branch, run the following commands locally to verify everything is in order:
```bash
# Run linting
pnpm lint

# Run typechecking
pnpm typecheck

# Run full production build
pnpm build
```

---

## Branching & Commit Guidelines

### Branch Naming
Create descriptively named branches from `main`:
* Features: `feat/your-feature-name`
* Bug Fixes: `fix/bug-description`
* Documentation: `docs/what-changed`
* Refactoring: `refactor/clean-up-xyz`

### Commit Messages
We encourage clean, structured commit messages following the Conventional Commits specification:
```
<type>(<scope>): <short summary>

[optional body describing the change in detail]

[optional footer referencing issue numbers, e.g., Closes #123]
```
* **Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.
* **Example:** `feat(extension): add voice-activated shortcut triggers`

---

Thank you for helping us make SpeakType the best open-source dictation tool!
