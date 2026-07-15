/**
 * useQuota — cached quota helper for the SpeakType extension.
 * Avoids a network hit before every recording by caching the result with a TTL.
 */
import { getQuotaViaBackground } from '@/services/content-api';
import type { Quota } from '@speaktype/shared';

const CACHE_TTL_MS = 60_000; // 60 seconds

interface CacheEntry {
  quota: Quota;
  fetchedAt: number;
}

// Module-level cache — shared across all composable instances in the same context
let _cache: CacheEntry | null = null;

function _isFresh(): boolean {
  if (!_cache) return false;
  return Date.now() - _cache.fetchedAt < CACHE_TTL_MS;
}

/** Invalidate the cache (call after a recording so quota is refreshed next time). */
export function invalidateQuotaCache(): void {
  _cache = null;
}

export interface CheckQuotaResult {
  allowed: boolean;
  quota: Quota;
}

export interface UseQuotaReturn {
  /** True when we have a cached result and remaining seconds > 0. Returns null when unknown. */
  canRecord: boolean | null;
  /** Fetch (or return cached) quota and return whether recording is allowed. */
  checkQuota(): Promise<CheckQuotaResult>;
}

export function useQuota(): UseQuotaReturn {
  function canRecordNow(): boolean | null {
    if (!_cache) return null;
    return _cache.quota.remainingSeconds > 0;
  }

  async function checkQuota(): Promise<CheckQuotaResult> {
    if (!_isFresh()) {
      const quota = await getQuotaViaBackground();
      _cache = { quota, fetchedAt: Date.now() };
    }

    const quota = _cache!.quota;
    return {
      allowed: quota.remainingSeconds > 0,
      quota,
    };
  }

  return {
    get canRecord() {
      return canRecordNow();
    },
    checkQuota,
  };
}
