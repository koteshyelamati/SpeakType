/**
 * Auth token storage — the shared seam between the popup (writes tokens after
 * sign-in) and the content script / background (read the access token to call
 * the backend). Tokens live in extension storage (`chrome.storage.local` via
 * `wxt/storage`), never in page-accessible storage.
 *
 * This module is the single source of truth for token persistence. Other code
 * must go through these helpers — do not touch the storage keys directly.
 */
import { storage } from 'wxt/utils/storage';
import type { AuthTokens, User } from '@speaktype/shared';
import { api } from './api';

/** Typed storage items. `local:` = chrome.storage.local (survives restarts). */
const accessTokenItem = storage.defineItem<string | null>('local:st_accessToken', {
  fallback: null,
});
const refreshTokenItem = storage.defineItem<string | null>('local:st_refreshToken', {
  fallback: null,
});
const userItem = storage.defineItem<User | null>('local:st_user', {
  fallback: null,
});

/** Read the current access token (null when signed out). */
export async function getAccessToken(): Promise<string | null> {
  return accessTokenItem.getValue();
}

/** Read the cached signed-in user (null when signed out). */
export async function getCachedUser(): Promise<User | null> {
  return userItem.getValue();
}

/** Persist tokens after a successful login/refresh, optionally caching the user. */
export async function setTokens(tokens: AuthTokens, user?: User | null): Promise<void> {
  await accessTokenItem.setValue(tokens.accessToken);
  await refreshTokenItem.setValue(tokens.refreshToken);
  if (user !== undefined) {
    await userItem.setValue(user);
  }
  api.setToken(tokens.accessToken);
}

/** Read the refresh token (used by the auth flow to rotate the access token). */
export async function getRefreshToken(): Promise<string | null> {
  return refreshTokenItem.getValue();
}

/** Clear all auth state on sign-out (or when a refresh fails). */
export async function clearTokens(): Promise<void> {
  await accessTokenItem.removeValue();
  await refreshTokenItem.removeValue();
  await userItem.removeValue();
  api.setToken(null);
}

/**
 * Seed the API client with the stored token. Call once at the start of any
 * entrypoint (content script, background, popup) before making API calls.
 * Returns the token that was applied (null if signed out).
 */
export async function seedApiToken(): Promise<string | null> {
  const token = await getAccessToken();
  api.setToken(token);
  return token;
}

/**
 * Subscribe to access-token changes across contexts (e.g. the content script
 * reacts when the popup signs in/out). Returns an unwatch function.
 */
export function watchAccessToken(cb: (token: string | null) => void): () => void {
  return accessTokenItem.watch(cb);
}
