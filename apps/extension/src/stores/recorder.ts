import { defineStore } from 'pinia';
import { ref } from 'vue';

export type RecorderState =
  | 'idle'
  | 'appearing'
  | 'recording'
  | 'uploading'
  | 'success'
  | 'error';

export const useRecorderStore = defineStore('recorder', () => {
  const currentState = ref<RecorderState>('idle');
  const errorMessage = ref<string | null>(null);

  function setAppearing() {
    currentState.value = 'appearing';
    errorMessage.value = null;
  }

  function startRecording() {
    currentState.value = 'recording';
    errorMessage.value = null;
  }

  function stopRecording() {
    currentState.value = 'uploading';
  }

  function setUploading() {
    currentState.value = 'uploading';
  }

  function setSuccess() {
    currentState.value = 'success';
  }

  function setError(errorMsg?: string) {
    currentState.value = 'error';
    errorMessage.value = errorMsg ?? 'An error occurred';
  }

  function reset() {
    currentState.value = 'idle';
    errorMessage.value = null;
  }

  return {
    currentState,
    errorMessage,
    setAppearing,
    startRecording,
    stopRecording,
    setUploading,
    setSuccess,
    setError,
    reset,
  };
});
