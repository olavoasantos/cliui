import {describe, expect, it} from 'vitest';

import {trailingHalfwidthWidth} from '../trailingHalfwidthWidth';

describe('trailingHalfwidthWidth', () => {
  it('adds width for trailing halfwidth/fullwidth-form characters', () => {
    expect(trailingHalfwidthWidth(`a\uFF66`)).toBe(1);
  });

  it('returns zero when there are no trailing halfwidth/fullwidth-form characters', () => {
    expect(trailingHalfwidthWidth('ab')).toBe(0);
  });
});
