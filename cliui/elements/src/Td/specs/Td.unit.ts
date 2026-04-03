import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Td} from '../component';

describe('Td', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Td.tagName, Td as unknown as CustomElementConstructor);

    expect(window.customElements.get('td')).toBe(Td as unknown as CustomElementConstructor);
  });

  it('renders text content', () => {
    const window = new Window();

    window.customElements.define(Td.tagName, Td as unknown as CustomElementConstructor);

    const el = window.document.createElement('td') as Td;
    el.textContent = 'Cell value';
    window.document.body.appendChild(el);

    expect(el.textContent).toBe('Cell value');
  });
});
