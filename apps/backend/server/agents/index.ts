import type { AttemptLog, DispatchResult, Task } from './types';
import { AGENTS } from './registry';
import { route, fallbackChain } from './router';
import { dispatchPi, type PiOptions } from './pi';

export * from './types';
export { AGENTS, getAgent } from './registry';
export { route, classify, fallbackChain } from './router';

/**
 * Route a task to the right agent and execute it, walking the fallback chain
 * (-> Gemini -> Sonnet) if an agent fails. Every agent runs through `pi`, which
 * already holds provider auth.
 *
 * Inside Claude Code, prefer the `Agent` tool for the Claude agents (sonnet/haiku)
 * and reserve this for headless use and the non-Claude agents.
 */
export async function dispatch(task: Task, opts: PiOptions = {}): Promise<DispatchResult> {
  const primary = route(task);
  const chain = fallbackChain(primary, task);
  const attempts: AttemptLog[] = [];

  for (const name of chain) {
    const spec = AGENTS[name];
    const start = Date.now();
    const result = await dispatchPi(spec, task.prompt, opts);
    const attempt: AttemptLog = {
      agent: name,
      model: spec.model,
      ok: result.ok,
      ms: Date.now() - start,
      error: result.error,
    };
    attempts.push(attempt);

    if (result.ok) {
      return {
        agent: name,
        model: spec.model,
        ok: true,
        output: result.output,
        viaFallback: name !== primary,
        attempts,
      };
    }
  }

  const last = attempts.at(-1);
  if (!last) {
    // `chain` is always non-empty, so this is purely defensive (satisfies strict null checks).
    throw new Error('dispatch: fallback chain produced no attempts');
  }
  return {
    agent: last.agent,
    model: last.model,
    ok: false,
    output: '',
    error: `all agents failed: ${attempts.map((a) => `${a.agent}(${a.error ?? 'unknown'})`).join(', ')}`,
    viaFallback: last.agent !== primary,
    attempts,
  };
}
