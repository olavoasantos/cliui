import {describe, expect, it} from 'vitest';

import {parseSelector} from '../../../dom/utilities/parseSelector';
import {computeSpecificity} from '../computeSpecificity';

describe('computeSpecificity', () => {
  it('counts id, class, and element matchers', () => {
    const parts = parseSelector('div.card#main');

    expect(computeSpecificity(parts)).toEqual([1, 1, 1]);
  });

  it('counts pseudo and attribute matchers in the middle slot', () => {
    const parts = parseSelector('button[disabled]:hover');

    expect(computeSpecificity(parts)).toEqual([0, 2, 1]);
  });
});
