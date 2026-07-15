import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useRecorderStore } from '@/stores/recorder';

describe('useRecorderStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it('should initialize with correct default state', () => {
    const store = useRecorderStore();
    expect(store.currentState).toBe('idle');
    expect(store.errorMessage).toBeNull();
  });

  it('should transition to appearing and clear error', () => {
    const store = useRecorderStore();
    store.setError('previous error');
    store.setAppearing();
    expect(store.currentState).toBe('appearing');
    expect(store.errorMessage).toBeNull();
  });

  it('should transition to recording and clear error', () => {
    const store = useRecorderStore();
    store.setError('previous error');
    store.startRecording();
    expect(store.currentState).toBe('recording');
    expect(store.errorMessage).toBeNull();
  });

  it('should transition to uploading on stopRecording', () => {
    const store = useRecorderStore();
    store.stopRecording();
    expect(store.currentState).toBe('uploading');
  });

  it('should transition to uploading on setUploading', () => {
    const store = useRecorderStore();
    store.setUploading();
    expect(store.currentState).toBe('uploading');
  });

  it('should transition to success', () => {
    const store = useRecorderStore();
    store.setSuccess();
    expect(store.currentState).toBe('success');
  });

  it('should transition to error with default message', () => {
    const store = useRecorderStore();
    store.setError();
    expect(store.currentState).toBe('error');
    expect(store.errorMessage).toBe('An error occurred');
  });

  it('should transition to error with custom message', () => {
    const store = useRecorderStore();
    store.setError('Failed to fetch audio stream');
    expect(store.currentState).toBe('error');
    expect(store.errorMessage).toBe('Failed to fetch audio stream');
  });

  it('should reset to idle state and clear error', () => {
    const store = useRecorderStore();
    store.setError('Fatal crash');
    store.reset();
    expect(store.currentState).toBe('idle');
    expect(store.errorMessage).toBeNull();
  });
});
