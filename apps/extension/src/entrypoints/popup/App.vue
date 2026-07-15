<template>
  <div class="popup-root">
    <!-- Top bar -->
    <header class="top-bar" role="banner">
      <span class="top-bar__logo" aria-hidden="true">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <rect x="9" y="2.5" width="6" height="11" rx="3" />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <path d="M12 17.5V21" />
          <path d="M8.5 21h7" />
        </svg>
      </span>
      <span class="top-bar__text">
        <span class="top-bar__title">SpeakType</span>
        <span class="top-bar__tagline">Voice typing, everywhere</span>
      </span>
    </header>

    <!-- Main content -->
    <main class="popup-main">
      <!-- ======================== SIGNED-IN VIEW ======================== -->
      <template v-if="status === 'signed-in'">
        <div class="user-card" role="region" aria-label="Account">
          <div class="user-card__avatar" aria-hidden="true">
            {{ avatarInitial }}
          </div>
          <div class="user-card__info">
            <p class="user-card__name">
              {{ displayName }}
            </p>
            <p class="user-card__email">
              {{ user?.email ?? '' }}
            </p>
          </div>
          <span class="user-card__plan">{{ planLabel }}</span>
        </div>

        <div class="status-pill status-pill--ready" role="status" aria-live="polite">
          <span class="status-pill__dot" aria-hidden="true" />
          Ready to dictate
        </div>

        <div class="shortcut-hint" role="note">
          <div class="shortcut-hint__main">
            <span class="hint-label">Shortcut</span>
            <kbd class="kbd">{{ shortcutKey }}</kbd>
            <a
              class="hint-link"
              href="chrome://extensions/shortcuts"
              target="_blank"
              rel="noopener noreferrer"
              >Rebind</a
            >
          </div>
          <span class="shortcut-hint__helper">Tap to toggle · hold to talk</span>
        </div>

        <button
          class="btn btn--tonal btn--full"
          type="button"
          aria-label="Sign out of SpeakType"
          @click="handleSignOut"
        >
          Sign out
        </button>
      </template>

      <!-- ======================= LOADING / INIT ========================= -->
      <template v-else-if="status === 'authenticating'">
        <div class="loading-row" role="status" aria-live="polite" aria-label="Loading">
          <div class="spinner" aria-hidden="true" />
          <span class="loading-text">Just a moment…</span>
        </div>
      </template>

      <!-- ==================== SIGNED-OUT / AUTH FORM ==================== -->
      <template v-else>
        <p class="auth-intro">Sign in to sync your settings, quota, and history across devices.</p>

        <!-- Error banner -->
        <div
          v-if="status === 'error' && errorMessage"
          class="error-banner"
          role="alert"
          aria-live="assertive"
        >
          <svg
            class="error-banner__icon"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              d="M12 2 1 21h22L12 2Zm0 6a1 1 0 0 1 1 1v5a1 1 0 1 1-2 0V9a1 1 0 0 1 1-1Zm0 9.5a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5Z"
            />
          </svg>
          <span>{{ errorMessage }}</span>
        </div>

        <!-- Tab switcher (segmented control) -->
        <div class="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            id="tab-signin"
            class="auth-tab"
            :class="{ 'auth-tab--active': mode === 'signin' }"
            role="tab"
            :aria-selected="mode === 'signin'"
            aria-controls="panel-signin"
            type="button"
            @click="switchMode('signin')"
          >
            Sign in
          </button>
          <button
            id="tab-register"
            class="auth-tab"
            :class="{ 'auth-tab--active': mode === 'register' }"
            role="tab"
            :aria-selected="mode === 'register'"
            aria-controls="panel-register"
            type="button"
            @click="switchMode('register')"
          >
            Create account
          </button>
        </div>

        <!-- Sign-in panel -->
        <form
          v-if="mode === 'signin'"
          id="panel-signin"
          class="auth-form"
          role="tabpanel"
          aria-labelledby="tab-signin"
          novalidate
          @submit.prevent="handleSignIn"
        >
          <div class="field">
            <label class="field__label" for="signin-email">Email</label>
            <input
              id="signin-email"
              v-model="email"
              class="field__input"
              type="email"
              name="email"
              autocomplete="email"
              required
              aria-required="true"
              placeholder="you@example.com"
            />
          </div>
          <div class="field">
            <label class="field__label" for="signin-password">Password</label>
            <input
              id="signin-password"
              v-model="password"
              class="field__input"
              type="password"
              name="password"
              autocomplete="current-password"
              required
              aria-required="true"
              placeholder="Your password"
            />
          </div>
          <button class="btn btn--filled btn--full" type="submit" :disabled="!canSubmit">
            Sign in
          </button>
        </form>

        <!-- Register panel -->
        <form
          v-else
          id="panel-register"
          class="auth-form"
          role="tabpanel"
          aria-labelledby="tab-register"
          novalidate
          @submit.prevent="handleRegister"
        >
          <div class="field">
            <label class="field__label" for="reg-name">
              Name <span class="field__optional">(optional)</span>
            </label>
            <input
              id="reg-name"
              v-model="name"
              class="field__input"
              type="text"
              name="name"
              autocomplete="name"
              placeholder="Your name"
            />
          </div>
          <div class="field">
            <label class="field__label" for="reg-email">Email</label>
            <input
              id="reg-email"
              v-model="email"
              class="field__input"
              type="email"
              name="email"
              autocomplete="email"
              required
              aria-required="true"
              placeholder="you@example.com"
            />
          </div>
          <div class="field">
            <label class="field__label" for="reg-password">Password</label>
            <input
              id="reg-password"
              v-model="password"
              class="field__input"
              type="password"
              name="password"
              autocomplete="new-password"
              required
              aria-required="true"
              placeholder="Min. 8 characters"
            />
            <span class="field__help">At least 8 characters.</span>
          </div>
          <button class="btn btn--filled btn--full" type="submit" :disabled="!canSubmit">
            Create account
          </button>
        </form>
      </template>
    </main>

    <!-- Footer -->
    <footer v-if="status !== 'signed-in'" class="popup-footer">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path
          d="M12 1 3 5v6c0 5 3.8 9.7 9 11 5.2-1.3 9-6 9-11V5l-9-4Zm0 10.9h7c-.5 4-3.2 7.6-7 8.8V12H5V6.3l7-3.1V11.9Z"
        />
      </svg>
      <span>Audio is processed securely and never stored.</span>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';

