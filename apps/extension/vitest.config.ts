import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

/**
 * Unit-test config for the extension. We test pure TS logic (utils, composables,
 * the recorder store, the API client, auth-storage) under happy-dom — NOT the
 * WXT entrypoints (content.ts/background.ts), which depend on the WXT runtime
 * and browser globals and belong to integration/e2e, not unit tests.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    include: ['src/**/*.{test,spec}.ts'],
    // WXT entrypoints need the extension runtime; keep them out of unit tests.
    exclude: ['src/entrypoints/**', 'node_modules/**', '.wxt/**', '.output/**'],
  },
});
