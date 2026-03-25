import {describe, expect, it} from 'vitest';

import {parseDeclarations} from '../parseDeclarations';

describe('parseDeclarations', () => {
  it('parses valid declarations from a block body', () => {
    expect(parseDeclarations('color: red; font-weight: bold;')).toEqual([
      {property: 'color', value: 'red'},
      {property: 'font-weight', value: 'bold'},
    ]);
  });

  it('skips malformed declarations', () => {
    expect(parseDeclarations('color red; width: 10;')).toEqual([{property: 'width', value: '10'}]);
  });
});
