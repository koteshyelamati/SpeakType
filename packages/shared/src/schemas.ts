/**
 * Zod schemas — the runtime contract. Both the extension and the backend import
 * these; never hand-redefine a payload. Mirrors memory/api-contract.md.
 */
import { z } from 'zod';
import {
  PLANS,
  LANGUAGES,
  CLEANUP_MODES,
  PREFERRED_MODELS,
  STT_PROVIDERS,
  MAX_AUDIO_BYTES,
} from './constants';

/* ----------------------------------- Auth ---------------------------------- */

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const registerSchema = loginSchema.extend({
  name: z.string().min(1).max(120).optional(),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

export const authTokensSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number().int().positive(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string().nullable(),
  plan: z.enum(PLANS),
});

/* --------------------------------- Settings -------------------------------- */

export const settingsSchema = z.object({
  language: z.enum(LANGUAGES),
  preferredModel: z.enum(PREFERRED_MODELS),
  autoCleanup: z.boolean(),
  requireConfirmation: z.boolean(),
});

export const updateSettingsSchema = settingsSchema.partial();

/* ---------------------------------- Usage ---------------------------------- */

export const quotaSchema = z.object({
  secondsUsed: z.number().nonnegative(),
  remainingSeconds: z.number().nonnegative(),
  plan: z.enum(PLANS),
});

export const usageEntrySchema = z.object({
  id: z.string().uuid(),
  createdAt: z.string().datetime(),
  durationSeconds: z.number().nonnegative(),
  provider: z.enum(STT_PROVIDERS),
});

export const usageHistorySchema = z.object({
  entries: z.array(usageEntrySchema),
});

/* ---------------------------------- Audio ---------------------------------- */

/** Request validated at the route boundary; the blob itself is validated separately. */
export const audioRequestSchema = z.object({
  language: z.enum(LANGUAGES).optional(),
  durationSeconds: z.number().positive().max(60 * 60),
});

export const audioResponseSchema = z.object({
  transcript: z.string(),
  provider: z.enum(STT_PROVIDERS),
  durationSeconds: z.number().nonnegative(),
  requestId: z.string().uuid(),
});

/* --------------------------------- Cleanup --------------------------------- */

export const cleanupRequestSchema = z.object({
  transcript: z.string().min(1).max(20_000),
  websiteContext: z.string().max(2_000).optional(),
  cleanupMode: z.enum(CLEANUP_MODES),
});

export const cleanupResponseSchema = z.object({
  cleanedText: z.string(),
});

/* --------------------------------- Billing --------------------------------- */

export const billingStatusSchema = z.object({
  enabled: z.boolean(), // false for the whole MVP (Stripe deferred)
  plan: z.enum(PLANS), // the caller's current plan (from resolvePlan)
  message: z.string(), // human-readable "billing is disabled" note
});

export const webhookAckSchema = z.object({
  received: z.boolean(), // always true; Stripe only needs a fast 200
});

/* ------------------------------ Shared helpers ----------------------------- */

export const errorResponseSchema = z.object({
  error: z.string(),
  code: z.string().optional(),
  requestId: z.string().optional(),
});

/** Guard for audio blob size (mime is checked against ALLOWED_AUDIO_MIME at the route). */
export const isAudioWithinLimit = (bytes: number) => bytes > 0 && bytes <= MAX_AUDIO_BYTES;

/* -------------------------------- Inferred TS ------------------------------ */

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type AuthTokens = z.infer<typeof authTokensSchema>;
export type User = z.infer<typeof userSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;
export type Quota = z.infer<typeof quotaSchema>;
export type UsageEntry = z.infer<typeof usageEntrySchema>;
export type UsageHistory = z.infer<typeof usageHistorySchema>;
export type AudioRequest = z.infer<typeof audioRequestSchema>;
export type AudioResponse = z.infer<typeof audioResponseSchema>;
export type CleanupRequest = z.infer<typeof cleanupRequestSchema>;
export type CleanupResponse = z.infer<typeof cleanupResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type BillingStatus = z.infer<typeof billingStatusSchema>;
export type WebhookAck = z.infer<typeof webhookAckSchema>;
