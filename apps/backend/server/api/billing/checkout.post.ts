import { defineEventHandler } from 'h3';
import { getAuth, ok } from '~/server/utils/respond';
import { billingService } from '~/server/services/billing';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);
  const status = await billingService.getStatus(userId);
  return ok(event, status); // { enabled: false, plan, message }
});
