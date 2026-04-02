import {describe, expect, it} from 'vitest';

import {UiOptgroup} from '../component';
import {UiOption} from '../../UiOption/component';
import {UiSelect} from '../../UiSelect/component';
import {KeyboardEvent, Window} from '@cliui/dom';

import type {CustomElementConstructor} from '@cliui/dom';
import type {Element} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiOptgroup.tagName, UiOptgroup);
  window.customElements.define(UiOption.tagName, UiOption as unknown as CustomElementConstructor);
  window.customElements.define(UiSelect.tagName, UiSelect as unknown as CustomElementConstructor);

  return {window, document};
}

describe('UiOptgroup', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-optgroup')).toBe(UiOptgroup);
  });

  it('returns label from attribute', () => {
    const {document} = createEnv();
    const group = document.createElement('ui-optgroup') as UiOptgroup;
    group.setAttribute('label', 'Fruits');

    expect(group.getLabel()).toBe('Fruits');
  });

  it('returns empty string when no label is set', () => {
    const {document} = createEnv();
    const group = document.createElement('ui-optgroup') as UiOptgroup;

    expect(group.getLabel()).toBe('');
  });

  it('reports disabled state', () => {
    const {document} = createEnv();
    const group = document.createElement('ui-optgroup') as UiOptgroup;

    expect(group.isDisabled()).toBe(false);

    group.setAttribute('disabled', '');

    expect(group.isDisabled()).toBe(true);
  });

  it('renders a group header label inside a select listbox', () => {
    const {document} = createEnv();
    const select = document.createElement('ui-select');

    const group = document.createElement('ui-optgroup');
    group.setAttribute('label', 'Fruits');

    const apple = document.createElement('ui-option');
    apple.setAttribute('value', 'apple');
    apple.textContent = 'Apple';

    const banana = document.createElement('ui-option');
    banana.setAttribute('value', 'banana');
    banana.textContent = 'Banana';

    group.appendChild(apple);
    group.appendChild(banana);
    select.appendChild(group);
    document.body.appendChild(select);

    /* The listbox should contain: header, apple, banana */
    const listbox = (select as unknown as {childNodes: any[]}).childNodes[1];
    const headerEl = listbox.childNodes[0] as Element;

    expect(headerEl.getAttribute('class')).toBe('ui-optgroup-label');
    expect(headerEl.textContent).toBe('Fruits');
  });

  it('group headers are not selectable via keyboard navigation', () => {
    const {document} = createEnv();
    const select = document.createElement('ui-select') as UiSelect;

    const group = document.createElement('ui-optgroup');
    group.setAttribute('label', 'Fruits');

    const apple = document.createElement('ui-option');
    apple.setAttribute('value', 'apple');
    apple.textContent = 'Apple';

    const banana = document.createElement('ui-option');
    banana.setAttribute('value', 'banana');
    banana.textContent = 'Banana';

    group.appendChild(apple);
    group.appendChild(banana);
    select.appendChild(group);
    select.setAttribute('value', 'apple');
    document.body.appendChild(select);

    /* Arrow down should select banana, not the group header */
    select.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(select.getAttribute('value')).toBe('banana');
  });

  it('mixes ungrouped and grouped options correctly', () => {
    const {document} = createEnv();
    const select = document.createElement('ui-select') as UiSelect;

    /* Ungrouped option */
    const standalone = document.createElement('ui-option');
    standalone.setAttribute('value', 'standalone');
    standalone.textContent = 'Standalone';
    select.appendChild(standalone);

    /* Grouped options */
    const group = document.createElement('ui-optgroup');
    group.setAttribute('label', 'Group');

    const grouped = document.createElement('ui-option');
    grouped.setAttribute('value', 'grouped');
    grouped.textContent = 'Grouped';
    group.appendChild(grouped);
    select.appendChild(group);

    select.setAttribute('value', 'standalone');
    document.body.appendChild(select);

    /* Arrow down should go to grouped option */
    select.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(select.getAttribute('value')).toBe('grouped');
  });
});
