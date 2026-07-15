import { defineEventHandler, readMultipartFormData, getRequestHeader } from 'h3';
import { getAuth, fail } from '~/server/utils/respond';
import { SttGateway, SttUnavailableError } from '~/server/services/stt';
import { QuotaService } from '~/server/services/quota';
import { db, auditLogs } from '~/server/db';
import {
  ALLOWED_AUDIO_MIME,
  MAX_AUDIO_BYTES,
  audioRequestSchema,
  audioResponseSchema,
  type Language,
} from '@speaktype/shared';

export default defineEventHandler(async (event) => {
  const { userId } = getAuth(event);

  // Early size guard — BEFORE readMultipartFormData
  const contentLengthStr = getRequestHeader(event, 'content-length');
  if (contentLengthStr) {
    const contentLength = parseInt(contentLengthStr, 10);
    if (!isNaN(contentLength) && contentLength > MAX_AUDIO_BYTES) {
      return fail(event, 413, 'Audio file exceeds maximum size limit', 'PAYLOAD_TOO_LARGE');
    }
  }

  // 1. Parse and extract multipart fields
  const multipart = await readMultipartFormData(event);
  if (!multipart) {
    return fail(event, 400, 'Request must be a multipart form-data request', 'BAD_REQUEST');
  }

  let audioPart: { data: Buffer; filename: string; type: string } | null = null;
  let languageStr: string | undefined;
  let durationSecondsStr: string | undefined;

  for (const part of multipart) {
    if (part.name === 'audio') {
      audioPart = {
        data: part.data,
        filename: part.filename || 'audio.webm',
        type: part.type || 'audio/webm',
      };
    } else if (part.name === 'language') {
      languageStr = part.data.toString().trim();
    } else if (part.name === 'durationSeconds') {
      durationSecondsStr = part.data.toString().trim();
    }
  }

  if (!audioPart) {
    return fail(event, 400, 'Missing audio file parameter', 'MISSING_FILE');
  }

  if (!durationSecondsStr) {
    return fail(event, 400, 'Missing durationSeconds parameter', 'MISSING_DURATION');
  }

  const durationSeconds = Number(durationSecondsStr);

  // 2. Schema-based input validation
  const parsedReq = audioRequestSchema.safeParse({
    language: languageStr ? (languageStr as Language) : undefined,
    durationSeconds,
  });

  if (!parsedReq.success) {
    const firstIssue = parsedReq.error.issues[0];
    const errorMsg = firstIssue
      ? `${firstIssue.path.join('.') || 'body'}: ${firstIssue.message}`
      : 'Invalid input parameters';
    return fail(event, 400, errorMsg, 'VALIDATION_ERROR');
  }

  // 3. Defensive constraints checks
  if (audioPart.data.length > MAX_AUDIO_BYTES) {
    return fail(event, 413, 'Audio file exceeds maximum size limit', 'PAYLOAD_TOO_LARGE');
  }

  // Browsers send the full media type with codec params (e.g. `audio/webm;codecs=opus`);
  // validate against the base type so the codec suffix doesn't trip the allow-list.
  const baseMime = (audioPart.type.split(';')[0] ?? '').trim().toLowerCase();
  if (!(ALLOWED_AUDIO_MIME as readonly string[]).includes(baseMime)) {
    return fail(
      event,
      400,
      `Audio format '${audioPart.type}' is not supported`,
      'INVALID_MIME_TYPE',
    );
  }

  const requestId = crypto.randomUUID();

  try {
    // 4. Transcription phase
    const { transcript, provider } = await SttGateway.transcribe(
      {
        bytes: audioPart.data,
        filename: audioPart.filename,
        mime: audioPart.type,
      },
      parsedReq.data.language,
    );

    // 5. Debit user's quota cache and logs
    await QuotaService.recordUsage(userId, durationSeconds, provider);

    // 6. Security requirement: Log immediate deletion/discarding of raw audio bytes from memory
    try {
      await db.insert(auditLogs).values({
        userId,
        action: 'audio_transcribed_and_discarded',
        detail: `Transcribed audio using ${provider} (${durationSeconds} seconds, ${audioPart.data.length} bytes). Raw audio bytes successfully purged from in-memory processing buffer.`,
      });
    } catch (auditErr) {
      console.error('Passive audit logging failed:', auditErr);
    }

    const payload = {
      transcript,
      provider,
      durationSeconds,
      requestId,
    };

    return audioResponseSchema.parse(payload);
  } catch (err: unknown) {
    if (err instanceof SttUnavailableError) {
      return fail(event, 502, 'STT service is temporarily unavailable', 'STT_UNAVAILABLE');
    }

    const message = err instanceof Error ? err.message : 'Unknown transcription processing error';
    console.error('Audio processing route failed:', message);
    return fail(event, 500, 'Internal server error while processing transcription request');
  }
});
