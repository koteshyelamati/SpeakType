import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SttGateway, SttUnavailableError } from '../stt';

// Mock the database layer
vi.mock('~/server/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
  },
  providerFailures: {},
}));

describe('SttGateway', () => {
  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
    // Default valid configuration
    vi.stubGlobal('useRuntimeConfig', () => ({
      groqApiKey: 'valid-api-key',
      groqModel: 'whisper-large-v3-turbo',
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  function createResponse(data: unknown, ok = true, status = 200, statusText = 'OK') {
    return {
      ok,
      status,
      statusText,
      json: async () => data,
      text: async () => JSON.stringify(data),
    };
  }

  it('should throw SttUnavailableError (502) if groqApiKey is missing', async () => {
    // Override key config to be missing
    vi.stubGlobal('useRuntimeConfig', () => ({
      groqApiKey: undefined,
      groqModel: 'whisper-large-v3-turbo',
    }));

    const audio = {
      bytes: new Uint8Array([1, 2, 3]),
      filename: 'audio.webm',
      mime: 'audio/webm',
    };

    await expect(SttGateway.transcribe(audio)).rejects.toThrow(SttUnavailableError);
  });

  it('should throw SttUnavailableError (502) if Groq returns a non-2xx status code', async () => {
    mockFetch.mockResolvedValue(
      createResponse({ error: 'Rate limit exceeded' }, false, 429, 'Too Many Requests'),
    );

    const audio = {
      bytes: new Uint8Array([1, 2, 3]),
      filename: 'audio.webm',
      mime: 'audio/webm',
    };

    await expect(SttGateway.transcribe(audio)).rejects.toThrow(SttUnavailableError);
  });

  it('should successfully normalize and allow audio/webm;codecs=opus mime type', async () => {
    mockFetch.mockResolvedValue(createResponse({ text: 'Hello, testing codecs' }));

    const audio = {
      bytes: new Uint8Array([1, 2, 3]),
      filename: 'audio.webm',
      mime: 'audio/webm;codecs=opus',
    };

    const result = await SttGateway.transcribe(audio, 'en');
    expect(result.transcript).toBe('Hello, testing codecs');
    expect(result.provider).toBe('groq');

    // Fetch should have been called with Groq endpoint
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, config] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.groq.com/openai/v1/audio/transcriptions');
    expect(config.method).toBe('POST');

    // Regression guard for Findings 3.1/3.2: the file uploaded to Groq must carry the BARE
    // content type (no `;codecs=opus`), otherwise Groq 400s and we surface a 502.
    const sentFile = (config.body as FormData).get('file') as File;
    expect(sentFile.type).toBe('audio/webm');
  });

  it('should reject unsupported MIME types', async () => {
    const audio = {
      bytes: new Uint8Array([1, 2, 3]),
      filename: 'audio.mp3',
      mime: 'audio/mp3', // Allowed list is webm, ogg, wav, mp4, mpeg
    };

    await expect(SttGateway.transcribe(audio)).rejects.toThrow(/not allowed/);
  });
});
