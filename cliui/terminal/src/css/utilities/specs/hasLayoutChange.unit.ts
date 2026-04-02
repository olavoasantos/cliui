import {describe, expect, it} from 'vitest';

import {hasLayoutChange} from '../hasLayoutChange';

describe('hasLayoutChange', () => {
  it('returns true when there is no previous style', () => {
    expect(hasLayoutChange(null, new Map())).toBe(true);
  });

  it('returns true when a layout property changes', () => {
    const oldStyle = new Map([['width', '10']]);
    const newStyle = new Map([['width', '20']]);

    expect(hasLayoutChange(oldStyle, newStyle)).toBe(true);
  });

  it('returns false when layout properties are unchanged', () => {
    const oldStyle = new Map([['width', '10']]);
    const newStyle = new Map([['width', '10']]);

    expect(hasLayoutChange(oldStyle, newStyle)).toBe(false);
  });
});