export default defineComponent({
  name: 'PopupApp',

  setup() {
    const authStore = useAuthStore();

    // Destructure reactive state as plain refs (vue-tsc understands these types)
    const { user, status, errorMessage } = storeToRefs(authStore);

    // Form state
    const mode = ref<'signin' | 'register'>('signin');
    const email = ref('');
    const password = ref('');
    const name = ref('');

    // Derived
    const canSubmit = computed(() => email.value.length > 0 && password.value.length >= 8);

    const displayName = computed(() => user.value?.name ?? user.value?.email ?? 'Signed in');

    const avatarInitial = computed(() => {
      const src = user.value?.name ?? user.value?.email ?? '?';
      return src.charAt(0).toUpperCase();
    });

    const planLabel = computed(() => {
      const plan = user.value?.plan ?? 'free';
      return plan === 'pro' ? 'Pro' : 'Free';
    });

    // The primary trigger is the page-level tap-or-hold gesture handled in
    // content.ts (matchesCombo = Ctrl + Space), so it's the same on every OS.
    const shortcutKey = computed(() => 'Ctrl + Space');

    // Actions
    function switchMode(next: 'signin' | 'register') {
      mode.value = next;
      email.value = '';
      password.value = '';
      name.value = '';
    }

    async function handleSignIn() {
      if (!canSubmit.value) return;
      await authStore.signIn(email.value, password.value);
    }

    async function handleRegister() {
      if (!canSubmit.value) return;
      await authStore.signUp(email.value, password.value, name.value || undefined);
    }

    async function handleSignOut() {
      await authStore.signOut();
    }

    onMounted(() => {
      void authStore.init();
    });

    return {
      // Store state (unwrapped refs — template sees plain values)
      user,
      status,
      errorMessage,
      // Form
      mode,
      email,
      password,
      name,
      // Computed
      canSubmit,
      displayName,
      avatarInitial,
      planLabel,
      shortcutKey,
      // Actions
      switchMode,
      handleSignIn,
      handleRegister,
      handleSignOut,
    };
  },
});
</script>

