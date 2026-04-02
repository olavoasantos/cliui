import {describe, expect, it} from 'vitest';

import {computeVisualLines} from '../computeVisualLines';

function g(text: string): string[] {
  return [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(text)].map(
    (s) => s.segment,
  );
}

describe('computeVisualLines', () => {
  it('returns a single empty line for empty input', () => {
    expect(computeVisualLines([], 20, false)).toEqual([{start: 0, end: 0, width: 0}]);
  });

  it('returns a single line for text shorter than viewport', () => {
    const result = computeVisualLines(g('hello'), 20, false);

    expect(result).toEqual([{start: 0, end: 5, width: 5}]);
  });

  it('splits on explicit newlines', () => {
    const result = computeVisualLines(g('ab\ncd\nef'), 20, false);

    expect(result).toEqual([
      {start: 0, end: 2, width: 2},
      {start: 3, end: 5, width: 2},
      {start: 6, end: 8, width: 2},
    ]);
  });

  it('produces an empty trailing line after a trailing newline', () => {
    const result = computeVisualLines(g('ab\n'), 20, false);

    expect(result).toEqual([
      {start: 0, end: 2, width: 2},
      {start: 3, end: 3, width: 0},
    ]);
  });

  it('handles consecutive newlines', () => {
    const result = computeVisualLines(g('a\n\nb'), 20, false);

    expect(result).toEqual([
      {start: 0, end: 1, width: 1},
      {start: 2, end: 2, width: 0},
      {start: 3, end: 4, width: 1},
    ]);
  });

  it('wraps long lines when wordWrap is true', () => {
    const result = computeVisualLines(g('abcdef'), 4, true);

    expect(result).toEqual([
      {start: 0, end: 4, width: 4},
      {start: 4, end: 6, width: 2},
    ]);
  });

  it('does not wrap when wordWrap is false', () => {
    const result = computeVisualLines(g('abcdef'), 4, false);

    expect(result).toEqual([{start: 0, end: 6, width: 6}]);
  });

  it('wraps wide characters correctly', () => {
    // CJK characters are 2 cells wide each
    const result = computeVisualLines(g('你好世界'), 5, true);

    // 你(2) + 好(2) = 4, fits in 5
    // 世(2) + 界(2) = 4, fits in 5
    expect(result).toEqual([
      {start: 0, end: 2, width: 4},
      {start: 2, end: 4, width: 4},
    ]);
  });

  it('wraps a wide character that does not fit on the current line', () => {
    // 'ab' = 2 cells, then '你' = 2 cells, total 4 fits in 4
    // 'c' = 1 cell, then '好' = 2 cells, total 3 fits in 4
    const result = computeVisualLines(g('ab你c好'), 4, true);

    expect(result).toEqual([
      {start: 0, end: 3, width: 4},
      {start: 3, end: 5, width: 3},
    ]);
  });

  it('combines newlines and wrapping', () => {
    const result = computeVisualLines(g('abcd\nefghij'), 4, true);

    expect(result).toEqual([
      {start: 0, end: 4, width: 4},
      {start: 5, end: 9, width: 4},
      {start: 9, end: 11, width: 2},
    ]);
  });

  it('handles a single newline', () => {
    const result = computeVisualLines(g('\n'), 20, false);

    expect(result).toEqual([
      {start: 0, end: 0, width: 0},
      {start: 1, end: 1, width: 0},
    ]);
  });

  it('handles a single character', () => {
    const result = computeVisualLines(g('x'), 20, false);

    expect(result).toEqual([{start: 0, end: 1, width: 1}]);
  });
});
