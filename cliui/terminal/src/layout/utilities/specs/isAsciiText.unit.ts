import {describe, it, expect} from 'vitest';

import {isAsciiText} from '../isAsciiText';

describe('isAsciiText', () => {
  it('returns true for simple ASCII text', () => {
    expect(isAsciiText('hello world')).toBe(true);
  });

  it('returns true for printable ASCII with punctuation', () => {
    expect(isAsciiText('Hello, World! 123 #$%')).toBe(true);
  });

  it('returns true for empty string', () => {
    expect(isAsciiText('')).toBe(true);
  });

  it('returns true for single space', () => {
    expect(isAsciiText(' ')).toBe(true);
  });

  it('returns true for tilde (U+007E, upper bound)', () => {
    expect(isAsciiText('~')).toBe(true);
  });

  it('returns false for CJK characters', () => {
    expect(isAsciiText('hello 中文')).toBe(false);
  });

  it('returns false for emoji', () => {
    expect(isAsciiText('hello 😀')).toBe(false);
  });

  it('returns false for Arabic text', () => {
    expect(isAsciiText('مرحبا')).toBe(false);
  });

  it('returns false for tab character (below U+0020)', () => {
    expect(isAsciiText('hello\tworld')).toBe(false);
  });

  it('returns false for newline (below U+0020)', () => {
    expect(isAsciiText('hello\nworld')).toBe(false);
  });

  it('returns false for DEL (U+007F, above range)', () => {
    expect(isAsciiText('hello\x7Fworld')).toBe(false);
  });

  it('returns false for non-breaking space (U+00A0)', () => {
    expect(isAsciiText('10\u00A0000')).toBe(false);
  });

  it('returns false for accented Latin characters', () => {
    expect(isAsciiText('café')).toBe(false);
  });
});
