import {describe, expect, it} from 'vitest';

import {codePointInRange} from '../codePointInRange';

describe('codePointInRange', () => {
  it('returns true when the code point is inside a range', () => {
    expect(codePointInRange([1, 3, 10, 12], 11)).toBe(true);
  });

  it('returns false when the code point is outside all ranges', () => {
    expect(codePointInRange([1, 3, 10, 12], 8)).toBe(false);
  });
});
