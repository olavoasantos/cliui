import {describe, expect, it} from 'vitest';

import {findClosingBrace} from '../findClosingBrace';

describe('findClosingBrace', () => {
  it('finds the matching closing brace', () => {
    expect(findClosingBrace('{ color: red; }', 1)).toBe(14);
  });

  it('returns -1 when no closing brace exists', () => {
    expect(findClosingBrace('{ color: red;', 1)).toBe(-1);
  });
});
