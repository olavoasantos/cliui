import {describe, expect, it} from 'vitest';

import {findClosingBrace} from '../findClosingBrace';

describe('findClosingBrace', () => {
  it('finds the matching closing brace', () => {
    expect(findClosingBrace('{ color: red; }', 1)).toBe(14);
  });

  it('handles nested braces inside nested blocks', () => {
    const css = '{ color: red; nested { display: flex; } }';

    expect(findClosingBrace(css, 1)).toBe(css.length - 1);
  });

  it('ignores braces inside quoted strings', () => {
    const css = '{ content: "}"; color: red; }';

    expect(findClosingBrace(css, 1)).toBe(css.length - 1);
  });

  it('ignores braces inside block comments', () => {
    const css = '{ /* } */ color: red; }';

    expect(findClosingBrace(css, 1)).toBe(css.length - 1);
  });

  it('returns -1 for unterminated comments', () => {
    expect(findClosingBrace('{ /* comment', 1)).toBe(-1);
  });

  it('returns -1 when no closing brace exists', () => {
    expect(findClosingBrace('{ color: red;', 1)).toBe(-1);
  });
});
