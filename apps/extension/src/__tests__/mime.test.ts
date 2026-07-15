import { describe, it, expect } from 'vitest';

/**
 * MIME normalization function mimicking the core validation logic used
 * by the STT gateways and routes to prevent exact-match failures when
 * browsers upload recordings containing codec parameters.
 */
function normalizeMimeType(mimeType: string): string {
  return (mimeType.split(';')[0] ?? '').trim().toLowerCase();
}

describe('MIME Type Normalization Helper', () => {
  it('should normalize WebM with codecs to bare audio/webm', () => {
    const input = 'audio/webm;codecs=opus';
    const expected = 'audio/webm';
    expect(normalizeMimeType(input)).toBe(expected);
  });

  it('should normalize Ogg with codecs to bare audio/ogg', () => {
    const input = 'audio/ogg;codecs=opus';
    const expected = 'audio/ogg';
    expect(normalizeMimeType(input)).toBe(expected);
  });

  it('should preserve already normalized base type audio/webm', () => {
    const input = 'audio/webm';
    const expected = 'audio/webm';
    expect(normalizeMimeType(input)).toBe(expected);
  });

  it('should trim surrounding whitespaces and ignore case variations', () => {
    const input = '  AUDIO/WebM; codecs=opus  ';
    const expected = 'audio/webm';
    expect(normalizeMimeType(input)).toBe(expected);
  });

  it('should return empty string for empty inputs', () => {
    expect(normalizeMimeType('')).toBe('');
  });
});
