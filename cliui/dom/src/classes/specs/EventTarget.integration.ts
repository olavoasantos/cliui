import {describe, expect, it} from 'vitest';

import {Event} from '../Event';
import {Window} from '../Window';

describe('EventTarget integration', () => {
  it('coordinates capture and bubble listeners across a parent-child subtree', () => {
    const document = new Window().document;
    const parent = document.createElement('div');
    const child = document.createElement('button');
    parent.appendChild(child);
    document.body.appendChild(parent);
    const order: string[] = [];

    parent.addEventListener('click', () => order.push('capture'), {capture: true});
    child.addEventListener('click', () => order.push('target'));
    parent.addEventListener('click', () => order.push('bubble'));
    child.dispatchEvent(new Event('click', {bubbles: true}));

    expect(order).toEqual(['capture', 'target', 'bubble']);
  });
});
