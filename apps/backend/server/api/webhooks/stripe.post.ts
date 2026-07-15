import { defineEventHandler, readRawBody } from 'h3';
import { billingService } from '~/server/services/billing';
import type { WebhookAck } from '@speaktype/shared';

export default defineEventHandler(async (event): Promise<WebhookAck> => {
  // Live Stripe is deferred: no signature verification, no event application.
  // We read+discard the body so the request drains cleanly, then ack.
  const rawBody = await readRawBody(event);
  await billingService.handleWebhook(rawBody);
  return { received: true };
});
