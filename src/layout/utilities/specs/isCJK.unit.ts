import {describe, it, expect} from 'vitest';

import {isCJK} from '../isCJK';

describe('isCJK', () => {
  it('returns true for CJK Unified Ideographs', () => {
    expect(isCJK('中')).toBe(true);
  });

  it('returns true for Hiragana', () => {
    expect(isCJK('あ')).toBe(true);
  });

  it('returns true for Katakana', () => {
    expect(isCJK('ア')).toBe(true);
  });

  it('returns true for Hangul Syllables', () => {
    expect(isCJK('한')).toBe(true);
  });

  it('returns true for astral CJK ideographs', () => {
    expect(isCJK('𠀀')).toBe(true);
  });

  it('returns false for ASCII text', () => {
    expect(isCJK('hello')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isCJK('')).toBe(false);
  });

  it('returns true for mixed text containing CJK', () => {
    expect(isCJK('hello 中文')).toBe(true);
  });
});
