import {describe, it, expect} from 'vitest';

import {TextLayout} from '../TextLayout';

describe('TextLayout', () => {
  const layout = new TextLayout();

  describe('empty and whitespace-only text', () => {
    it('returns no lines for an empty string', () => {
      const lines = layout.measure('', 80);

      expect(lines).toEqual([]);
    });

    it('returns no lines for whitespace-only text', () => {
      const lines = layout.measure('   ', 80);

      expect(lines).toEqual([]);
    });
  });

  describe('single-line text', () => {
    it('returns one line when text fits within available width', () => {
      const lines = layout.measure('hello world', 80);

      expect(lines).toEqual([{text: 'hello world', width: 11}]);
    });

    it('returns one line when text exactly matches available width', () => {
      const lines = layout.measure('hello', 5);

      expect(lines).toEqual([{text: 'hello', width: 5}]);
    });

    it('collapses consecutive whitespace', () => {
      const lines = layout.measure('hello   world', 80);

      expect(lines).toEqual([{text: 'hello world', width: 11}]);
    });

    it('trims leading and trailing whitespace', () => {
      const lines = layout.measure('  hello world  ', 80);

      expect(lines).toEqual([{text: 'hello world', width: 11}]);
    });
  });

  describe('word wrapping', () => {
    it('wraps text at word boundaries when it exceeds available width', () => {
      const lines = layout.measure('hello world', 5);

      expect(lines).toEqual([
        {text: 'hello', width: 5},
        {text: 'world', width: 5},
      ]);
    });

    it('wraps multiple words across several lines', () => {
      const lines = layout.measure('the quick brown fox', 10);

      expect(lines).toEqual([
        {text: 'the quick', width: 9},
        {text: 'brown fox', width: 9},
      ]);
    });

    it('handles single-character available width', () => {
      const lines = layout.measure('ab', 1);

      expect(lines).toEqual([
        {text: 'a', width: 1},
        {text: 'b', width: 1},
      ]);
    });

    it('wraps when a word exactly fills the remaining space', () => {
      // "hi bye" width 5: "hi" (2) + space (1) + "by" won't fit with "bye" (3) = 6 > 5
      const lines = layout.measure('hi bye', 5);

      expect(lines).toEqual([
        {text: 'hi', width: 2},
        {text: 'bye', width: 3},
      ]);
    });

    it('places word on current line when space + word fits exactly', () => {
      // "ab cde" at width 6: "ab" (2) + " " (1) + "cde" (3) = 6
      const lines = layout.measure('ab cde', 6);

      expect(lines).toEqual([{text: 'ab cde', width: 6}]);
    });
  });

  describe('long words (wider than available width)', () => {
    it('breaks a single long word at grapheme boundaries', () => {
      const lines = layout.measure('abcdef', 3);

      expect(lines).toEqual([
        {text: 'abc', width: 3},
        {text: 'def', width: 3},
      ]);
    });

    it('breaks a long word and continues accumulating shorter words', () => {
      const lines = layout.measure('abcdefgh hi', 4);

      expect(lines).toEqual([
        {text: 'abcd', width: 4},
        {text: 'efgh', width: 4},
        {text: 'hi', width: 2},
      ]);
    });

    it('breaks a long word that appears after shorter words', () => {
      const lines = layout.measure('hi abcdef', 4);

      expect(lines).toEqual([
        {text: 'hi', width: 2},
        {text: 'abcd', width: 4},
        {text: 'ef', width: 2},
      ]);
    });
  });

  describe('wide characters (CJK, emoji)', () => {
    it('measures CJK characters as 2 cells each', () => {
      const lines = layout.measure('中文', 80);

      expect(lines).toEqual([{text: '中文', width: 4}]);
    });

    it('wraps CJK text when it exceeds available width', () => {
      // Each CJK character is 2 cells wide
      const lines = layout.measure('中文字体', 5);

      expect(lines).toEqual([
        {text: '中文', width: 4},
        {text: '字体', width: 4},
      ]);
    });

    it('breaks a CJK word at the boundary when it cannot fit', () => {
      // "中文字" is 6 cells wide, available width is 4
      const lines = layout.measure('中文字', 4);

      expect(lines).toEqual([
        {text: '中文', width: 4},
        {text: '字', width: 2},
      ]);
    });

    it('handles mixed ASCII and CJK text', () => {
      const lines = layout.measure('hi 中文', 6);

      expect(lines).toEqual([
        {text: 'hi', width: 2},
        {text: '中文', width: 4},
      ]);
    });

    it('handles emoji characters (2 cells wide)', () => {
      // Emoji with VS16 are 2 cells
      const lines = layout.measure('a 😀', 80);

      expect(lines).toHaveLength(1);
      expect(lines[0]!.text).toBe('a 😀');
    });

    it('wraps when an emoji would exceed available width', () => {
      // 😀 is 2 cells, available width 3, "ab" is 2 cells
      const lines = layout.measure('ab 😀', 3);

      expect(lines).toEqual([
        {text: 'ab', width: 2},
        {text: '😀', width: 2},
      ]);
    });
  });

  describe('additional white-space modes', () => {
    it('keeps text on one line for nowrap', () => {
      const lines = layout.measure('hello world', 5, {whiteSpace: 'nowrap'});

      expect(lines).toEqual([{text: 'hello', width: 5}]);
    });

    it('adds an ellipsis for nowrap overflow when requested', () => {
      const lines = layout.measure('hello world', 5, {
        whiteSpace: 'nowrap',
        textOverflow: 'ellipsis',
      });

      expect(lines).toEqual([{text: 'hell…', width: 5}]);
    });
  });

  describe('trailing whitespace hanging', () => {
    it('does not break when trailing space would hang past the line edge', () => {
      const lines = layout.measure('Hello world', 5);

      expect(lines).toEqual([
        {text: 'Hello', width: 5},
        {text: 'world', width: 5},
      ]);
    });

    it('trailing space after last word does not add to reported width', () => {
      const lines = layout.measure('Hello ', 5);

      expect(lines).toEqual([{text: 'Hello', width: 5}]);
    });

    it('space between words does not count toward line width for break decisions', () => {
      const lines = layout.measure('ab cd', 5);

      expect(lines).toEqual([{text: 'ab cd', width: 5}]);
    });
  });

  describe('overflow-wrap and word-break', () => {
    it('breaks long words by default (overflow-wrap: break-word)', () => {
      const lines = layout.measure('abcdef', 3);

      expect(lines).toEqual([
        {text: 'abc', width: 3},
        {text: 'def', width: 3},
      ]);
    });

    it('does not break long words when overflow-wrap is normal', () => {
      const lines = layout.measure('abcdef', 3, {overflowWrap: 'normal'});

      expect(lines).toEqual([{text: 'abcdef', width: 6}]);
    });

    it('overflow-wrap: normal still wraps at word boundaries', () => {
      const lines = layout.measure('hi bye now', 5, {overflowWrap: 'normal'});

      expect(lines).toEqual([
        {text: 'hi', width: 2},
        {text: 'bye', width: 3},
        {text: 'now', width: 3},
      ]);
    });
  });

  describe('white-space modes', () => {
    it('preserves spaces and newlines for pre', () => {
      const lines = layout.measure('a  b\n c', 10, {whiteSpace: 'pre'});

      expect(lines).toEqual([
        {text: 'a  b', width: 4},
        {text: ' c', width: 2},
      ]);
    });

    it('preserves spaces while wrapping for pre-wrap', () => {
      const lines = layout.measure('a  b c', 4, {whiteSpace: 'pre-wrap'});

      expect(lines).toEqual([
        {text: 'a  b', width: 4},
        {text: ' c', width: 2},
      ]);
    });
  });

  describe('pre-wrap tab stops', () => {
    it('advances tab to the next tab stop (default tab-size 8)', () => {
      const lines = layout.measure('a\tb', 80, {whiteSpace: 'pre-wrap'});

      // 'a'=1, tab to col 8 (7 cells advance), 'b' at col 8
      expect(lines).toHaveLength(1);
      expect(lines[0]!.width).toBe(9);
    });

    it('consecutive tabs advance to successive tab stops', () => {
      const lines = layout.measure('a\t\tb', 80, {whiteSpace: 'pre-wrap'});

      // 'a'=1 → tab to 8 → tab to 16 → 'b' at 17
      expect(lines).toHaveLength(1);
      expect(lines[0]!.width).toBe(17);
    });

    it('tab stops restart after hard breaks', () => {
      const lines = layout.measure('a\tb\n\tc', 80, {whiteSpace: 'pre-wrap'});

      expect(lines).toHaveLength(2);
      expect(lines[0]!.width).toBe(9);
      expect(lines[1]!.width).toBe(9);
    });

    it('respects custom tab-size', () => {
      const lines = layout.measure('a\tb', 80, {whiteSpace: 'pre-wrap', tabSize: 4});

      // 'a'=1, tab to col 4 (3 cells advance), 'b' → width 5
      expect(lines).toHaveLength(1);
      expect(lines[0]!.width).toBe(5);
    });

    it('tab at the start of a line advances to the first tab stop', () => {
      const lines = layout.measure('\tb', 80, {whiteSpace: 'pre-wrap'});

      expect(lines).toHaveLength(1);
      expect(lines[0]!.width).toBe(9);
    });
  });

  describe('edge cases', () => {
    it('handles a single character', () => {
      const lines = layout.measure('x', 80);

      expect(lines).toEqual([{text: 'x', width: 1}]);
    });

    it('handles tabs and newlines as whitespace (collapsed)', () => {
      const lines = layout.measure('hello\tworld\nfoo', 80);

      expect(lines).toEqual([{text: 'hello world foo', width: 15}]);
    });

    it('clamps available width to minimum of 1', () => {
      const lines = layout.measure('ab', 0);

      expect(lines).toEqual([
        {text: 'a', width: 1},
        {text: 'b', width: 1},
      ]);
    });
  });
});
