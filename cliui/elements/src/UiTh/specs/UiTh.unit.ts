import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {UiTh} from '../component';

import type {CustomElementConstructor} from '@cliui/dom';

describe('UiTh', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiTh.tagName, UiTh as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-th')).toBe(UiTh as unknown as CustomElementConstructor);
  });

  it('renders text content', () => {
    const window = new Window();

    window.customElements.define(UiTh.tagName, UiTh as unknown as CustomElementConstructor);

    const th = window.document.createElement('ui-th') as UiTh;
    th.textContent = 'Header';
    window.document.body.appendChild(th);

    expect(th.textContent).toBe('Header');
  });
});
