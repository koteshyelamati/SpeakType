import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Settings } from '@speaktype/shared';

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<Settings>({
    language: 'auto',
    preferredModel: 'gemini-flash',
    autoCleanup: true,
    requireConfirmation: true,
  });

  function updateSettings(newSettings: Partial<Settings>) {
    settings.value = {
      ...settings.value,
      ...newSettings,
    };
  }

  function setSettings(newSettings: Settings) {
    settings.value = newSettings;
  }

  return {
    settings,
    updateSettings,
    setSettings,
  };
});
