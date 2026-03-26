import {describe, expect, it} from 'vitest';

import {parseSelector} from '../../../dom/utilities/parseSelector';
import {serializeSelectorParts} from '../serializeSelectorParts';

describe('serializeSelectorParts', () => {
  it('serializes compound selectors', () => {
    expect(serializeSelectorParts(parseSelector('div.card#main'))).toBe('div.card#main');
  });

  it('serializes selectors with combinators', () => {
    expect(serializeSelectorParts(parseSelector('div > span'))).toBe('div > span');
  });

  it('serializes wildcard and attribute selectors', () => {
    expect(serializeSelectorParts(parseSelector('*[data-kind="summary"]'))).toBe(
      '*[data-kind="summary"]',
    );
  });

  it('serializes functional selectors with their arguments', () => {
    expect(serializeSelectorParts(parseSelector('section:not(.muted)'))).toBe(
      'section:not(.muted)',
    );
  });

  it('serializes selector chains with mixed combinators', () => {
    expect(serializeSelectorParts(parseSelector('main .card > .title + .badge ~ .icon'))).toBe(
      'main .card > .title + .badge ~ .icon',
    );
  });

  it('returns an empty string for an empty selector list', () => {
    expect(serializeSelectorParts([])).toBe('');
  });
});