<style>
/* Global popup reset — kill the default body margin so the taller
   register view doesn't trip Chrome's popup height cap into a scrollbar. */
html,
body {
  margin: 0;
  padding: 0;
  background: var(--st-surface);
}
</style>

<style scoped>
/* ============================================================
   Popup root — MD3 surface, fixed width, type scale
   ============================================================ */
.popup-root {
  width: 340px;
  background: var(--st-surface);
  color: var(--st-on-surface);
  font-family: Roboto, 'Google Sans', system-ui, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  display: flex;
  flex-direction: column;
  -webkit-font-smoothing: antialiased;
}

/* ---- Top bar ---- */
.top-bar {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--st-space-12);
  padding: var(--st-space-16) var(--st-space-16) var(--st-space-16);
  background: var(--st-brand-grad);
  color: #fff;
  overflow: hidden;
}

/* Decorative soft glow blob — adds depth, modern "aurora" feel */
.top-bar::before {
  content: '';
  position: absolute;
  top: -60%;
  right: -10%;
  width: 180px;
  height: 180px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.35), transparent 70%);
  pointer-events: none;
}

.top-bar > * {
  position: relative;
  z-index: 1;
}

.top-bar__logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: var(--st-radius-full);
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 1px rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(4px);
  flex-shrink: 0;
}

.top-bar__text {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.top-bar__title {
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.01em;
}

.top-bar__tagline {
  font-size: 12px;
  font-weight: 400;
  opacity: 0.85;
}

/* ---- Main content ---- */
.popup-main {
  flex: 1;
  padding: var(--st-space-16);
  display: flex;
  flex-direction: column;
  gap: var(--st-space-12);
}

.auth-intro {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.5;
  color: var(--st-on-surface-variant);
}

/* ---- Loading ---- */
.loading-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--st-space-8);
  padding: var(--st-space-32) 0;
}

.loading-text {
  color: var(--st-on-surface-variant);
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid var(--st-surface-variant);
  border-top-color: var(--st-primary);
  border-radius: var(--st-radius-full);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
  }
}

/* ---- Error banner ---- */
.error-banner {
  display: flex;
  align-items: flex-start;
  gap: var(--st-space-8);
  background: color-mix(in srgb, var(--st-error) 10%, var(--st-surface));
  color: color-mix(in srgb, var(--st-error) 88%, #000);
  border: 1px solid color-mix(in srgb, var(--st-error) 28%, transparent);
  border-radius: var(--st-radius-md);
  padding: var(--st-space-12);
  font-size: 13px;
}

.error-banner__icon {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--st-error);
}

/* ---- Auth tabs (segmented control) ---- */
.auth-tabs {
  display: flex;
  gap: 2px;
  border-radius: var(--st-radius-full);
  background: var(--st-surface-container);
  border: 1px solid color-mix(in srgb, var(--st-outline) 18%, transparent);
  padding: 4px;
}

.auth-tab {
  flex: 1;
  padding: var(--st-space-8) var(--st-space-12);
  background: transparent;
  border: none;
  border-radius: var(--st-radius-full);
  color: var(--st-on-surface-variant);
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition:
    background var(--st-dur-short) var(--st-ease-standard),
    color var(--st-dur-short) var(--st-ease-standard),
    box-shadow var(--st-dur-short) var(--st-ease-standard);
}

.auth-tab:focus-visible {
  outline: 2px solid var(--st-primary);
  outline-offset: 1px;
}

.auth-tab--active {
  background: var(--st-surface);
  color: var(--st-primary);
  font-weight: 600;
  box-shadow: var(--st-elev-soft);
}

