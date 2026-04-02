import {describe, expect, it} from 'vitest';

import {WIDE_FAST_END, WIDE_FAST_START} from '../../constants/cellWidth';
import {WideGuard} from '../WideGuard';

describe('WideGuard', () => {
  it('returns true for CJK ideograph code points', () => {
    expect(WideGuard('中'.codePointAt(0)!)).toBe(true);
  });

  it('returns true for CJK compatibility ideograph code points', () => {
    expect(WideGuard('豈'.codePointAt(0)!)).toBe(true);
  });

  it('returns false for ASCII code points', () => {
    expect(WideGuard('A'.codePointAt(0)!)).toBe(false);
  });

  it('returns false for fullwidth code points', () => {
    expect(WideGuard('Ａ'.codePointAt(0)!)).toBe(false);
  });

  it('uses the fast path range for common CJK characters', () => {
    expect(WideGuard(WIDE_FAST_START)).toBe(true);
    expect(WideGuard(WIDE_FAST_END)).toBe(true);
  });
});
