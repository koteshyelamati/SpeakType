import {
  API_ROUTES,
  AUTH_HEADER,
  BEARER_PREFIX,
  DEFAULT_API_BASE_URL,
  authTokensSchema,
  userSchema,
} from '@speaktype/shared';
import type {
  Settings,
  UpdateSettingsInput,
  Quota,
  AudioResponse,
  CleanupResponse,
  Language,
  CleanupMode,
  LoginInput,
  RegisterInput,
  AuthTokens,
  User,
} from '@speaktype/shared';

/**
 * Thrown for any non-2xx backend response. Carries the HTTP `status` (and the
 * backend error `code` when present) so callers can show a specific message —
 * "sign in" for 401, "quota" for 402, "service down" for 502 — instead of a
 * generic failure. Errors don't survive `runtime.sendMessage`, so the background
 * proxy re-emits these fields and the content bridge reconstructs an ApiError.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class SpeakTypeApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl = import.meta.env.WXT_API_URL || DEFAULT_API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    route: { method: string; path: string },
    body?: unknown,
    options?: RequestInit,
  ): Promise<T> {
    const url = `${this.baseUrl}${route.path}`;
    const headers = new Headers(options?.headers);

    if (this.token) {
      headers.set(AUTH_HEADER, `${BEARER_PREFIX}${this.token}`);
    }

    if (body && !(body instanceof FormData)) {
      headers.set('content-type', 'application/json');
    }

    const config: RequestInit = {
      ...options,
      method: route.method,
      headers,
    };

    if (body) {
      config.body = body instanceof FormData ? body : JSON.stringify(body);
    }

    const response = await fetch(url, config);

    if (!response.ok) {
      // Surface the backend's error code (when present) alongside the HTTP status
      // so callers can show a specific message instead of a generic failure.
      let code: string | undefined;
      try {
        const body = (await response.json()) as { code?: string };
        code = body?.code;
      } catch {
        // Non-JSON error body — the status alone will have to do.
      }
      throw new ApiError(
        `API Error: ${response.statusText} (${response.status})`,
        response.status,
        code,
      );
    }

    return response.json() as Promise<T>;
  }

  // ----------------------------- Auth methods --------------------------------

  /**
   * Sign in with email + password. Returns validated AuthTokens.
   * Surfaces a clean error if the backend is not yet available (Phase 3 deferred).
   */
  async login(input: LoginInput): Promise<AuthTokens> {
    const raw = await this.request<unknown>(API_ROUTES.auth.login, input);
    return authTokensSchema.parse(raw);
  }

  /**
   * Register a new account. Returns validated AuthTokens.
   */
  async register(input: RegisterInput): Promise<AuthTokens> {
    const raw = await this.request<unknown>(API_ROUTES.auth.register, input);
    return authTokensSchema.parse(raw);
  }

  /**
   * Sign out — revokes the refresh token server-side (fire-and-forget; token is
   * already cleared in storage by the auth store before this returns).
   */
  async logout(): Promise<void> {
    await this.request<unknown>(API_ROUTES.auth.logout);
  }

  /**
   * Rotate the access token using a valid refresh token. Returns new AuthTokens.
   */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const raw = await this.request<unknown>(API_ROUTES.auth.refresh, { refreshToken });
    return authTokensSchema.parse(raw);
  }

  /**
   * Fetch the currently authenticated user profile.
   */
  async getMe(): Promise<User> {
    const raw = await this.request<unknown>(API_ROUTES.auth.me);
    return userSchema.parse(raw);
  }

  // ----------------------------- Usage / quota -------------------------------

  async getQuota(): Promise<Quota> {
    // No silent fallback — a 401/network error must surface so the UI can prompt
    // sign-in instead of pretending the user has quota (which let recording start
    // and then failed at upload).
    return this.request<Quota>(API_ROUTES.usage.quota);
  }

  async transcribe(
    audioBlob: Blob,
    durationSeconds: number,
    language?: Language,
  ): Promise<AudioResponse> {
    const formData = new FormData();
    // Groq needs a filename with a real extension to detect the audio container.
    formData.append('audio', audioBlob, 'audio.webm');
    if (language) {
      formData.append('language', language);
    }
    formData.append('durationSeconds', durationSeconds.toString());

    // No silent stub fallback — let real backend errors propagate so the UI surfaces them.
    return this.request<AudioResponse>(API_ROUTES.audio.transcribe, formData);
  }

  async cleanup(
    transcript: string,
    cleanupMode: CleanupMode,
    websiteContext?: string,
  ): Promise<CleanupResponse> {
    // Let failures throw — the caller (content.ts) already falls back to the raw
    // transcript on error, so a stub here would mask a broken cleanup with a
    // fake "[Cleaned]" prefix that the user can't tell apart from a real result.
    return this.request<CleanupResponse>(API_ROUTES.cleanup.run, {
      transcript,
      cleanupMode,
      websiteContext,
    });
  }

  async getSettings(): Promise<Settings> {
    // Throws on failure; callers decide whether to fall back to local defaults
    // (and they log when they do, so a sync failure isn't invisible).
    return this.request<Settings>(API_ROUTES.settings.get);
  }

  async updateSettings(settings: UpdateSettingsInput): Promise<Settings> {
    // Throws on failure so a save that didn't persist can't look successful.
    return this.request<Settings>(API_ROUTES.settings.update, settings);
  }
}

export const api = new SpeakTypeApiClient();
export default api;
