import type { H3Event } from 'h3';
import type { ZodSchema } from 'zod';
import { readBody, createError } from 'h3';
import { db, subscriptions } from '~/server/db';
import { eq } from 'drizzle-orm';
import type { Plan } from '@speaktype/shared';

/** Return a success response (200). */
export function ok(_event: H3Event, data: unknown) {
  return data;
}

/** Return a structured error response matching errorResponseSchema. */
export function fail(event: H3Event, status: number, error: string, code?: string) {
  setResponseStatus(event, status);
  return {
    error,
    code,
    requestId: crypto.randomUUID(),
  };
}

/** Safely read an HTTP-ish status off an unknown thrown error. */
export function getErrorStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object') {
    const e = err as { statusCode?: unknown; status?: unknown };
    if (typeof e.statusCode === 'number') return e.statusCode;
    if (typeof e.status === 'number') return e.status;
  }
  return undefined;
}

/** Extract auth context set by the auth middleware (Task 3). Throws 401 if absent. */
export function getAuth(event: H3Event): { userId: string; plan: Plan } {
  const ctx = event.context.auth as { userId: string; plan: Plan } | undefined;
  if (!ctx) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  return ctx;
}

/**
 * Shared body validation helper. Reads and validates the request body using a Zod schema.
 * Standardizes parsing across all route handlers without exception overhead.
 */
export async function validateBody<T>(
  event: H3Event,
  schema: ZodSchema<T>,
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await readBody(event);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const errorMsg = firstIssue
        ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
        : 'Invalid input parameters';
      return { success: false, error: errorMsg };
    }
    return { success: true, data: parsed.data };
  } catch {
    return { success: false, error: 'Failed to parse request body' };
  }
}

/**
 * Centrally resolves a user's subscription plan, defaulting to 'free'.
 * Logs database failures cleanly and prevents request blocking.
 */
export async function resolvePlan(userId: string): Promise<Plan> {
  try {
    const rows = await db
      .select({ plan: subscriptions.plan })
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId))
      .limit(1);
    if (rows[0]) {
      return rows[0].plan;
    }
  } catch (err) {
    console.error(
      `[resolvePlan] Database failure looking up subscription for user ${userId}:`,
      err,
    );
  }
  return 'free';
}
