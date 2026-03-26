import {describe, expect, it} from 'vitest';

import {ZeroWidthClusterGuard} from '../ZeroWidthClusterGuard';

describe('ZeroWidthClusterGuard', () => {
  it('returns true for zero-width joiner', () => {
    expect(ZeroWidthClusterGuard('\u200D')).toBe(true);
  });

  it('returns true for variation selectors', () => {
    expect(ZeroWidthClusterGuard('\uFE0F')).toBe(true);
  });

  it('returns true for combining marks', () => {
    expect(ZeroWidthClusterGuard('\u0301')).toBe(true);
  });

  it('returns false for printable ASCII', () => {
    expect(ZeroWidthClusterGuard('A')).toBe(false);
  });

  it('returns false for CJK ideographs', () => {
    expect(ZeroWidthClusterGuard('中')).toBe(false);
  });

  it('returns false for emoji with presentation', () => {
    expect(ZeroWidthClusterGuard('😀')).toBe(false);
  });
});
