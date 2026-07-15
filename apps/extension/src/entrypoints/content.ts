import { createApp, defineComponent, h, ref } from 'vue';
import { createPinia, setActivePinia } from 'pinia';
import {
  transcribeViaBackground,
  cleanupViaBackground,
  getSettingsViaBackground,
} from '@/services/content-api';
import { ApiError } from '@/services/api';
import { useRecorderStore } from '@/stores/recorder';
import { useSettingsStore } from '@/stores/settings';
import { useRecorder } from '@/composables/useRecorder';
import { useQuota, invalidateQuotaCache } from '@/composables/useQuota';
import { insertTextAtCaret } from '@/utils/insert-text';
import MicIcon from '@/components/MicIcon.vue';
import InlinePreview from '@/components/InlinePreview.vue';
// Import CSS as raw text so we can inject it INTO the shadow root —
// page-level CSS (content.css) can't cross the Shadow DOM boundary.
import tokensRaw from '@/styles/tokens.css?raw';
import contentUiRaw from '@/styles/content-ui.css?raw';

// Tokens are authored against :root (the document). Inside a shadow root :root
// matches nothing, so retarget them to :host — the variables then inherit to
// every element in the shadow tree.
const shadowTokens = tokensRaw.replace(/:root/g, ':host');

// ──────────────────────────────────────────────
// Editable field detection
// ──────────────────────────────────────────────
const TEXT_INPUT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', '']);

function isEditableField(el: Element): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) {
    const t = (el.type ?? '').toLowerCase();
    return TEXT_INPUT_TYPES.has(t);
  }
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

// ──────────────────────────────────────────────
// Website context helper
// ──────────────────────────────────────────────
function buildWebsiteContext(target: HTMLElement): string {
  const label =
    target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement
      ? target.placeholder || target.getAttribute('aria-label') || target.name || ''
      : target.getAttribute('aria-label') || target.getAttribute('data-placeholder') || '';
  const parts: string[] = [location.hostname, document.title.slice(0, 80)];
  if (label) parts.push(label.slice(0, 80));
  return parts.filter(Boolean).join(' | ');
}

// ──────────────────────────────────────────────
// Shared Pinia instance — created once
// ──────────────────────────────────────────────
const pinia = createPinia();

// ──────────────────────────────────────────────
// Recording flow state — module-level
// ──────────────────────────────────────────────
let _recording = false;
let _retainedBlob: Blob | null = null;
let _retainedDuration = 0;
let _targetField: HTMLElement | null = null;
let _websiteContext = '';

// ──────────────────────────────────────────────
// Reusable recorder + quota (one per content-script lifetime)
// ──────────────────────────────────────────────
setActivePinia(pinia);
const recorder = useRecorder();
const quotaHelper = useQuota();

// ──────────────────────────────────────────────
// Inline-preview reactive state (module-level)
// ──────────────────────────────────────────────
const _pendingTranscript = ref<string>('');
const _showPreview = ref(false);
let _pendingTargetField: HTMLElement | null = null;
let _resolveConfirm: (() => void) | null = null;

function onPreviewAccept(text: string): void {
  const recorderStore = useRecorderStore(pinia);
  _showPreview.value = false;
  if (_pendingTargetField) {
    insertTextAtCaret(_pendingTargetField, text);
  }
  _pendingTargetField = null;
  recorderStore.setSuccess();
  setTimeout(() => recorderStore.reset(), 1500);
  _resolveConfirm?.();
  _resolveConfirm = null;
  maybeDetachAfterPreview();
}

function onPreviewReject(): void {
  const recorderStore = useRecorderStore(pinia);
  _showPreview.value = false;
  _pendingTargetField = null;
  recorderStore.reset();
  _resolveConfirm?.();
  _resolveConfirm = null;
  maybeDetachAfterPreview();
}

/**
 * After the review card closes, focus may no longer be on an editable field
 * (the card lived in the shadow DOM). Tear the mic down cleanly in that case so
 * it doesn't linger at the bottom of the page.
 */
function maybeDetachAfterPreview(): void {
  setTimeout(() => {
    if (_recording || _showPreview.value) return;
    const active = document.activeElement;
    if (!(active instanceof HTMLElement) || !isEditableField(active)) {
      detachMic();
    }
  }, 150);
}

/**
 * Map a failed backend call to a specific, user-facing message. Without this
 * every failure flattened to "Upload failed. Tap to retry." — which is exactly
 * what hid the broken voice pipeline for so long. (Finding 2.4.)
 */
