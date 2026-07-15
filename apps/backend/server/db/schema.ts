import { pgTable, uuid, text, boolean, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core';
import {
  PLANS,
  STT_PROVIDERS,
  CLEANUP_MODES,
  LANGUAGES,
  PREFERRED_MODELS,
} from '@speaktype/shared';

// 1. pgEnums
export const planEnum = pgEnum('plan', PLANS);
export const sttProviderEnum = pgEnum('stt_provider', STT_PROVIDERS);
export const cleanupModeEnum = pgEnum('cleanup_mode', CLEANUP_MODES);
export const languageEnum = pgEnum('language', LANGUAGES);
export const preferredModelEnum = pgEnum('preferred_model', PREFERRED_MODELS);

// 2. Tables

export const settings = pgTable('settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(),
  language: languageEnum('language').default('auto').notNull(),
  preferredModel: preferredModelEnum('preferred_model').default('gemini-flash').notNull(),
  autoCleanup: boolean('auto_cleanup').default(true).notNull(),
  requireConfirmation: boolean('require_confirmation').default(true).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  provider: sttProviderEnum('provider').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  tokenHash: text('token_hash').notNull(),
  revoked: boolean('revoked').default(false).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull().unique(), // one subscription per user (enables future upsert-by-user)
  plan: planEnum('plan').default('free').notNull(),
  status: text('status').default('active').notNull(),
  stripeCustomerId: text('stripe_customer_id').unique(), // NEW · nullable
  stripeSubscriptionId: text('stripe_subscription_id').unique(), // NEW · nullable
  priceId: text('price_id'), // NEW · nullable
  currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }), // NEW · nullable
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(), // NEW
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id'),
  action: text('action').notNull(),
  detail: text('detail'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const providerFailures = pgTable('provider_failures', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: sttProviderEnum('provider').notNull(),
  error: text('error'),
  requestId: text('request_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const quotaEvents = pgTable('quota_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(),
  deltaSeconds: integer('delta_seconds').notNull(),
  reason: text('reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const webhookEvents = pgTable('webhook_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  stripeEventId: text('stripe_event_id').notNull().unique(),
  payload: text('payload'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Inferred types
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;

export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;

export type RefreshToken = typeof refreshTokens.$inferSelect;
export type NewRefreshToken = typeof refreshTokens.$inferInsert;

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;

export type ProviderFailure = typeof providerFailures.$inferSelect;
export type NewProviderFailure = typeof providerFailures.$inferInsert;

export type QuotaEvent = typeof quotaEvents.$inferSelect;
export type NewQuotaEvent = typeof quotaEvents.$inferInsert;

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
