import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-vue'],
  manifest: {
    name: 'SpeakType',
    description: 'Voice-to-text for every input on the web',
    permissions: ['storage', 'activeTab'],
    // Broad host access is the core feature: the mic must reach inputs on any site
    // the user types on. Minimal *API* permissions above keep the surface tight.
    host_permissions: ['<all_urls>'],
    content_security_policy: {
      extension_pages: "script-src 'self'; object-src 'self';",
    },
    commands: {
      'toggle-dictation': {
        suggested_key: {
          default: 'Alt+Shift+W',
          mac: 'MacCtrl+Shift+W',
        },
        description: 'Toggle SpeakType dictation',
      },
    },
  },
});