function messageForError(err: unknown): string {
  const status = err instanceof ApiError ? err.status : undefined;
  switch (status) {
    case 401:
      return 'Please sign in to SpeakType.';
    case 402:
      return 'Quota exhausted. Tap to upgrade.';
    case 413:
      return 'Recording too long. Try a shorter clip.';
    case 502:
      return 'Transcription service is down. Tap to retry.';
    default:
      return 'Upload failed. Tap to retry.';
  }
}

// ──────────────────────────────────────────────
// Core toggle: start → stop → transcribe → insert
// ──────────────────────────────────────────────
/**
 * Upload a recorded blob, optionally clean it up, then preview or insert.
 * Shared by the normal stop path and the "tap to retry" path so a failed
 * upload re-sends the SAME retained blob instead of starting a fresh recording.
 */
async function uploadAndApply(
  blob: Blob,
  durationSeconds: number,
  targetField: HTMLElement | null,
  wsContext: string,
): Promise<void> {
  const recorderStore = useRecorderStore(pinia);
  const settings = useSettingsStore(pinia).settings;

  recorderStore.setUploading();

  try {
    const audioResp = await transcribeViaBackground(blob, durationSeconds, settings.language);
    let transcript = audioResp.transcript;

    if (settings.autoCleanup) {
      try {
        const cleanupResp = await cleanupViaBackground(transcript, 'light', wsContext);
        transcript = cleanupResp.cleanedText;
      } catch {
        // Keep original transcript on cleanup failure
      }
    }

    invalidateQuotaCache();
    // Upload succeeded — release the retained blob so a later tap records anew.
    _retainedBlob = null;

    if (settings.requireConfirmation) {
      // Show inline preview — await user action. Reset the mic state so the
      // "uploading" spinner stops while the review card waits for the user.
      _pendingTranscript.value = transcript;
      _showPreview.value = true;
      if (targetField) _pendingTargetField = targetField;
      recorderStore.reset();
      await new Promise<void>((resolve) => {
        _resolveConfirm = resolve;
      });
    } else {
      if (targetField) {
        insertTextAtCaret(targetField, transcript);
      }
      recorderStore.setSuccess();
      setTimeout(() => recorderStore.reset(), 1500);
    }
  } catch (err) {
    recorderStore.setError(messageForError(err));
    // Blob kept in _retainedBlob so the next tap retries the same upload.
  }
}

async function runToggle(activeField: HTMLElement): Promise<void> {
  const recorderStore = useRecorderStore(pinia);

  // Ignore taps while an upload/transcription is in flight — prevents overlapping
  // recordings from corrupting the state machine.
  if (recorderStore.currentState === 'uploading') return;

  if (_recording) {
    // ── Stop ──
    _recording = false;
    try {
      const result = await recorder.stop();
      _retainedBlob = result.blob;
      _retainedDuration = result.durationSeconds;
    } catch {
      recorderStore.setError('Recording failed.');
      return;
    }

    const blob = _retainedBlob;
    if (!blob) return;
    await uploadAndApply(blob, _retainedDuration, _targetField, _websiteContext);
    return;
  }

  // Not recording. If a previous upload failed, a tap retries the same blob.
  if (recorderStore.currentState === 'error' && _retainedBlob) {
    await uploadAndApply(_retainedBlob, _retainedDuration, _targetField, _websiteContext);
    return;
  }

  // ── Start a fresh recording ──
  // getQuota no longer returns a fake positive on failure, so a logged-out or
  // offline user is caught HERE instead of recording and failing at upload.
  try {
    const { allowed, quota } = await quotaHelper.checkQuota();
    if (!allowed) {
      recorderStore.setError(`Quota exhausted (${quota.remainingSeconds}s remaining).`);
      return;
    }
  } catch (err) {
    recorderStore.setError(
      err instanceof ApiError && err.status === 401
        ? 'Please sign in to SpeakType.'
        : 'Could not reach SpeakType. Check your connection.',
    );
    return;
  }

  _targetField = activeField;
  _websiteContext = buildWebsiteContext(activeField);

  try {
    await recorder.start();
    _recording = true;
  } catch {
    // Error state already set by useRecorder
  }
}

// ──────────────────────────────────────────────
// Per-field mic mount
// ──────────────────────────────────────────────
interface MicMount {
  host: HTMLElement;
  destroy: () => void;
  field: HTMLElement;
}

