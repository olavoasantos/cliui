import {describe, expect, it} from 'vitest';

import {skipString} from '../skipString';

describe('skipString', () => {
  it('advances past a quoted string', () => {
    expect(skipString('"hello" world', 0, '"'.charCodeAt(0))).toBe(7);
  });

  it('skips escaped quotes inside a string', () => {
    expect(skipString('"a\\"b"x', 0, '"'.charCodeAt(0))).toBe(6);
  });
});
