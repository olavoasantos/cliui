import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {parseSelector} from '../../../dom/utilities/parseSelector';
import {matchesSelectorParts} from '../matchesSelectorParts';

describe('matchesSelectorParts', () => {
  it('returns true when the element matches the selector parts', () => {
    const window = new Window();
    const element = window.document.createElement('div');
    element.setAttribute('class', 'card');

    expect(matchesSelectorParts(element, parseSelector('div.card'))).toBe(true);
  });

  it('returns false when the selector does not match', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(matchesSelectorParts(element, parseSelector('span'))).toBe(false);
  });
});
