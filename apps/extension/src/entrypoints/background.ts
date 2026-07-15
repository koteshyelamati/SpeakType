import { api, ApiError } from '@/services/api';
import { seedApiToken, watchAccessToken } from '@/services/auth-storage';
import type { ApiProxyRequest, ApiProxyResponse } from '@/services/content-api';

export default defineBackground(() => {
  // Keep the API client authenticated with the stored token. Proxied calls from
  // content scripts run here (extension origin), so the token must live here.
  void seedApiToken();
  watchAccessToken((token) => {
    api.setToken(token);
  });

  // Keyboard command → forward the toggle to the active tab's content script.
  browser.commands.onCommand.addListener((command: string) => {
    if (command !== 'toggle-dictation') return;

    void browser.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
      const tab = tabs[0];
      if (!tab?.id) return;

      browser.tabs.sendMessage(tab.id, { type: 'toggle-dictation' }).catch(() => {
        // Content script may not be injected on this tab — silently ignore
      });
    });
  });

  // Backend API proxy for content scripts. A content script's fetch carries the
  // host page's origin, which the backend CORS allowlist rejects. We run the
  // call here instead — the service worker's requests use the extension origin,
  // which CORS trusts.
  browser.runtime.onMessage.addListener(
    (message: unknown): Promise<ApiProxyResponse> | undefined => {
      const req = message as ApiProxyRequest | null;
      if (!req || req.type !== 'st-api') return undefined;

      return (async (): Promise<ApiProxyResponse> => {
        try {
          switch (req.method) {
            case 'getQuota':
              return { ok: true, data: await api.getQuota() };
            case 'getSettings':
              return { ok: true, data: await api.getSettings() };
            case 'transcribe': {
              const blob = new Blob([req.audioBuffer], { type: req.mimeType });
              return {
                ok: true,
                data: await api.transcribe(blob, req.durationSeconds, req.language),
              };
            }
            case 'cleanup':
              return {
                ok: true,
                data: await api.cleanup(req.transcript, req.cleanupMode, req.websiteContext),
              };
            default:
              return { ok: false, error: 'Unknown API method' };
          }
        } catch (err) {
          // Errors don't survive runtime.sendMessage, so flatten the message but
          // carry status/code as primitives — the content bridge rebuilds an
          // ApiError so the UI can show a specific reason (401/402/502).
          return {
            ok: false,
            error: err instanceof Error ? err.message : 'API call failed',
            status: err instanceof ApiError ? err.status : undefined,
            code: err instanceof ApiError ? err.code : undefined,
          };
        }
      })();
    },
  );
});
