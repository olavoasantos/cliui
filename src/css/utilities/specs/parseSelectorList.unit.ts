import {describe, expect, it} from 'vitest';

import {parseSelectorList} from '../parseSelectorList';

describe('parseSelectorList', () => {
  it('parses multiple selectors separated by commas', () => {
    const selectors = parseSelectorList('div, span, .card');

    expect(selectors).toHaveLength(3);
  });

  it('skips empty selector entries', () => {
    const selectors = parseSelectorList('div, , span');

    expect(selectors).toHaveLength(2);
  });
});