function mountMic(field: HTMLElement): MicMount {
  // Shadow host — zero-size fixed div, won't affect page layout
  const host = document.createElement('div');
  host.setAttribute('data-speaktype', 'mic-host');
  host.style.cssText =
    'all:initial;position:fixed;z-index:2147483647;pointer-events:none;' +
    'width:0;height:0;overflow:visible;';
  document.body.appendChild(host);

  const shadow = host.attachShadow({ mode: 'open' });

  // Inject tokens (vars) + component styles INTO the shadow root, so the mic
  // and preview are actually styled (document CSS can't reach the shadow).
  const styleEl = document.createElement('style');
  styleEl.textContent = shadowTokens + '\n' + contentUiRaw;
  shadow.appendChild(styleEl);

  // Container pinned to the bottom-center of the viewport (Wispr-style bar).
  // position:fixed keeps it put while the page scrolls, and it isn't anchored
  // to the field — so it never drifts with the text or gets clipped at the
  // page edge. The preview card stacks above the pill (column-reverse).
  const wrapper = document.createElement('div');
  wrapper.style.cssText =
    'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
    'pointer-events:auto;display:flex;flex-direction:column-reverse;' +
    'align-items:center;gap:10px;max-width:calc(100vw - 32px);';
  shadow.appendChild(wrapper);

  // Root Vue app: MicIcon + optional InlinePreview
  const RootApp = defineComponent({
    name: 'SpeakTypeRoot',
    setup() {
      const recorderStore = useRecorderStore();

      function onToggle(): void {
        void runToggle(field);
      }

      return () => [
        h(MicIcon, {
          recorderState: recorderStore.currentState,
          errorMessage: recorderStore.errorMessage,
          onToggle,
        }),
        _showPreview.value
          ? h(InlinePreview, {
              text: _pendingTranscript.value,
              onAccept: onPreviewAccept,
              onReject: onPreviewReject,
            })
          : null,
      ];
    },
  });

  const app = createApp(RootApp);
  app.use(pinia);
  app.mount(wrapper);

  // Trigger appear animation
  const recorderStore = useRecorderStore(pinia);
  recorderStore.setAppearing();
  setTimeout(() => {
    if (recorderStore.currentState === 'appearing') {
      recorderStore.reset();
    }
  }, 300);

  return {
    host,
    field,
    destroy() {
      app.unmount();
      host.remove();
    },
  };
}

// ──────────────────────────────────────────────
// Focus / blur / detach
// ──────────────────────────────────────────────
let _currentMount: MicMount | null = null;
let _activeField: HTMLElement | null = null;
let _blurTimer: ReturnType<typeof setTimeout> | null = null;

function onFocusIn(e: FocusEvent): void {
  const target = e.target;
  if (!(target instanceof HTMLElement)) return;
  if (!isEditableField(target)) return;

  if (_blurTimer !== null) {
    clearTimeout(_blurTimer);
    _blurTimer = null;
  }

  // Already showing for this field — nothing to do (the bar is viewport-fixed).
  if (_currentMount?.field === target) {
    return;
  }

  detachMic();
  _activeField = target;
  _currentMount = mountMic(target);
}

function onFocusOut(): void {
  _blurTimer = setTimeout(() => {
    _blurTimer = null;
    // Don't tear down while recording or while the review card is open — the
    // card lives in a separate shadow host, so clicking it (Edit/Accept/Reject)
    // blurs the page field and would otherwise destroy the card mid-interaction.
    if (!_recording && !_showPreview.value) detachMic();
  }, 120);
}

/**
 * Clear the module-level flow state so a torn-down mic never leaks a retained
 * retry blob, a stale target field, or an open preview card onto the next field
 * the user focuses (which previously inserted text into the OLD field).
 * Findings 2.2 / 2.3. Caller guarantees we're not mid-recording.
 */
function resetFlowState(): void {
  _retainedBlob = null;
  _retainedDuration = 0;
  _targetField = null;
  _websiteContext = '';
  _showPreview.value = false;
  _pendingTranscript.value = '';
  _pendingTargetField = null;
  // Resolve any hanging confirmation promise so uploadAndApply doesn't leak it.
  _resolveConfirm?.();
  _resolveConfirm = null;
  useRecorderStore(pinia).reset();
}

