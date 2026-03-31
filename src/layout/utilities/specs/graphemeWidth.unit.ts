import {describe, it, expect} from 'vitest';

import {graphemeWidth} from '../graphemeWidth';

describe('graphemeWidth', () => {
  describe('empty input', () => {
    it('returns 0 for an empty string', () => {
      expect(graphemeWidth('')).toBe(0);
    });
  });

  describe('ASCII fast path', () => {
    it('returns 1 for a single printable ASCII character', () => {
      expect(graphemeWidth('a')).toBe(1);
    });

    it('returns 1 for a space', () => {
      expect(graphemeWidth(' ')).toBe(1);
    });

    it('returns 1 for tilde (upper bound of printable ASCII)', () => {
      expect(graphemeWidth('~')).toBe(1);
    });

    it('returns 1 for punctuation', () => {
      expect(graphemeWidth('!')).toBe(1);
    });
  });

  describe('CJK characters', () => {
    it('measures a CJK ideograph as 2 cells', () => {
      // U+4E2D (中)
      expect(graphemeWidth('中')).toBe(2);
    });

    it('measures a Japanese katakana as 2 cells', () => {
      // U+30AB (カ)
      expect(graphemeWidth('カ')).toBe(2);
    });

    it('measures a Korean syllable as 2 cells', () => {
      // U+D55C (한)
      expect(graphemeWidth('한')).toBe(2);
    });

    it('measures fullwidth ideographic space as 2 cells', () => {
      // U+3000 (ideographic space)
      expect(graphemeWidth('\u3000')).toBe(2);
    });
  });

  describe('emoji', () => {
    it('measures a simple emoji as 2 cells', () => {
      // U+1F600 (grinning face)
      expect(graphemeWidth('😀')).toBe(2);
    });

    it('measures a flag emoji as 2 cells', () => {
      // U+1F1FA U+1F1F8 (US flag)
      expect(graphemeWidth('🇺🇸')).toBe(2);
    });

    it('measures a family ZWJ sequence as 2 cells', () => {
      // Family emoji (man + ZWJ + woman + ZWJ + girl + ZWJ + boy)
      expect(graphemeWidth('👨‍👩‍👧‍👦')).toBe(2);
    });

    it('measures a skin tone modifier emoji as 2 cells', () => {
      // U+1F44B U+1F3FD (waving hand, medium skin tone)
      expect(graphemeWidth('👋🏽')).toBe(2);
    });
  });

  describe('combining characters', () => {
    it('measures a base + combining accent as 1 cell', () => {
      // 'e' + combining acute accent (U+0301)
      expect(graphemeWidth('e\u0301')).toBe(1);
    });

    it('measures a standalone combining mark as 0 cells', () => {
      // Combining acute accent alone
      expect(graphemeWidth('\u0301')).toBe(0);
    });

    it('measures multiple combining marks on one base as 1 cell', () => {
      // 'a' + combining tilde (U+0303) + combining acute (U+0301)
      expect(graphemeWidth('a\u0303\u0301')).toBe(1);
    });
  });

  describe('zero-width characters', () => {
    it('measures zero-width space as 0 cells', () => {
      // U+200B (zero-width space)
      expect(graphemeWidth('\u200B')).toBe(0);
    });

    it('measures zero-width non-joiner as 0 cells', () => {
      // U+200C (zero-width non-joiner)
      expect(graphemeWidth('\u200C')).toBe(0);
    });

    it('measures soft hyphen as 0 cells', () => {
      // U+00AD (soft hyphen)
      expect(graphemeWidth('\u00AD')).toBe(0);
    });
  });

  describe('control characters', () => {
    it('measures null as 0 cells', () => {
      expect(graphemeWidth('\0')).toBe(0);
    });

    it('measures tab as 0 cells', () => {
      expect(graphemeWidth('\t')).toBe(0);
    });
  });

  describe('fullwidth forms', () => {
    it('measures fullwidth Latin as 2 cells', () => {
      // U+FF21 (Ａ)
      expect(graphemeWidth('\uFF21')).toBe(2);
    });
  });
});
