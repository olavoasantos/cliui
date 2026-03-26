import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('Element integration', () => {
  it('keeps attributes, classList, style, and query selector behavior in sync during subtree updates', () => {
    const document = new Window().document;
    const root = document.createElement('div');
    const card = document.createElement('article');

    root.id = 'root';
    root.appendChild(card);
    document.body.appendChild(root);

    card.classList.add('card', 'active');
    card.style.borderStyle = 'rounded';
    card.style.padding = '1 2';
    card.setAttribute('data-state', 'open');

    expect(card.getAttribute('class')).toBe('card active');
    expect(card.className).toBe('card active');
    expect(card.style.borderStyle).toBe('rounded');
    expect(card.style.getPropertyValue('padding-top')).toBe('1');
    expect(card.style.getPropertyValue('padding-right')).toBe('2');
    expect(document.querySelector('.card.active')).toBe(card);
    expect(document.querySelector('[data-state="open"]')).toBe(card);

    card.classList.remove('active');
    card.className = 'card featured';
    card.removeAttribute('data-state');

    expect(document.querySelector('.card.active')).toBeNull();
    expect(document.querySelector('.card.featured')).toBe(card);
    expect(card.hasAttribute('data-state')).toBe(false);
    expect(card.outerHTML).toContain('class="card featured"');
  });
});