/* ---- Auth form ---- */
.auth-form {
  display: flex;
  flex-direction: column;
  gap: var(--st-space-12);
}

/* ---- Form fields ---- */
.field {
  display: flex;
  flex-direction: column;
  gap: var(--st-space-4);
}

.field__label {
  font-size: 13px;
  font-weight: 500;
  color: var(--st-on-surface);
}

.field__optional {
  font-weight: 400;
  color: var(--st-on-surface-variant);
}

.field__help {
  font-size: 11px;
  color: var(--st-on-surface-variant);
}

.field__input {
  height: 46px;
  padding: 0 var(--st-space-16);
  background: var(--st-surface);
  border: 1.5px solid color-mix(in srgb, var(--st-outline) 35%, transparent);
  border-radius: var(--st-radius-md);
  color: var(--st-on-surface);
  font-family: inherit;
  font-size: 14px;
  box-shadow: var(--st-elev-soft);
  transition:
    border-color var(--st-dur-short) var(--st-ease-standard),
    background var(--st-dur-short) var(--st-ease-standard),
    box-shadow var(--st-dur-medium) var(--st-ease-standard);
  outline: none;
}

.field__input::placeholder {
  color: var(--st-on-surface-variant);
  opacity: 0.65;
}

.field__input:hover {
  border-color: color-mix(in srgb, var(--st-primary) 45%, transparent);
}

.field__input:focus {
  background: var(--st-surface);
  border-color: var(--st-primary);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--st-primary) 18%, transparent),
    var(--st-elev-soft);
}

/* ---- Buttons ---- */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--st-space-8);
  height: 44px;
  padding: 0 var(--st-space-16);
  border: none;
  border-radius: var(--st-radius-full);
  font-family: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background var(--st-dur-short) var(--st-ease-standard),
    box-shadow var(--st-dur-short) var(--st-ease-standard),
    transform var(--st-dur-short) var(--st-ease-standard),
    filter var(--st-dur-short) var(--st-ease-standard),
    opacity var(--st-dur-short) var(--st-ease-standard);
}

@media (prefers-reduced-motion: reduce) {
  .btn--filled:hover:not(:disabled),
  .btn--filled:active:not(:disabled) {
    transform: none;
  }
}

.btn:focus-visible {
  outline: 2px solid var(--st-primary);
  outline-offset: 2px;
}

.btn--full {
  width: 100%;
}

.btn--filled {
  background: var(--st-brand-grad);
  color: #fff;
  box-shadow: var(--st-elev-soft);
}

.btn--filled:hover:not(:disabled) {
  box-shadow: var(--st-elev-lift);
  transform: translateY(-1px);
}

.btn--filled:active:not(:disabled) {
  transform: translateY(0);
  filter: brightness(0.96);
}

/* Intentional disabled state — muted surface, not a faded primary */
.btn--filled:disabled {
  background: var(--st-surface-container-high);
  color: var(--st-on-surface-variant);
  box-shadow: none;
  cursor: not-allowed;
}

.btn--tonal {
  background: var(--st-primary-container);
  color: var(--st-on-primary-container);
  margin-top: var(--st-space-8);
  box-shadow: 0 1px 2px rgba(66, 99, 235, 0.05);
}

.btn--tonal:hover:not(:disabled) {
  background: color-mix(in srgb, var(--st-primary) 10%, var(--st-primary-container));
  box-shadow: var(--st-elev-1);
  transform: translateY(-1px);
}

.btn--tonal:active:not(:disabled) {
  background: color-mix(in srgb, var(--st-primary) 20%, var(--st-primary-container));
  transform: translateY(0);
  filter: brightness(0.95);
}

/* ---- Signed-in: user card ---- */
.user-card {
  display: flex;
  align-items: center;
  gap: var(--st-space-12);
  background: var(--st-surface-container);
  border: 1px solid color-mix(in srgb, var(--st-outline) 10%, transparent);
  border-radius: var(--st-radius-lg);
  padding: var(--st-space-12) var(--st-space-16);
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.02),
    0 4px 12px rgba(66, 99, 235, 0.03);
}

