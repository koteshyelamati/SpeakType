import { defineEventHandler } from 'h3';
import { getAuth } from '~/server/utils/respond';
import { QuotaService } from '~/server/services/quota';
import { quotaSchema } from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  const { userId, plan } = getAuth(event);

  const quota = await QuotaService.getQuota(userId, plan);
  return quotaSchema.parse(quota);
});
