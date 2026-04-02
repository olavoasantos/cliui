import {describe, it, expect} from 'vitest';

import {mergeNumericRuns} from '../mergeNumericRuns';

describe('mergeNumericRuns', () => {
  it('merges consecutive numeric segments', () => {
    const words = ['7:00', '-', '9:00'];
    const widths = [4, 1, 4];
    const gw: null[] = [null, null, null];
    const g: null[] = [null, null, null];

    mergeNumericRuns(words, widths, gw, g);

    expect(words).toEqual(['7:00-9:00']);
    expect(widths).toEqual([9]);
  });

  it('does not merge segments without digits', () => {
    const words = ['hello', '-', 'world'];
    const widths = [5, 1, 5];
    const gw: null[] = [null, null, null];
    const g: null[] = [null, null, null];

    mergeNumericRuns(words, widths, gw, g);

    expect(words).toEqual(['hello', '-', 'world']);
  });

  it('stops at space segments', () => {
    const words = ['7:00', ' ', '9:00'];
    const widths = [4, 1, 4];
    const gw: null[] = [null, null, null];
    const g: null[] = [null, null, null];

    mergeNumericRuns(words, widths, gw, g);

    expect(words).toEqual(['7:00', ' ', '9:00']);
  });
});
