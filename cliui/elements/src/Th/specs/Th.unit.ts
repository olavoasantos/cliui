import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Th} from '../component';

describe('Th', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Th.tagName, Th as unknown as CustomElementConstructor);

    expect(window.customElements.get('th')).toBe(Th as unknown as CustomElementConstructor);
  });

  it('renders text content', () => {
    const window = new Window();

    window.customElements.define(Th.tagName, Th as unknown as CustomElementConstructor);

    const el = window.document.createElement('th') as Th;
    el.textContent = 'Cell value';
    window.document.body.appendChild(el);

    expect(el.textContent).toBe('Cell value');
  });
});
