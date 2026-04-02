import {describe, expect, it} from 'vitest';

import {parseSelector} from '@cliui/dom';
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

  it('treats wildcard selectors as zero specificity', () => {
    const parts = parseSelector('*');

    expect(computeSpecificity(parts)).toEqual([0, 0, 0]);
  });

  it('counts compound selectors across descendant chains', () => {
    const parts = parseSelector('main.dashboard section.card[data-state="open"] .title');

    expect(computeSpecificity(parts)).toEqual([0, 4, 2]);
  });

  it('counts functional selectors when they carry an argument', () => {
    const parts = parseSelector('section:not(.muted)');

    expect(computeSpecificity(parts)).toEqual([0, 1, 1]);
  });

  it('does not count functional selectors without an argument', () => {
    const parts = [
      {
        combinator: 4,
        matchers: [{type: 6, name: 'has', value: ''}],
      },
    ] as ReturnType<typeof parseSelector>;

    expect(computeSpecificity(parts)).toEqual([0, 0, 0]);
  });
});