.user-card__avatar {
  width: 44px;
  height: 44px;
  border-radius: var(--st-radius-full);
  background: var(--st-brand-grad);
  color: var(--st-on-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
  flex-shrink: 0;
  border: 2px solid var(--st-surface);
  box-shadow: 0 2px 8px rgba(66, 99, 235, 0.15);
}

.user-card__info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  flex: 1;
}

.user-card__name {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--st-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__email {
  margin: 0;
  font-size: 12px;
  color: var(--st-on-surface-variant);
  opacity: 0.85;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-card__plan {
  padding: 4px 10px;
  background: var(--st-primary-container);
  color: var(--st-on-primary-container);
  border-radius: var(--st-radius-full);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  flex-shrink: 0;
  border: 1px solid color-mix(in srgb, var(--st-primary) 12%, transparent);
}

/* ---- Status pill ---- */
.status-pill {
  display: flex;
  align-items: center;
  gap: var(--st-space-8);
  padding: var(--st-space-8) var(--st-space-12);
  border-radius: var(--st-radius-md);
  font-size: 13px;
  font-weight: 600;
  background: color-mix(in srgb, var(--st-secondary) 8%, var(--st-surface));
  color: color-mix(in srgb, var(--st-secondary) 85%, #000);
  border: 1px solid color-mix(in srgb, var(--st-secondary) 15%, transparent);
}

.status-pill__dot {
  width: 8px;
  height: 8px;
  border-radius: var(--st-radius-full);
  background: var(--st-secondary);
  flex-shrink: 0;
  position: relative;
}

/* Pulsing effect */
.status-pill__dot::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border-radius: var(--st-radius-full);
  background: var(--st-secondary);
  opacity: 0.4;
  animation: pulse 2s infinite ease-in-out;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  70% {
    transform: scale(2.2);
    opacity: 0;
  }
  100% {
    transform: scale(1);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .status-pill__dot::after {
    animation: none;
    display: none;
  }
}

/* ---- Shortcut hint ---- */
.shortcut-hint {
  display: flex;
  flex-direction: column;
  gap: var(--st-space-4);
  padding: var(--st-space-12);
  background: var(--st-surface-container);
  border-radius: var(--st-radius-md);
  border: 1px solid color-mix(in srgb, var(--st-outline) 8%, transparent);
}

.shortcut-hint__main {
  display: flex;
  align-items: center;
  gap: var(--st-space-8);
  width: 100%;
}

.shortcut-hint__helper {
  font-size: 11px;
  color: var(--st-on-surface-variant);
  opacity: 0.7;
  padding-left: var(--st-space-4);
  letter-spacing: 0.01em;
}

.hint-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--st-on-surface-variant);
}

.kbd {
  display: inline-flex;
  align-items: center;
  padding: 3px 8px;
  background: var(--st-surface-container-high);
  border: 1px solid color-mix(in srgb, var(--st-outline) 30%, transparent);
  border-bottom: 2px solid color-mix(in srgb, var(--st-outline) 45%, transparent);
  border-radius: 6px;
  font-family: inherit;
  font-size: 11px;
  font-weight: 600;
  color: var(--st-on-surface);
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.hint-link {
  margin-left: auto;
  font-size: 12px;
  font-weight: 600;
  color: var(--st-primary);
  text-decoration: none;
  transition:
    color var(--st-dur-short) var(--st-ease-standard),
    opacity var(--st-dur-short) var(--st-ease-standard);
}

.hint-link:hover {
  opacity: 0.8;
}

.hint-link:focus-visible {
  outline: 2px solid var(--st-primary);
  outline-offset: 2px;
  border-radius: var(--st-radius-sm);
}

/* ---- Footer ---- */
.popup-footer {
  display: flex;
  align-items: center;
  gap: var(--st-space-8);
  padding: var(--st-space-12) var(--st-space-16);
  border-top: 1px solid var(--st-surface-variant);
  color: var(--st-on-surface-variant);
  font-size: 11px;
}
</style>
