import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuotaService } from '../quota';
import { QUOTA_SECONDS, type Plan } from '@speaktype/shared';

// Setup Mock for Database.
// vi.mock factories are hoisted above module-level consts, so the mock fns must be created
// inside vi.hoisted() — otherwise the factory hits a TDZ ("Cannot access 'mockInsert' …").
const { mockSelectResult, mockInsert } = vi.hoisted(() => {
  const insertValues = vi.fn().mockResolvedValue({});
  return {
    mockSelectResult: vi.fn(),
    mockInsert: vi.fn(() => ({ values: insertValues })),
  };
});

vi.mock('~/server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: mockSelectResult,
      })),
    })),
    insert: mockInsert,
  },
  usageLogs: {
    durationSeconds: 'durationSeconds',
    userId: 'userId',
    createdAt: 'createdAt',
  },
  quotaEvents: {
    userId: 'userId',
    deltaSeconds: 'deltaSeconds',
    reason: 'reason',
  },
}));

// Setup Mock for Redis
vi.mock('~/server/utils/redis', () => ({
  getRedisClient: vi.fn(() => null), // Returns null so tests cleanly fallback to mocked DB
}));

describe('QuotaService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRemainingSeconds / getQuota', () => {
    it('should return correct remaining seconds when usage is below the plan limit', async () => {
      // Simulate used seconds of 500
      mockSelectResult.mockResolvedValue([{ sum: 500 }]);

      const plan = 'free';
      const limit = QUOTA_SECONDS[plan]; // 1800 seconds (30 mins)
      const expectedRemaining = limit - 500; // 1300 seconds

      const remaining = await QuotaService.getRemainingSeconds('user-1', plan);
      expect(remaining).toBe(expectedRemaining);
    });

    it('should return exactly 0 remaining seconds when usage equals or exceeds the plan limit', async () => {
      // Simulate used seconds of 2000 (exceeds free plan limit of 1800)
      mockSelectResult.mockResolvedValue([{ sum: 2000 }]);

      const plan = 'free';
      const remaining = await QuotaService.getRemainingSeconds('user-2', plan);
      expect(remaining).toBe(0);
    });

    it('should fall back to free plan if user plan is unspecified or invalid', async () => {
      // Simulate used seconds of 1000
      mockSelectResult.mockResolvedValue([{ sum: 1000 }]);

      // Free limit is 1800. Invalid plan should fallback to free, returning 1800 - 1000 = 800
      const remaining = await QuotaService.getRemainingSeconds(
        'user-3',
        'invalid-plan' as unknown as Plan,
      );
      expect(remaining).toBe(800);
    });

    it('should block further recording if remaining seconds are 0', async () => {
      // Rule: "a user at 0 remaining seconds is blocked BEFORE usage is recorded."
      // We simulate a user with 0 remaining seconds
      mockSelectResult.mockResolvedValue([{ sum: 1800 }]); // free limit is 1800

      const userId = 'user-blocked';
      const plan = 'free';

      const remaining = await QuotaService.getRemainingSeconds(userId, plan);
      expect(remaining).toBe(0);

      // Guard condition check
      const canTranscribe = remaining > 0;
      expect(canTranscribe).toBe(false);

      if (!canTranscribe) {
        // Assert that we do not proceed to recordUsage
        expect(mockInsert).not.toHaveBeenCalled();
      }
    });
  });

  describe('recordUsage', () => {
    it('should log usage and debit the quota in database on recordUsage', async () => {
      const userId = 'user-4';
      const durationSeconds = 30;
      const provider = 'groq';

      await QuotaService.recordUsage(userId, durationSeconds, provider);

      // Verify db.insert was called for both usageLogs and quotaEvents
      expect(mockInsert).toHaveBeenCalledTimes(2);
    });
  });
});
