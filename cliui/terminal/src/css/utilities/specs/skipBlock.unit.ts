import {describe, expect, it} from 'vitest';

import {skipBlock} from '../skipBlock';

describe('skipBlock', () => {
  it('skips a block and returns the next position', () => {
    expect(skipBlock('{ color: red; }tail', 1)).toBe(15);
  });

  it('returns the input length when the block is unclosed', () => {
    expect(skipBlock('{ color: red;', 1)).toBe(13);
  });
});
