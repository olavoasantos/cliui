import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {UiTr} from '../../UiTr/component';
import {UiTfoot} from '../component';

function createTfoot(window = new Window(), rowCount = 0): {window: Window; tfoot: UiTfoot} {
  window.customElements.define(UiTfoot.tagName, UiTfoot as unknown as CustomElementConstructor);
  window.customElements.define(UiTr.tagName, UiTr as unknown as CustomElementConstructor);

  const tfoot = window.document.createElement('ui-tfoot') as UiTfoot;

  for (let i = 0; i < rowCount; i++) {
    const row = window.document.createElement('ui-tr');
    tfoot.appendChild(row);
  }

  window.document.body.appendChild(tfoot);

  return {window, tfoot};
}

describe('UiTfoot', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiTfoot.tagName, UiTfoot as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-tfoot')).toBe(
      UiTfoot as unknown as CustomElementConstructor,
    );
  });

  it('returns empty array when no rows', () => {
    const {tfoot} = createTfoot();

    expect(tfoot.getRows()).toHaveLength(0);
  });

  it('returns ui-tr children', () => {
    const {tfoot} = createTfoot(undefined, 2);

    expect(tfoot.getRows()).toHaveLength(2);
  });

  it('ignores non-tr children', () => {
    const {window, tfoot} = createTfoot();
    const div = window.document.createElement('div');
    tfoot.appendChild(div);

    expect(tfoot.getRows()).toHaveLength(0);
  });
});
