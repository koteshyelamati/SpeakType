<template>
  <div
    class="st-mic-wrapper"
    :class="wrapperClass"
  >
    <!-- Quota tooltip on hover -->
    <div
      v-if="showTooltip && quotaLabel"
      class="st-mic-tooltip"
      role="tooltip"
    >
      {{ quotaLabel }}
    </div>

    <!-- The mic pill (Wispr-style bottom bar) -->
    <button
      ref="btnRef"
      class="st-mic-pill"
      :class="btnClass"
      role="button"
      :aria-label="ariaLabel"
      :aria-pressed="recorderState === 'recording'"
      tabindex="0"
      @mousedown.prevent
      @click="onActivate"
      @keydown="onKeydown"
      @mouseenter="showTooltip = true"
      @mouseleave="showTooltip = false"
      @focus="showTooltip = true"
      @blur="showTooltip = false"
    >
      <span
        class="st-mic-glyph"
        aria-hidden="true"
      >
        <!-- Recording: animated waveform / equalizer bars -->
        <span
          v-if="recorderState === 'recording'"
          class="st-eq"
        >
          <i /><i /><i /><i /><i />
        </span>

        <!-- Uploading: clean rotating arc ring -->
        <svg
          v-else-if="recorderState === 'uploading'"
          class="st-spin"
          viewBox="0 0 24 24"
          fill="none"
          width="18"
          height="18"
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            stroke-opacity="0.25"
            stroke-width="2.4"
          />
          <path
            d="M21 12a9 9 0 0 0-9-9"
            stroke="currentColor"
            stroke-width="2.4"
            stroke-linecap="round"
          />
        </svg>

        <!-- Success: rounded check -->
        <svg
          v-else-if="recorderState === 'success'"
          viewBox="0 0 24 24"
          fill="none"
          width="18"
          height="18"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>

        <!-- Error: mic with slash -->
        <svg
          v-else-if="recorderState === 'error'"
          viewBox="0 0 24 24"
          fill="none"
          width="18"
          height="18"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 11.4V6a3 3 0 0 0-5.94-.6" />
          <path d="M17 11a5 5 0 0 1-.54 2.27M5 11a7 7 0 0 0 10.7 5.96M12 18.5V21" />
          <path d="M3 3l18 18" />
        </svg>

        <!-- Idle / Appearing: modern filled mic (matches the toolbar mark) -->
        <svg
          v-else
          viewBox="0 0 24 24"
          fill="none"
          width="18"
          height="18"
        >
          <rect
            x="9"
            y="2.5"
            width="6"
            height="11"
            rx="3"
            fill="currentColor"
          />
          <rect
            x="11.25"
            y="17.6"
            width="1.5"
            height="3.1"
            rx="0.75"
            fill="currentColor"
          />
          <rect
            x="8.5"
            y="20.2"
            width="7"
            height="1.6"
            rx="0.8"
            fill="currentColor"
          />
          <path
            d="M5.5 11a6.5 6.5 0 0 0 13 0"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </span>

      <span class="st-mic-label">{{ label }}</span>
    </button>
  </div>
</template>

<script lang="ts">
export default { name: 'MicIcon' };
</script>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { RecorderState } from '@/stores/recorder';
import type { Quota } from '@speaktype/shared';

const props = defineProps<{
  recorderState: RecorderState;
  quota?: Quota | null;
  errorMessage?: string | null;
}>();

const emit = defineEmits<{
  (e: 'toggle'): void;
}>();

const btnRef = ref<HTMLButtonElement | null>(null);
const showTooltip = ref(false);

const quotaLabel = computed<string | null>(() => {
  if (!props.quota) return null;
  const mins = Math.floor(props.quota.remainingSeconds / 60);
  const secs = props.quota.remainingSeconds % 60;
  if (mins > 0) return `${mins}m ${secs}s remaining`;
  return `${secs}s remaining`;
});

// The state-driven label shown inside the pill.
const label = computed(() => {
  switch (props.recorderState) {
    case 'recording': return 'Listening…';
    case 'uploading': return 'Transcribing…';
    case 'success':   return 'Inserted';
    case 'error':     return props.errorMessage ?? 'Tap to retry';
    default:          return 'Dictate';
  }
});

const ariaLabel = computed(() => {
  if (props.recorderState === 'recording') return 'Stop dictation (SpeakType)';
  if (props.recorderState === 'error') return props.errorMessage ?? 'Error — tap to retry (SpeakType)';
  return 'Dictate with SpeakType';
});

const wrapperClass = computed(() => ({
  'st-state-appearing': props.recorderState === 'appearing',
}));

const btnClass = computed(() => ({
  'st-idle':       props.recorderState === 'idle' || props.recorderState === 'appearing',
  'st-recording':  props.recorderState === 'recording',
  'st-uploading':  props.recorderState === 'uploading',
  'st-success':    props.recorderState === 'success',
  'st-error':      props.recorderState === 'error',
}));

function onActivate() {
  emit('toggle');
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    emit('toggle');
  }
}
</script>

<!--
  Styles for this component live in src/styles/content-ui.css and are injected
  into the Shadow DOM by content.ts. Scoped page-level CSS (content.css) cannot
  cross the shadow boundary, so it must not live here.
-->
