import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('DOMTokenList integration', () => {
  it('keeps classList, className, attribute storage, and selector queries synchronized', () => {
    const document = new Window().document;
    const element = document.createElement('div');
    document.body.appendChild(element);

    element.classList.add('card', 'active');
    expect(document.querySelector('.card.active')).toBe(element);

    element.className = 'card featured';

    expect(element.getAttribute('class')).toBe('card featured');
    expect(document.querySelector('.active')).toBeNull();
    expect(document.querySelector('.featured')).toBe(element);
  });
});
