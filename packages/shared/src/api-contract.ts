/**
 * API route contract — the extension↔backend boundary, as typed constants.
 * Human-readable mirror lives in memory/api-contract.md. Payload shapes come
 * from schemas.ts; this file fixes the paths, methods, and guard order.
 */

export const API_ROUTES = {
  auth: {
    login: { method: 'POST', path: '/auth/login' },
    register: { method: 'POST', path: '/auth/register' },
    logout: { method: 'POST', path: '/auth/logout' },
    refresh: { method: 'POST', path: '/auth/refresh' },
    me: { method: 'GET', path: '/auth/me' },
  },
  settings: {
    get: { method: 'GET', path: '/settings' },
    update: { method: 'PUT', path: '/settings' },
  },
  usage: {
    get: { method: 'GET', path: '/usage' },
    history: { method: 'GET', path: '/usage/history' },
    quota: { method: 'GET', path: '/usage/quota' },
  },
  audio: {
    transcribe: { method: 'POST', path: '/v1/audio' },
  },
  cleanup: {
    run: { method: 'POST', path: '/v1/cleanup' },
  },
  billing: {
    portal: { method: 'GET', path: '/billing/portal' },
    checkout: { method: 'POST', path: '/billing/checkout' },
    webhook: { method: 'POST', path: '/webhooks/stripe' },
  },
} as const;

/**
 * Guard order on protected routes (from memory/api-contract.md):
 * CORS allowlist → JWT auth → Redis rate-limit → quota → handler → usage log.
 */
export const PROTECTED_GUARD_ORDER = [
  'cors',
  'auth',
  'rate-limit',
  'quota',
  'handler',
  'usage-log',
] as const;

/** Header carrying the bearer access token. */
export const AUTH_HEADER = 'authorization';
export const BEARER_PREFIX = 'Bearer ';