function detachMic(): void {
  _currentMount?.destroy();
  _currentMount = null;
  _activeField = null;
  // Only reset when idle — an active MediaRecorder is owned by its own stop()
  // path, and there's no cancel API to tear it down cleanly here.
  if (!_recording) {
    resetFlowState();
  }
}

// ──────────────────────────────────────────────
// MutationObserver — clean up orphaned mounts
// ──────────────────────────────────────────────
function startObserver(): void {
  const observer = new MutationObserver((mutations) => {
    if (!_currentMount) return;
    const mountedField = _currentMount.field;
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.removedNodes)) {
        if (node === mountedField || (node instanceof HTMLElement && node.contains(mountedField))) {
          detachMic();
          return;
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// ──────────────────────────────────────────────
// Runtime message — keyboard shortcut from background
// ──────────────────────────────────────────────
browser.runtime.onMessage.addListener((msg: unknown) => {
  if (
    typeof msg !== 'object' ||
    msg === null ||
    (msg as Record<string, unknown>)['type'] !== 'toggle-dictation'
  ) {
    return undefined;
  }

  const field = _activeField;
  if (!field) return undefined; // no focused editable — no-op

  void runToggle(field);
  return undefined;
});

// ──────────────────────────────────────────────
// Keyboard: tap-or-hold push-to-talk (Ctrl + Space)
// ──────────────────────────────────────────────
// Chrome's commands API only fires on key-DOWN, so it can't do hold-to-talk.
// We handle the chord on the page instead, which is also more reliable than a
// browser-level shortcut. Behaviour:
//   • Tap  (press & release quickly) → toggle recording on, tap again → off
//   • Hold (keep held > threshold)   → record while held, stop on release
const HOLD_THRESHOLD_MS = 350;
let _comboDown = false;
let _comboPressStart = 0;
let _comboStartedRecording = false;

/** Ctrl+Space, with no other modifiers. */
function matchesCombo(e: KeyboardEvent): boolean {
  return e.ctrlKey && !e.altKey && !e.metaKey && !e.shiftKey && e.code === 'Space';
}

function onKeyDown(e: KeyboardEvent): void {
  if (!matchesCombo(e)) return;

  const field = _activeField;
  if (!field) return; // only when an editable field is focused

  // Suppress the page's own Ctrl+Space (autocomplete/IME) and stop auto-repeat.
  e.preventDefault();
  e.stopPropagation();
  if (e.repeat || _comboDown) return;

  _comboDown = true;
  _comboPressStart = Date.now();

  if (_recording) {
    // A fresh tap while recording → stop (tap-to-toggle off).
    _comboStartedRecording = false;
    void runToggle(field);
  } else {
    // Begin recording; key-up decides whether it was a tap or a hold.
    _comboStartedRecording = true;
    void runToggle(field);
  }
}

function onKeyUp(e: KeyboardEvent): void {
  if (!_comboDown) return;
  // Either key of the combo lifting ends the gesture.
  if (e.code !== 'Space' && e.key !== 'Control') return;

  _comboDown = false;
  const heldMs = Date.now() - _comboPressStart;

  // Long hold that we started → push-to-talk release → stop.
  if (_comboStartedRecording && _recording && heldMs >= HOLD_THRESHOLD_MS) {
    const field = _activeField;
    if (field) void runToggle(field);
  }
  // Short tap → leave it recording; the next tap stops it.
  _comboStartedRecording = false;
}

// ──────────────────────────────────────────────
// WXT entrypoint
// ──────────────────────────────────────────────
export default defineContentScript({
  matches: ['<all_urls>'],
  async main() {
    // The background service worker owns the API token and makes the actual
    // backend calls (content-script fetches are blocked by CORS on the host
    // page's origin). Load settings through the background proxy.
    try {
      const remoteSettings = await getSettingsViaBackground();
      useSettingsStore(pinia).setSettings(remoteSettings);
    } catch (err) {
      // Fall back to local defaults, but don't do it silently — a sync failure
      // here should be visible in the console for debugging. (Findings 2.6/2.7.)
      console.warn('[SpeakType] Could not load remote settings; using defaults.', err);
    }

    // Attach focus/blur listeners
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);

    // Keyboard shortcut (Ctrl+Space) — tap to toggle, hold for push-to-talk.
    // Capture phase so we can pre-empt the page's own handlers.
    document.addEventListener('keydown', onKeyDown, true);
    document.addEventListener('keyup', onKeyUp, true);

    // Clean up orphaned mounts
    startObserver();
  },
});
