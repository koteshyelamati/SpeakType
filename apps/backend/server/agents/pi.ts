import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import type { AgentSpec } from './types';

// apps/backend/server/agents/pi.ts -> repo root is four levels up.
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');

/** Override the pi executable if it isn't on PATH (e.g. PI_BIN=C:\\nvm4w\\nodejs\\pi). */
const PI_BIN = process.env.PI_BIN ?? 'pi';

export interface PiResult {
  ok: boolean;
  output: string;
  error?: string;
}

export interface PiOptions {
  /** Max run time before the process is killed. Default 120s. */
  timeoutMs?: number;
}

/**
 * Run a one-shot `pi --print` for the given agent and return its text output.
 * Uses pi's existing provider auth — no API keys required here.
 */
export function dispatchPi(spec: AgentSpec, prompt: string, opts: PiOptions = {}): Promise<PiResult> {
  const args = [
    '--print',           // non-interactive: process prompt and exit
    '--mode', 'json',
    '--no-session',      // ephemeral, don't persist
    '--no-approve',      // never block on a project-trust prompt
    '--no-context-files', // ignore AGENTS.md/CLAUDE.md; the role file is the system prompt
    '--provider', spec.provider,
    '--model', spec.model,
  ];

  const roleFile = resolve(REPO_ROOT, spec.roleFile);
  if (existsSync(roleFile)) {
    args.push('--append-system-prompt', roleFile);
  }
  args.push(prompt);

  return new Promise((res) => {
    // shell:true so Windows resolves the `pi` shim (pi.cmd/pi.ps1) via PATHEXT.
    const child = spawn(PI_BIN, args, {
      cwd: REPO_ROOT,
      shell: true,
      windowsHide: true,
    });

    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill();
      res({ ok: false, output: '', error: `timeout after ${opts.timeoutMs ?? 120_000}ms` });
    }, opts.timeoutMs ?? 120_000);

    child.stdout.on('data', (d) => (stdout += d.toString()));
    child.stderr.on('data', (d) => (stderr += d.toString()));

    child.on('error', (err) => {
      clearTimeout(timeout);
      res({ ok: false, output: '', error: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timeout);
      if (code !== 0) {
        res({ ok: false, output: extractText(stdout), error: stderr.trim() || `pi exited ${code}` });
        return;
      }
      res({ ok: true, output: extractText(stdout) });
    });
  });
}

/** pi --mode json emits structured output; fall back to raw text if shape is unknown. */
function extractText(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const parsed = JSON.parse(trimmed);
    return (
      parsed.text ??
      parsed.output ??
      parsed.result ??
      parsed.content ??
      (Array.isArray(parsed.messages) ? lastMessageText(parsed.messages) : null) ??
      trimmed
    );
  } catch {
    return trimmed; // not JSON (or streamed) — return as-is
  }
}

function lastMessageText(messages: Array<{ role?: string; content?: unknown }>): string | null {
  const last = messages[messages.length - 1];
  if (!last) return null;
  if (typeof last.content === 'string') return last.content;
  if (Array.isArray(last.content)) {
    return last.content
      .map((p: string | { text?: string }) => (typeof p === 'string' ? p : p?.text ?? ''))
      .join('');
  }
  return null;
}
