import { describe, it, expect, vi, beforeEach } from 'vitest';

// In-memory store for the mocked WXT storage. Declared via vi.hoisted so they
// exist when the hoisted vi.mock factory runs — ES `import` statements are
// hoisted above plain `const` declarations, so a normal const would still be
// in its temporal dead zone when auth-storage.ts is imported and calls
// storage.defineItem().
const { mockStore, mockWatchers } = vi.hoisted(() => ({
  mockStore: new Map<string, unknown>(),
  mockWatchers: new Map<string, Set<(val: unknown) => void>>(),
}));

// Mock must be declared before importing auth-storage
vi.mock('wxt/utils/storage', () => {
  return {
    storage: {
      defineItem: vi.fn((key: string, options?: { fallback?: unknown }) => {
        const fallback = options?.fallback ?? null;
        if (!mockStore.has(key)) {
          mockStore.set(key, fallback);
        }

        return {
          // Real WXT storage returns the fallback (null here) when unset; mirror
          // that so a cleared store reads back as null rather than undefined.
          getValue: vi.fn(async () => {
            return mockStore.get(key) ?? null;
          }),
          setValue: vi.fn(async (val: unknown) => {
            mockStore.set(key, val);
            const keyWatchers = mockWatchers.get(key);
            if (keyWatchers) {
              keyWatchers.forEach((cb) => cb(val));
            }
          }),
          removeValue: vi.fn(async () => {
            mockStore.set(key, null);
            const keyWatchers = mockWatchers.get(key);
            if (keyWatchers) {
              keyWatchers.forEach((cb) => cb(null));
            }
          }),
          watch: vi.fn((cb: (val: unknown) => void) => {
            if (!mockWatchers.has(key)) {
              mockWatchers.set(key, new Set());
            }
            mockWatchers.get(key)!.add(cb);
            return () => {
              mockWatchers.get(key)?.delete(cb);
            };
          }),
        };
      }),
    },
  };
});

// Import storage helpers after WXT storage is mocked
import {
  getAccessToken,
  getCachedUser,
  setTokens,
  getRefreshToken,
  clearTokens,
  seedApiToken,
  watchAccessToken,
} from '@/services/auth-storage';
import { api } from '@/services/api';
import type { AuthTokens, User } from '@speaktype/shared';

describe('auth-storage', () => {
  const mockTokens: AuthTokens = {
    accessToken: 'test_access_token',
    refreshToken: 'test_refresh_token',
    expiresIn: 3600,
  };

  const mockUser: User = {
    id: 'b2d87e22-6b95-46aa-bf7d-947b4d137df3',
    email: 'test@speaktype.local',
    name: 'Alice',
    plan: 'pro',
  };

  beforeEach(() => {
    mockStore.clear();
    mockWatchers.clear();
    vi.spyOn(api, 'setToken').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  describe('setTokens', () => {
    it('should save accessToken, refreshToken, optional user, and set api token', async () => {
      await setTokens(mockTokens, mockUser);

      expect(mockStore.get('local:st_accessToken')).toBe(mockTokens.accessToken);
      expect(mockStore.get('local:st_refreshToken')).toBe(mockTokens.refreshToken);
      expect(mockStore.get('local:st_user')).toEqual(mockUser);

      expect(api.setToken).toHaveBeenCalledWith(mockTokens.accessToken);
    });

    it('should not overwrite user in storage if user is not provided (is undefined)', async () => {
      // Setup pre-existing user
      mockStore.set('local:st_user', mockUser);

      // Save tokens without passing a user
      await setTokens(mockTokens);

      expect(mockStore.get('local:st_accessToken')).toBe(mockTokens.accessToken);
      expect(mockStore.get('local:st_refreshToken')).toBe(mockTokens.refreshToken);
      expect(mockStore.get('local:st_user')).toEqual(mockUser); // preserved!
    });

    it('should overwrite user in storage if user is null', async () => {
      mockStore.set('local:st_user', mockUser);

      await setTokens(mockTokens, null);

      expect(mockStore.get('local:st_user')).toBeNull();
    });
  });

  describe('get helpers', () => {
    it('should return correct default/fallback values when empty', async () => {
      const token = await getAccessToken();
      const user = await getCachedUser();
      const refresh = await getRefreshToken();

      expect(token).toBeNull();
      expect(user).toBeNull();
      expect(refresh).toBeNull();
    });

    it('should return stored token and user values', async () => {
      mockStore.set('local:st_accessToken', 'acc_token');
      mockStore.set('local:st_refreshToken', 'ref_token');
      mockStore.set('local:st_user', mockUser);

      expect(await getAccessToken()).toBe('acc_token');
      expect(await getRefreshToken()).toBe('ref_token');
      expect(await getCachedUser()).toEqual(mockUser);
    });
  });

  describe('clearTokens', () => {
    it('should clear all tokens, cached user, and reset api token', async () => {
      mockStore.set('local:st_accessToken', 'acc_token');
      mockStore.set('local:st_refreshToken', 'ref_token');
      mockStore.set('local:st_user', mockUser);

      await clearTokens();

      expect(mockStore.get('local:st_accessToken')).toBeNull();
      expect(mockStore.get('local:st_refreshToken')).toBeNull();
      expect(mockStore.get('local:st_user')).toBeNull();
      expect(api.setToken).toHaveBeenCalledWith(null);
    });
  });

  describe('seedApiToken', () => {
    it('should read the stored access token and seed api client with it', async () => {
      mockStore.set('local:st_accessToken', 'seeded_token');

      const seeded = await seedApiToken();

      expect(seeded).toBe('seeded_token');
      expect(api.setToken).toHaveBeenCalledWith('seeded_token');
    });

    it('should seed api client with null if no token exists', async () => {
      const seeded = await seedApiToken();

      expect(seeded).toBeNull();
      expect(api.setToken).toHaveBeenCalledWith(null);
    });
  });

  describe('watchAccessToken', () => {
    it('should subscribe to and receive access token changes', async () => {
      const cb = vi.fn();
      const unwatch = watchAccessToken(cb);

      // Trigger change through setTokens
      await setTokens(mockTokens);

      expect(cb).toHaveBeenCalledWith(mockTokens.accessToken);

      // Trigger change through clearTokens
      await clearTokens();

      expect(cb).toHaveBeenCalledWith(null);

      // Unsubscribe and trigger again - should not call callback
      cb.mockClear();
      unwatch();

      await setTokens(mockTokens);
      expect(cb).not.toHaveBeenCalled();
    });
  });
});
