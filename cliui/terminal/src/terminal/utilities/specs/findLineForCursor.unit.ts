import {describe, expect, it} from 'vitest';

import {computeVisualLines} from '../computeVisualLines';
import {findLineForCursor} from '../findLineForCursor';

function g(text: string): string[] {
  return [...new Intl.Segmenter('en', {granularity: 'grapheme'}).segment(text)].map(
    (s) => s.segment,
  );
}

describe('findLineForCursor', () => {
  it('finds the correct line for a cursor in the middle of content', () => {
    const graphemes = g('abc\ndef');
    const lines = computeVisualLines(graphemes, 20, false);

    expect(findLineForCursor(lines, 0, graphemes)).toBe(0);
    expect(findLineForCursor(lines, 2, graphemes)).toBe(0);
    expect(findLineForCursor(lines, 3, graphemes)).toBe(0); // after 'c', before \n
    expect(findLineForCursor(lines, 4, graphemes)).toBe(1); // 'd'
    expect(findLineForCursor(lines, 7, graphemes)).toBe(1); // end of content
  });

  it('handles cursor at the end of a newline-terminated line', () => {
    const graphemes = g('ab\ncd\nef');
    const lines = computeVisualLines(graphemes, 20, false);

    // Position 2 is after 'b', before '\n' — should be line 0
    expect(findLineForCursor(lines, 2, graphemes)).toBe(0);
    // Position 5 is after 'd', before '\n' — should be line 1
    expect(findLineForCursor(lines, 5, graphemes)).toBe(1);
  });

  it('handles cursor on an empty line', () => {
    const graphemes = g('ab\n\ncd');
    const lines = computeVisualLines(graphemes, 20, false);
    // Lines: [ab](0-2), [](3-3), [cd](4-6)

    expect(findLineForCursor(lines, 3, graphemes)).toBe(1); // empty line
    expect(findLineForCursor(lines, 4, graphemes)).toBe(2); // 'c'
  });

  it('handles cursor navigating through content with empty lines', () => {
    const graphemes = g('1\n2\n\n3\n4');
    const lines = computeVisualLines(graphemes, 20, false);
    // Lines: [1](0-1), [2](2-3), [](4-4), [3](5-6), [4](7-8)

    expect(findLineForCursor(lines, 0, graphemes)).toBe(0); // '1'
    expect(findLineForCursor(lines, 1, graphemes)).toBe(0); // after '1'
    expect(findLineForCursor(lines, 2, graphemes)).toBe(1); // '2'
    expect(findLineForCursor(lines, 3, graphemes)).toBe(1); // after '2'
    expect(findLineForCursor(lines, 4, graphemes)).toBe(2); // empty line
    expect(findLineForCursor(lines, 5, graphemes)).toBe(3); // '3'
    expect(findLineForCursor(lines, 6, graphemes)).toBe(3); // after '3'
    expect(findLineForCursor(lines, 7, graphemes)).toBe(4); // '4'
    expect(findLineForCursor(lines, 8, graphemes)).toBe(4); // after '4'
  });

  it('handles cursor at wrap boundary (belongs to next line)', () => {
    const graphemes = g('abcdef');
    const lines = computeVisualLines(graphemes, 4, true);
    // Lines: [abcd](0-4), [ef](4-6)

    expect(findLineForCursor(lines, 3, graphemes)).toBe(0);
    expect(findLineForCursor(lines, 4, graphemes)).toBe(1); // wrap point → next line
    expect(findLineForCursor(lines, 5, graphemes)).toBe(1);
  });

  it('handles cursor at end of last line', () => {
    const graphemes = g('abc');
    const lines = computeVisualLines(graphemes, 20, false);

    expect(findLineForCursor(lines, 3, graphemes)).toBe(0); // end of content
  });

  it('handles empty content', () => {
    const lines = computeVisualLines([], 20, false);

    expect(findLineForCursor(lines, 0, [])).toBe(0);
  });
});
