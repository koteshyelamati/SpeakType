<template>
  <div
    class="st-preview-card"
    role="dialog"
    aria-label="SpeakType — confirm transcript"
  >
    <!-- Header -->
    <div class="st-preview-head">
      <span
        class="st-preview-mark"
        aria-hidden="true"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width="13"
          height="13"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <rect
            x="9"
            y="2.5"
            width="6"
            height="11"
            rx="3"
          />
          <path d="M5.5 11a6.5 6.5 0 0 0 13 0" />
          <path d="M12 17.5V21" />
        </svg>
      </span>
      <span class="st-preview-title">SpeakType</span>
      <span class="st-preview-caption">Review transcript</span>
    </div>

    <!-- Transcript text — editable when in edit mode -->
    <div class="st-preview-text">
      <textarea
        v-if="editing"
        ref="editRef"
        v-model="editValue"
        class="st-preview-edit"
        rows="3"
        aria-label="Edit transcript"
      />
      <p
        v-else
        class="st-preview-content"
      >
        {{ displayText }}
      </p>
    </div>

    <!-- Actions -->
    <div class="st-preview-actions">
      <button
        class="st-btn st-btn-text"
        @click="onReject"
      >
        Reject
      </button>

      <button
        class="st-btn st-btn-tonal"
        @click="onEdit"
      >
        {{ editing ? 'Done' : 'Edit' }}
      </button>

      <button
        class="st-btn st-btn-primary"
        @click="onAccept"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          width="16"
          height="16"
          stroke="currentColor"
          stroke-width="2.4"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        Accept
      </button>
    </div>
  </div>
</template>

<script lang="ts">
export default { name: 'InlinePreview' };
</script>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';

const props = defineProps<{
  text: string;
}>();

const emit = defineEmits<{
  (e: 'accept', text: string): void;
  (e: 'reject'): void;
}>();

const editing = ref(false);
const editValue = ref(props.text);
const editRef = ref<HTMLTextAreaElement | null>(null);

const displayText = computed(() => editing.value ? editValue.value : props.text);

async function onEdit() {
  if (!editing.value) {
    editing.value = true;
    editValue.value = props.text;
    await nextTick();
    editRef.value?.focus();
  } else {
    editing.value = false;
  }
}

function onAccept() {
  const finalText = editing.value ? editValue.value : props.text;
  editing.value = false;
  emit('accept', finalText);
}

function onReject() {
  editing.value = false;
  emit('reject');
}
</script>

<!--
  Styles for this component live in src/styles/content-ui.css and are injected
  into the Shadow DOM by content.ts. Scoped page-level CSS (content.css) cannot
  cross the shadow boundary, so it must not live here.
-->
