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
});
