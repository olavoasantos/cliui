import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import {UiTr} from '../../UiTr/component';
import {UiThead} from '../component';

import type {CustomElementConstructor} from '@cliui/dom';

function createThead(window = new Window(), rowCount = 0): {window: Window; thead: UiThead} {
  window.customElements.define(UiThead.tagName, UiThead as unknown as CustomElementConstructor);
  window.customElements.define(UiTr.tagName, UiTr as unknown as CustomElementConstructor);

  const thead = window.document.createElement('ui-thead') as UiThead;

  for (let i = 0; i < rowCount; i++) {
    const row = window.document.createElement('ui-tr');
    thead.appendChild(row);
  }

  window.document.body.appendChild(thead);

  return {window, thead};
}

describe('UiThead', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(UiThead.tagName, UiThead as unknown as CustomElementConstructor);

    expect(window.customElements.get('ui-thead')).toBe(
      UiThead as unknown as CustomElementConstructor,
    );
  });

  it('returns empty array when no rows', () => {
    const {thead} = createThead();

    expect(thead.getRows()).toHaveLength(0);
  });

  it('returns ui-tr children', () => {
    const {thead} = createThead(undefined, 2);

    expect(thead.getRows()).toHaveLength(2);
  });

  it('ignores non-tr children', () => {
    const {window, thead} = createThead();
    const div = window.document.createElement('div');
    thead.appendChild(div);

    expect(thead.getRows()).toHaveLength(0);
  });
});
