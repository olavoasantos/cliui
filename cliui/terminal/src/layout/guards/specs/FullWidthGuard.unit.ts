import {describe, expect, it} from 'vitest';

import {FullWidthGuard} from '../FullWidthGuard';

describe('FullWidthGuard', () => {
  it('returns true for fullwidth Latin letters', () => {
    expect(FullWidthGuard('Ａ'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for fullwidth digits', () => {
    expect(FullWidthGuard('１'.codePointAt(0)!)).toBe(true);
  });

  it('returns false for halfwidth characters', () => {
    expect(FullWidthGuard('ｶ'.codePointAt(0)!)).toBe(false);
  });

  it('returns false for regular ASCII characters', () => {
    expect(FullWidthGuard('A'.codePointAt(0)!)).toBe(false);
  });

  it('returns false for CJK ideographs that are wide but not fullwidth', () => {
    expect(FullWidthGuard('中'.codePointAt(0)!)).toBe(false);
  });
});
