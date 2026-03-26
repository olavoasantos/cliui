import {describe, expect, it} from 'vitest';

import {FullWidthOrWideGuard} from '../FullWidthOrWideGuard';

describe('FullWidthOrWideGuard', () => {
  it('returns true for fullwidth characters', () => {
    expect(FullWidthOrWideGuard('Ａ'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for wide characters', () => {
    expect(FullWidthOrWideGuard('中'.codePointAt(0)!)).toBe(true);
  });

  it('returns false for ASCII characters', () => {
    expect(FullWidthOrWideGuard('A'.codePointAt(0)!)).toBe(false);
  });

  it('returns false for narrow characters', () => {
    expect(FullWidthOrWideGuard('é'.codePointAt(0)!)).toBe(false);
  });
});
