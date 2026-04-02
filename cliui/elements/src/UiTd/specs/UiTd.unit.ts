import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {UiTd} from '../component';

describe('UiTd', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiTd.tagName, UiTd as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-td')).toBe(UiTd as unknown as CustomElementConstructor);
  });

  it('renders text content', () => {
    const window = new Window();

    window.customElements.define(UiTd.tagName, UiTd as unknown as CustomElementConstructor);

    const td = window.document.createElement('ui-td') as UiTd;
    td.textContent = 'Cell value';
    window.document.body.appendChild(td);

    expect(td.textContent).toBe('Cell value');
  });
});
