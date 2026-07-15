// Scratch verification of routing/guard/fallback logic (no network).
// Run: node apps/backend/server/agents/_routing.test.mjs
// Mirrors registry.ts so it runs as plain ESM without a TS loader.

const AGENTS = {
  opus: { vision: true, maxContext: 1_000_000 },
  sonnet: { vision: true, maxContext: 1_000_000 },
  haiku: { vision: true, maxContext: 200_000 },
  deepseek: { vision: false, maxContext: 1_000_000 },
  gemini: { vision: true, maxContext: 1_000_000 },
  qwen: { vision: false, maxContext: 8_000 },
};

const KIND_TO_AGENT = {
  architecture: 'opus',
  engineering: 'sonnet',
  analysis: 'deepseek',
  utility: 'haiku',
  'lightweight-code': 'qwen',
  vision: 'gemini',
};

const PATTERNS = [
  ['vision', /\b(image|screenshot|screen-?shot|ocr|visual|ui review|diagram|photo|picture)\b/i],
  ['analysis', /\b(debug|root[- ]?cause|why is|algorithm|optimi[sz]e|performance|profiling|bottleneck|investigat)\w*/i],
  ['architecture', /\b(architect|system design|design the|plan(ning)?|trade-?off|strategy|validate the|decide)\b/i],
  ['lightweight-code', /\b(boilerplate|unit[- ]?tests?|format|formatting|lint|small patch|stub|scaffold)\b/i],
  ['utility', /\b(summari[sz]e|classify|status|monitor|tldr|tl;dr|list the|rename)\b/i],
  ['engineering', /\b(implement|feature|refactor|fix|build|add|document|write the)\b/i],
];

function classify(prompt) {
  for (const [kind, re] of PATTERNS) if (re.test(prompt)) return kind;
  return 'engineering';
}
function guard(task, agent) {
  const spec = AGENTS[agent];
  if (task.hasImages && !spec.vision) return 'gemini';
  if (task.estimatedTokens && task.estimatedTokens > spec.maxContext) return agent === 'qwen' ? 'sonnet' : agent;
  return agent;
}
function route(task) {
  if (task.forceAgent) return guard(task, task.forceAgent);
  const kind = task.kind ?? classify(task.prompt);
  return guard(task, KIND_TO_AGENT[kind]);
}
function fallbackChain(primary, task) {
  const chain = [primary, 'gemini', 'sonnet'].filter((a, i, arr) => arr.indexOf(a) === i);
  return task.hasImages ? chain.filter((a) => AGENTS[a].vision) : chain;
}

let pass = 0, fail = 0;
function eq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  -> ${JSON.stringify(actual)}`);
  if (ok) pass++;
  else fail++;
}

// Routing by inferred kind
eq(route({ prompt: 'Design the system architecture for billing' }), 'opus', 'architecture->opus');
eq(route({ prompt: 'Implement the /v1/cleanup endpoint' }), 'sonnet', 'engineering->sonnet');
eq(route({ prompt: 'Why is transcription so slow? root-cause it' }), 'deepseek', 'analysis->deepseek');
eq(route({ prompt: 'Summarize the changelog' }), 'haiku', 'utility->haiku');
eq(route({ prompt: 'Generate unit tests for usage.ts' }), 'qwen', 'lightweight->qwen');
eq(route({ prompt: 'Review this screenshot of the popup UI' }), 'gemini', 'vision->gemini');

// Guardrails
eq(route({ prompt: 'Analyze this image', kind: 'analysis', hasImages: true }), 'gemini', 'vision-guard: deepseek+image->gemini');
eq(route({ prompt: 'tiny patch', kind: 'lightweight-code', estimatedTokens: 50_000 }), 'sonnet', 'context-guard: big qwen->sonnet');
eq(route({ prompt: 'anything', forceAgent: 'deepseek' }), 'deepseek', 'forceAgent honored');

// Fallback chains
eq(fallbackChain('deepseek', {}), ['deepseek', 'gemini', 'sonnet'], 'fallback deepseek');
eq(fallbackChain('gemini', {}), ['gemini', 'sonnet'], 'fallback gemini dedup');
eq(fallbackChain('sonnet', {}), ['sonnet', 'gemini'], 'fallback sonnet dedup');
// Sonnet is vision-capable, so it stays; only text-only agents (deepseek/qwen) get dropped.
eq(fallbackChain('deepseek', { hasImages: true }), ['gemini', 'sonnet'], 'vision fallback drops text-only deepseek primary');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
