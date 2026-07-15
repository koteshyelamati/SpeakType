import { resolvePlan } from '~/server/utils/respond';
import type { BillingStatus } from '@speaktype/shared';

/**
 * The billing seam. The MVP ships the free no-op implementation; a future "monetize" phase
 * adds a StripeBillingService behind this SAME interface — no route changes needed.
 */
export interface BillingService {
  /** Whether live billing is wired. Always false in the MVP (Stripe deferred). */
  isEnabled(): boolean;
  /** Status for GET /billing/portal and POST /billing/checkout while disabled. */
  getStatus(userId: string): Promise<BillingStatus>;
  /**
   * Handle an inbound provider webhook body. No-op in the MVP: returns false (nothing applied).
   * A future StripeBillingService verifies + applies the event here.
   */
  handleWebhook(rawBody: unknown): Promise<boolean>;
}

const BILLING_DISABLED_MESSAGE =
  'Billing is not enabled. SpeakType is free during the MVP; the free plan is active.';

export const freeBillingService: BillingService = {
  isEnabled() {
    return false;
  },

  async getStatus(userId: string): Promise<BillingStatus> {
    const plan = await resolvePlan(userId);
    return {
      enabled: false,
      plan,
      message: BILLING_DISABLED_MESSAGE,
    };
  },

  async handleWebhook(_rawBody: unknown): Promise<boolean> {
    // No-op: live Stripe is deferred. We acknowledge but apply nothing.
    return false;
  },
};

/** The active billing service for the app. Swap this binding when Stripe is wired. */
export const billingService: BillingService = freeBillingService;
