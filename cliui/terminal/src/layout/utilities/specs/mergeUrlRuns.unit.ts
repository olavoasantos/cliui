import {describe, it, expect} from 'vitest';

import {mergeUrlRuns} from '../mergeUrlRuns';

describe('mergeUrlRuns', () => {
  it('merges https:// URL segments', () => {
    const words = ['https:', '//', 'example.', 'com'];
    const widths = [6, 2, 8, 3];
    const gw: null[] = [null, null, null, null];
    const g: null[] = [null, null, null, null];

    mergeUrlRuns(words, widths, gw, g);

    expect(words).toEqual(['https://example.com']);
    expect(widths).toEqual([19]);
  });

  it('stops URL merge at space', () => {
    const words = ['https:', '//', 'example', ' ', 'more'];
    const widths = [6, 2, 7, 1, 4];
    const gw: null[] = [null, null, null, null, null];
    const g: null[] = [null, null, null, null, null];

    mergeUrlRuns(words, widths, gw, g);

    expect(words).toEqual(['https://example', ' ', 'more']);
  });

  it('does not merge non-URL text', () => {
    const words = ['hello', ' ', 'world'];
    const widths = [5, 1, 5];
    const gw: null[] = [null, null, null];
    const g: null[] = [null, null, null];

    mergeUrlRuns(words, widths, gw, g);

    expect(words).toEqual(['hello', ' ', 'world']);
  });
});
