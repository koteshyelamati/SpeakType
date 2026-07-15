import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readMultipartFormData, getRequestHeader } from 'h3';
import type { H3Event } from 'h3';
import { SttGateway } from '~/server/services/stt';
import { QuotaService } from '~/server/services/quota';
import { MAX_AUDIO_BYTES } from '@speaktype/shared';
import audioPostHandler from '../audio.post';

// Mock H3 framework utilities
vi.mock('h3', () => ({
  defineEventHandler: (handler: unknown) => handler,
  readMultipartFormData: vi.fn(),
  getRequestHeader: vi.fn(),
}));

// Mock responder utilities
vi.mock('~/server/utils/respond', () => ({
  getAuth: vi.fn(() => ({ userId: 'user-id-test' })),
  fail: vi.fn((event: unknown, status: number, message: string, code?: string) => ({
    error: true,
    status,
    message,
    code,
  })),
}));

// Mock STT Gateway
vi.mock('~/server/services/stt', () => {
  class SttUnavailableError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'SttUnavailableError';
    }
  }
  return {
    SttGateway: {
      transcribe: vi.fn(),
    },
    SttUnavailableError,
  };
});

// Mock Quota Service
vi.mock('~/server/services/quota', () => ({
  QuotaService: {
    recordUsage: vi.fn(),
  },
}));

// Mock database
vi.mock('~/server/db', () => ({
  db: {
    insert: vi.fn(() => ({
      values: vi.fn().mockResolvedValue({}),
    })),
  },
  auditLogs: {},
}));

describe('audio.post.ts API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 413 Payload Too Large if Content-Length header exceeds limit', async () => {
    // Mock getRequestHeader to return a large size
    vi.mocked(getRequestHeader).mockReturnValue((MAX_AUDIO_BYTES + 100).toString());

    const result = await audioPostHandler({} as unknown as H3Event);

    expect(result).toEqual(
      expect.objectContaining({
        error: true,
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
      }),
    );
  });

  it('should return 400 Bad Request if multipart form-data is missing', async () => {
    vi.mocked(getRequestHeader).mockReturnValue('5000');
    vi.mocked(readMultipartFormData).mockResolvedValue(undefined);

    const result = await audioPostHandler({} as unknown as H3Event);

    expect(result).toEqual(
      expect.objectContaining({
        error: true,
        status: 400,
        code: 'BAD_REQUEST',
      }),
    );
  });

  it('should return 400 if forbidden mime type is uploaded', async () => {
    vi.mocked(getRequestHeader).mockReturnValue('5000');

    const mockMultipart = [
      {
        name: 'audio',
        data: Buffer.from('mock-audio-data'),
        filename: 'image.png',
        type: 'image/png', // forbidden mime-type
      },
      {
        name: 'durationSeconds',
        data: Buffer.from('10'),
      },
    ];
    vi.mocked(readMultipartFormData).mockResolvedValue(mockMultipart);

    const result = await audioPostHandler({} as unknown as H3Event);

    expect(result).toEqual(
      expect.objectContaining({
        error: true,
        status: 400,
        code: 'INVALID_MIME_TYPE',
      }),
    );
  });

  it('should accept base audio/webm and parse it successfully if codec is included', async () => {
    vi.mocked(getRequestHeader).mockReturnValue('5000');

    const mockMultipart = [
      {
        name: 'audio',
        data: Buffer.from('webm-audio-bytes'),
        filename: 'audio.webm',
        type: 'audio/webm;codecs=opus', // Has codec parameter
      },
      {
        name: 'durationSeconds',
        data: Buffer.from('5'),
      },
    ];
    vi.mocked(readMultipartFormData).mockResolvedValue(mockMultipart);

    // Mock successful transcription
    vi.mocked(SttGateway.transcribe).mockResolvedValue({
      transcript: 'Successfully transcribed codec audio',
      provider: 'groq',
    });

    const result = await audioPostHandler({} as unknown as H3Event);

    expect(result).toEqual(
      expect.objectContaining({
        transcript: 'Successfully transcribed codec audio',
        provider: 'groq',
        durationSeconds: 5,
      }),
    );

    // Verify STT Gateway transcribe received the full original MIME with codec details
    expect(SttGateway.transcribe).toHaveBeenCalledWith(
      expect.objectContaining({
        mime: 'audio/webm;codecs=opus',
      }),
      undefined,
    );

    // Verify Quota was debited
    expect(QuotaService.recordUsage).toHaveBeenCalledWith('user-id-test', 5, 'groq');
  });
});
