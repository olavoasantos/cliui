import {describe, expect, it} from 'vitest';

import {findWideFastPathRange} from '../findWideFastPathRange';

describe('findWideFastPathRange', () => {
  it('returns the range containing the common code point when present', () => {
    expect(findWideFastPathRange([1, 2, 10, 20, 30, 40], 15)).toEqual([10, 20]);
  });

  it('falls back to the widest range otherwise', () => {
    expect(findWideFastPathRange([1, 2, 10, 30, 40, 45], 99)).toEqual([10, 30]);
  });
});
