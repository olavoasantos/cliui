import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {UiTr} from '../../UiTr/component';
import {UiTbody} from '../component';

import type {CustomElementConstructor} from '@cliui/dom';

function createTbody(window = new Window(), rowCount = 0): {window: Window; tbody: UiTbody} {
  window.customElements.define(UiTbody.tagName, UiTbody as unknown as CustomElementConstructor);
  window.customElements.define(UiTr.tagName, UiTr as unknown as CustomElementConstructor);

  const tbody = window.document.createElement('ui-tbody') as UiTbody;

  for (let i = 0; i < rowCount; i++) {
    const row = window.document.createElement('ui-tr');
    tbody.appendChild(row);
  }

  window.document.body.appendChild(tbody);

  return {window, tbody};
}

describe('UiTbody', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiTbody.tagName, UiTbody as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-tbody')).toBe(
      UiTbody as unknown as CustomElementConstructor,
    );
  });

  it('returns empty array when no rows', () => {
    const {tbody} = createTbody();

    expect(tbody.getRows()).toHaveLength(0);
  });

  it('returns ui-tr children', () => {
    const {tbody} = createTbody(undefined, 3);

    expect(tbody.getRows()).toHaveLength(3);
  });

  it('ignores non-tr children', () => {
    const {window, tbody} = createTbody();
    const div = window.document.createElement('div');
    tbody.appendChild(div);

    expect(tbody.getRows()).toHaveLength(0);
  });
});
