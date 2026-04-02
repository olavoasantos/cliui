import {describe, expect, it} from 'vitest';

import {compareSpecificity} from '../compareSpecificity';

describe('compareSpecificity', () => {
  it('returns a negative value when the left specificity is lower', () => {
    expect(compareSpecificity([0, 1, 0], [1, 0, 0])).toBeLessThan(0);
  });

  it('returns zero when both specificities are equal', () => {
    expect(compareSpecificity([0, 1, 1], [0, 1, 1])).toBe(0);
  });
});
