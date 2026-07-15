import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useQuota, invalidateQuotaCache } from '@/composables/useQuota';
import { getQuotaViaBackground } from '@/services/content-api';
import type { Quota } from '@speaktype/shared';

// Mock the API client
vi.mock('@/services/content-api', () => {
  return {
    getQuotaViaBackground: vi.fn(),
  };
});

describe('useQuota', () => {
  const mockQuotaAllowed: Quota = {
    secondsUsed: 100,
    remainingSeconds: 1100,
    plan: 'free',
  };

  const mockQuotaBlocked: Quota = {
    secondsUsed: 1200,
    remainingSeconds: 0,
    plan: 'free',
  };

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    invalidateQuotaCache(); // Clear any cached state before each test
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initially return null for canRecord', () => {
    const { canRecord } = useQuota();
    expect(canRecord).toBeNull();
  });

  it('should fetch quota on first checkQuota call, cache it, and update canRecord', async () => {
    vi.mocked(getQuotaViaBackground).mockResolvedValue(mockQuotaAllowed);

    const { canRecord, checkQuota } = useQuota();
    expect(canRecord).toBeNull();

    const result = await checkQuota();

    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      allowed: true,
      quota: mockQuotaAllowed,
    });
    expect(useQuota().canRecord).toBe(true);
  });

  it('should return cached quota without calling API within TTL (60s)', async () => {
    vi.mocked(getQuotaViaBackground).mockResolvedValue(mockQuotaAllowed);

    const { checkQuota } = useQuota();

    // First call
    await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1);

    // Advance time by 30 seconds (within TTL)
    vi.advanceTimersByTime(30_000);

    // Second call
    const result = await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1); // Still 1
    expect(result.allowed).toBe(true);
  });

  it('should refetch quota after TTL (60s) has expired', async () => {
    vi.mocked(getQuotaViaBackground).mockResolvedValue(mockQuotaAllowed);

    const { checkQuota } = useQuota();

    // First call
    await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1);

    // Advance time by 61 seconds (exceeds TTL)
    vi.advanceTimersByTime(61_000);

    // Second call
    await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(2); // Fetched again
  });

  it('should force refetch if invalidateQuotaCache is called', async () => {
    vi.mocked(getQuotaViaBackground).mockResolvedValue(mockQuotaAllowed);

    const { checkQuota } = useQuota();

    // First call
    await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1);

    // Invalidate the cache
    invalidateQuotaCache();

    // Second call (even immediately)
    await checkQuota();
    expect(getQuotaViaBackground).toHaveBeenCalledTimes(2); // Fetched again
  });

  it('should return allowed=false and canRecord=false if remainingSeconds is 0', async () => {
    vi.mocked(getQuotaViaBackground).mockResolvedValue(mockQuotaBlocked);

    const { canRecord, checkQuota } = useQuota();
    expect(canRecord).toBeNull();

    const result = await checkQuota();

    expect(getQuotaViaBackground).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      allowed: false,
      quota: mockQuotaBlocked,
    });
    expect(useQuota().canRecord).toBe(false);
  });
});
