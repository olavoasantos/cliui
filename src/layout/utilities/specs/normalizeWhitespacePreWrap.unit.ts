import {describe, it, expect} from 'vitest';

import {normalizeWhitespacePreWrap} from '../normalizeWhitespacePreWrap';

describe('normalizeWhitespacePreWrap', () => {
  it('returns the same string when no normalization is needed', () => {
    expect(normalizeWhitespacePreWrap('hello world')).toBe('hello world');
  });

  it('preserves ordinary spaces', () => {
    expect(normalizeWhitespacePreWrap('hello   world')).toBe('hello   world');
  });

  it('preserves tabs', () => {
    expect(normalizeWhitespacePreWrap('hello\tworld')).toBe('hello\tworld');
  });

  it('preserves newlines', () => {
    expect(normalizeWhitespacePreWrap('hello\nworld')).toBe('hello\nworld');
  });

  it('normalizes CRLF to LF', () => {
    expect(normalizeWhitespacePreWrap('hello\r\nworld')).toBe('hello\nworld');
  });

  it('normalizes standalone CR to LF', () => {
    expect(normalizeWhitespacePreWrap('hello\rworld')).toBe('hello\nworld');
  });

  it('normalizes form feed to LF', () => {
    expect(normalizeWhitespacePreWrap('hello\fworld')).toBe('hello\nworld');
  });

  it('handles empty string', () => {
    expect(normalizeWhitespacePreWrap('')).toBe('');
  });
});
