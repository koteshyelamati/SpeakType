/**
 * Auth store — manages the signed-in/signed-out state for the popup.
 *
 * Contract:
 *  - init()     : restore session from chrome.storage.local (called on popup mount)
 *  - signIn()   : POST /auth/login -> persist tokens -> status 'signed-in'
 *  - signUp()   : POST /auth/register -> persist tokens -> status 'signed-in'
 *  - signOut()  : POST /auth/logout -> clear storage -> status 'signed-out'
 *
 * Token persistence is delegated to auth-storage helpers (DO NOT touch storage keys here).
 * The API client is seeded by setTokens() / clearTokens() automatically.
 */
import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { User } from '@speaktype/shared';
import { api } from '@/services/api';
import {
  seedApiToken,
  getCachedUser,
  setTokens,
  clearTokens,
} from '@/services/auth-storage';

export type AuthStatus = 'signed-out' | 'authenticating' | 'signed-in' | 'error';

export const useAuthStore = defineStore('auth', () => {
  // --------------------------------- State -----------------------------------

  const user = ref<User | null>(null);
  const status = ref<AuthStatus>('signed-out');
  const errorMessage = ref<string | null>(null);

  // -------------------------------- Helpers ----------------------------------

  function setError(msg: string) {
    status.value = 'error';
    errorMessage.value = msg;
  }

  function clearError() {
    errorMessage.value = null;
  }

  /**
   * Map a thrown error to a user-facing message. A `fetch` that can't reach the
   * server throws a TypeError ("Failed to fetch") — surface that as a clear
   * "service unreachable" rather than the raw browser text. (The backend is not
   * live until Phase 3, so this is the expected path in local dev for now.)
   */
  function friendlyAuthError(err: unknown, fallback: string): string {
    if (err instanceof TypeError) {
      return "Can't reach the SpeakType service. It may be offline — please try again later.";
    }
    return err instanceof Error ? err.message : fallback;
  }

  // -------------------------------- Actions ----------------------------------

  /**
   * Restore session on popup open. If a token is already in storage we
   * consider the user signed-in without a network call (the content script
   * will catch auth errors on the first real API call and clear tokens then).
   */
  async function init(): Promise<void> {
    const token = await seedApiToken();
    const cached = await getCachedUser();

    if (token && cached) {
      user.value = cached;
      status.value = 'signed-in';
    } else if (token && !cached) {
      // Token exists but no cached user — try to fetch (gracefully degrade)
      status.value = 'authenticating';
      try {
        const me = await api.getMe();
        user.value = me;
        await setTokens(
          // We don't have fresh tokens here; just keep existing token in sync
          // by passing a placeholder that setTokens will not touch.
          // Use the already-loaded token to satisfy the AuthTokens shape.
          { accessToken: token, refreshToken: '', expiresIn: 3600 },
          me,
        );
        status.value = 'signed-in';
      } catch {
        // Backend not yet live (Phase 3) — stay signed-out gracefully
        await clearTokens();
        user.value = null;
        status.value = 'signed-out';
      }
    } else {
      status.value = 'signed-out';
    }
  }

  async function signIn(email: string, password: string): Promise<void> {
    clearError();
    status.value = 'authenticating';
    try {
      const tokens = await api.login({ email, password });
      // Persist tokens — this also seeds the API client
      await setTokens(tokens);
      // Try to fetch the user profile; surface error as warning only
      let me: User | null = null;
      try {
        me = await api.getMe();
      } catch {
        // Non-fatal: popup shows email from the form if /me is unavailable
      }
      if (me) {
        await setTokens(tokens, me);
        user.value = me;
      } else {
        // Synthesise a minimal user object so the signed-in view can render
        user.value = null;
      }
      status.value = 'signed-in';
    } catch (err) {
      setError(friendlyAuthError(err, 'Sign-in failed. Please try again.'));
    }
  }

  async function signUp(email: string, password: string, name?: string): Promise<void> {
    clearError();
    status.value = 'authenticating';
    try {
      const tokens = await api.register({ email, password, name });
      await setTokens(tokens);
      let me: User | null = null;
      try {
        me = await api.getMe();
      } catch {
        // Non-fatal
      }
      if (me) {
        await setTokens(tokens, me);
        user.value = me;
      } else {
        user.value = null;
      }
      status.value = 'signed-in';
    } catch (err) {
      setError(friendlyAuthError(err, 'Registration failed. Please try again.'));
    }
  }

  async function signOut(): Promise<void> {
    clearError();
    // Best-effort logout (fire and forget — backend may be unavailable)
    try {
      await api.logout();
    } catch {
      // Ignore network errors on logout; local state is authoritative
    }
    await clearTokens();
    user.value = null;
    status.value = 'signed-out';
  }

  // -------------------------------- Expose ----------------------------------

  return {
    user,
    status,
    errorMessage,
    init,
    signIn,
    signUp,
    signOut,
  };
});
