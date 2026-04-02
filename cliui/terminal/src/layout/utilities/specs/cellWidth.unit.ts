import {describe, it, expect} from 'vitest';

import {cellWidth} from '../cellWidth';

describe('cellWidth', () => {
  describe('ASCII text', () => {
    it('returns 0 for an empty string', () => {
      expect(cellWidth('')).toBe(0);
    });

    it('measures printable ASCII as 1 cell per character', () => {
      expect(cellWidth('hello')).toBe(5);
    });

    it('measures spaces as 1 cell each', () => {
      expect(cellWidth('a b c')).toBe(5);
    });

    it('measures punctuation as 1 cell each', () => {
      expect(cellWidth('!@#$%')).toBe(5);
    });
  });

  describe('CJK characters', () => {
    it('measures CJK ideographs as 2 cells each', () => {
      // U+4E2D (中), U+6587 (文)
      expect(cellWidth('中文')).toBe(4);
    });

    it('measures Japanese katakana as 2 cells each', () => {
      // U+30AB (カ), U+30BF (タ), U+30AB (カ), U+30CA (ナ)
      expect(cellWidth('カタカナ')).toBe(8);
    });

    it('measures Korean syllables as 2 cells each', () => {
      // U+D55C (한), U+AE00 (글)
      expect(cellWidth('한글')).toBe(4);
    });

    it('measures fullwidth ideographic space as 2 cells', () => {
      // U+3000 (ideographic space)
      expect(cellWidth('\u3000')).toBe(2);
    });
  });

  describe('emoji', () => {
    it('measures simple emoji as 2 cells', () => {
      // U+1F600 (grinning face)
      expect(cellWidth('😀')).toBe(2);
    });

    it('measures flag emoji as 2 cells', () => {
      // U+1F1FA U+1F1F8 (US flag)
      expect(cellWidth('🇺🇸')).toBe(2);
    });

    it('measures family ZWJ sequence as 2 cells', () => {
      // Family emoji (man + ZWJ + woman + ZWJ + girl + ZWJ + boy)
      expect(cellWidth('👨‍👩‍👧‍👦')).toBe(2);
    });

    it('measures skin tone modifier emoji as 2 cells', () => {
      // U+1F44B U+1F3FD (waving hand, medium skin tone)
      expect(cellWidth('👋🏽')).toBe(2);
    });
  });

  describe('combining characters', () => {
    it('measures base + combining accent as 1 cell', () => {
      // 'e' + combining acute accent (U+0301)
      expect(cellWidth('e\u0301')).toBe(1);
    });

    it('measures standalone combining marks as 0 cells', () => {
      // Combining acute accent alone
      expect(cellWidth('\u0301')).toBe(0);
    });

    it('measures multiple combining marks on one base as 1 cell', () => {
      // 'a' + combining tilde (U+0303) + combining acute (U+0301)
      expect(cellWidth('a\u0303\u0301')).toBe(1);
    });
  });

  describe('zero-width characters', () => {
    it('measures zero-width space as 0 cells', () => {
      // U+200B (zero-width space)
      expect(cellWidth('\u200B')).toBe(0);
    });

    it('measures zero-width non-joiner as 0 cells', () => {
      // U+200C (zero-width non-joiner)
      expect(cellWidth('\u200C')).toBe(0);
    });

    it('measures soft hyphen as 0 cells', () => {
      // U+00AD (soft hyphen)
      expect(cellWidth('\u00AD')).toBe(0);
    });
  });

  describe('mixed strings', () => {
    it('measures ASCII mixed with CJK', () => {
      // "a" (1) + "中" (2) + "b" (1) = 4
      expect(cellWidth('a中b')).toBe(4);
    });

    it('measures ASCII mixed with emoji', () => {
      // "hi" (2) + "😀" (2) = 4
      expect(cellWidth('hi😀')).toBe(4);
    });

    it('measures CJK mixed with emoji', () => {
      // "中" (2) + "😀" (2) + "文" (2) = 6
      expect(cellWidth('中😀文')).toBe(6);
    });

    it('measures a complex mixed string', () => {
      // "Hello" (5) + "中文" (4) + "😀" (2) = 11
      expect(cellWidth('Hello中文😀')).toBe(11);
    });
  });

  describe('ANSI escape sequences', () => {
    it('ignores ANSI color codes', () => {
      // "\x1b[31m" red + "hello" + "\x1b[0m" reset = 5
      expect(cellWidth('\u001B[31mhello\u001B[0m')).toBe(5);
    });

    it('ignores ANSI escape codes with CJK', () => {
      // "\x1b[1m" bold + "中文" + "\x1b[0m" reset = 4
      expect(cellWidth('\u001B[1m中文\u001B[0m')).toBe(4);
    });

    it('returns 0 for a string containing only ANSI codes', () => {
      expect(cellWidth('\u001B[31m\u001B[0m')).toBe(0);
    });
  });

  describe('control characters', () => {
    it('measures null as 0 cells', () => {
      expect(cellWidth('\0')).toBe(0);
    });

    it('measures tab as 0 cells', () => {
      expect(cellWidth('\t')).toBe(0);
    });
  });

  describe('fullwidth forms', () => {
    it('measures fullwidth Latin as 2 cells each', () => {
      // U+FF21 (Ａ), U+FF22 (Ｂ)
      expect(cellWidth('\uFF21\uFF22')).toBe(4);
    });
  });
});
