/**
 * useRecorder — MediaRecorder composable for the SpeakType extension.
 * Handles getUserMedia, recording, error categorization, and track cleanup.
 *
 * Call setActivePinia(pinia) before using this outside a Vue component setup().
 */
import { useRecorderStore } from '@/stores/recorder';

export type RecorderError = 'denied' | 'no-device' | 'offline' | 'unknown';

export interface RecordingResult {
  blob: Blob;
  durationSeconds: number;
}

/** Preferred mimeType, in priority order. */
function _preferredMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm'];
  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return ''; // browser default
}

function _categorizeError(err: unknown): RecorderError {
  if (err instanceof DOMException) {
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      return 'denied';
    }
    if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      return 'no-device';
    }
  }
  if (!navigator.onLine) return 'offline';
  return 'unknown';
}

export interface UseRecorderReturn {
  /** Start recording. Rejects on permission / device error. */
  start(): Promise<void>;
  /** Stop recording. Returns the recorded blob and duration. */
  stop(): Promise<RecordingResult>;
  /** The blob retained after an upload failure, available for retry. */
  readonly retainedBlob: Blob | null;
  readonly retainedDuration: number;
}

export function useRecorder(): UseRecorderReturn {
  let _stream: MediaStream | null = null;
  let _recorder: MediaRecorder | null = null;
  let _chunks: BlobPart[] = [];
  let _startTime = 0;
  let _mimeType = '';

  let _retainedBlob: Blob | null = null;
  let _retainedDuration = 0;

  async function start(): Promise<void> {
    _chunks = [];
    _mimeType = _preferredMimeType();

    try {
      _stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      const category = _categorizeError(err);
      const msg =
        category === 'denied'
          ? 'Microphone permission denied.'
          : category === 'no-device'
            ? 'No microphone found.'
            : 'Could not access microphone.';
      useRecorderStore().setError(msg);
      throw Object.assign(new Error(msg), { category });
    }

    const options: MediaRecorderOptions = {};
    if (_mimeType) options.mimeType = _mimeType;

    _recorder = new MediaRecorder(_stream, options);
    _recorder.ondataavailable = (e: BlobEvent) => {
      if (e.data.size > 0) _chunks.push(e.data);
    };

    _startTime = Date.now();
    _recorder.start();
    useRecorderStore().startRecording();
  }

  function stop(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!_recorder || _recorder.state === 'inactive') {
        reject(new Error('Recorder is not active'));
        return;
      }

      _recorder.onstop = () => {
        const durationSeconds = (Date.now() - _startTime) / 1000;
        const type = _mimeType || 'audio/webm';
        const blob = new Blob(_chunks, { type });

        _retainedBlob = blob;
        _retainedDuration = durationSeconds;

        _stream?.getTracks().forEach((t) => t.stop());
        _stream = null;
        _recorder = null;
        _chunks = [];

        resolve({ blob, durationSeconds });
      };

      _recorder.onerror = (e: Event) => {
        _stream?.getTracks().forEach((t) => t.stop());
        _stream = null;
        _recorder = null;
        _chunks = [];
        const err =
          e instanceof ErrorEvent ? e.error : new Error('MediaRecorder error');
        reject(err instanceof Error ? err : new Error('MediaRecorder error'));
      };

      _recorder.stop();
    });
  }

  return {
    start,
    stop,
    get retainedBlob() {
      return _retainedBlob;
    },
    get retainedDuration() {
      return _retainedDuration;
    },
  };
}
