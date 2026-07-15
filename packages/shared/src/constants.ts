/**
 * Shared constants — single source of truth for both apps.
 * Values grounded in memory/cost-and-free-tiers.md and memory/security-and-performance.md.
 */

/** Subscription plans. Billing is deferred (Stripe), but the plan shape is fixed now. */
export const PLANS = ['free', 'pro'] as const;
export type Plan = (typeof PLANS)[number];

/**
 * Per-plan monthly transcription quota, in seconds.
 * Placeholder numbers — tunable in the billing phase; not a locked decision.
 */
export const QUOTA_SECONDS: Record<Plan, number> = {
  free: 30 * 60, // 30 min / month
  pro: 10 * 60 * 60, // 10 h / month
};

/** Per-plan API rate limit (requests / hour). From security-and-performance.md. */
export const RATE_LIMIT_PER_HOUR: Record<Plan, number> = {
  free: 100,
  pro: 1000,
};

/** Audio upload limits. Groq Whisper caps files at 25 MB. */
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25 MB
export const ALLOWED_AUDIO_MIME = [
  'audio/webm',
  'audio/ogg',
  'audio/wav',
  'audio/mp4',
  'audio/mpeg',
] as const;
export type AudioMime = (typeof ALLOWED_AUDIO_MIME)[number];

/** STT providers, in failover order (Groq primary). */
export const STT_PROVIDERS = ['groq', 'secondary'] as const;
export type SttProvider = (typeof STT_PROVIDERS)[number];

/** Supported dictation languages (MVP). 'auto' lets the provider detect. */
export const LANGUAGES = ['auto', 'en', 'ar'] as const;
export type Language = (typeof LANGUAGES)[number];

/** AI cleanup modes (Gemini). */
export const CLEANUP_MODES = ['off', 'light', 'formal'] as const;
export type CleanupMode = (typeof CLEANUP_MODES)[number];

/** Preferred cleanup model selector (provider-agnostic label). */
export const PREFERRED_MODELS = ['gemini-flash'] as const;
export type PreferredModel = (typeof PREFERRED_MODELS)[number];

/**
 * Default backend API base URL — used when no env override is provided.
 * The extension overrides this at build time via `WXT_API_URL` (see api.ts).
 */
export const DEFAULT_API_BASE_URL = 'http://localhost:3000/api';
