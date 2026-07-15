import { describe, it, expect } from 'vitest';

// Harness sanity check — confirms vitest + happy-dom run. Replaced/kept alongside
// the real unit tests.
describe('harness sanity', () => {
  it('runs arithmetic', () => {
    expect(1 + 1).toBe(2);
  });

  it('has a DOM (happy-dom)', () => {
    const el = document.createElement('input');
    el.value = 'hi';
    expect(el.value).toBe('hi');
  });
});
