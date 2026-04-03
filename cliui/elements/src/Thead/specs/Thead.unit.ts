import {describe, expect, it} from 'vitest';

import {Window} from '@cliui/dom';
import type {CustomElementConstructor} from '@cliui/dom';
import {Tr} from '../../Tr/component';
import {Thead} from '../component';

function createSection(rows: string[][] = []): {window: Window; section: Thead} {
  const window = new Window();

  window.customElements.define(Thead.tagName, Thead as unknown as CustomElementConstructor);
  window.customElements.define(Tr.tagName, Tr as unknown as CustomElementConstructor);

  const section = window.document.createElement('thead') as Thead;

  for (const rowText of rows) {
    const row = window.document.createElement('tr');
    for (const text of rowText) {
      const td = window.document.createElement('td');
      td.textContent = text;
      row.appendChild(td);
    }
    section.appendChild(row);
  }

  window.document.body.appendChild(section);

  return {window, section};
}

describe('Thead', () => {
  it('registers the custom element under its tag name', () => {
    const window = new Window();

    window.customElements.define(Thead.tagName, Thead as unknown as CustomElementConstructor);

    expect(window.customElements.get('thead')).toBe(Thead as unknown as CustomElementConstructor);
  });

  it('returns empty array when no rows', () => {
    const {section} = createSection();

    expect(section.getRows()).toHaveLength(0);
  });

  it('returns tr children in order', () => {
    const {section} = createSection([['A'], ['B']]);

    const rows = section.getRows();

    expect(rows).toHaveLength(2);
  });

  it('ignores non-tr children', () => {
    const {window, section} = createSection();
    const div = window.document.createElement('div');
    section.appendChild(div);

    expect(section.getRows()).toHaveLength(0);
  });
});
