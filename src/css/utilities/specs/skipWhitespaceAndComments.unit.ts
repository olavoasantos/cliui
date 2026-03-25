import {describe, expect, it} from 'vitest';

import {skipWhitespaceAndComments} from '../skipWhitespaceAndComments';

describe('skipWhitespaceAndComments', () => {
  it('skips leading whitespace', () => {
    expect(skipWhitespaceAndComments('   div', 0)).toBe(3);
  });

  it('skips leading block comments', () => {
    expect(skipWhitespaceAndComments('/* note */div', 0)).toBe(10);
  });
});
