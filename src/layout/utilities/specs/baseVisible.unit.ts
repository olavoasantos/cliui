import {describe, expect, it} from 'vitest';

import {baseVisible} from '../baseVisible';

describe('baseVisible', () => {
  it('strips leading combining characters and preserves visible text', () => {
    expect(baseVisible('\u200Dabc')).toBe('abc');
  });
});
