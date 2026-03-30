import {describe, expect, it} from 'vitest';

import {UiList} from '../component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Window} from '../../../dom/classes/Window';

import type {Element} from '../../../dom/classes/Element';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiList.tagName, UiList);

  return {window, document};
}

function buildList(document: any, items: string[]) {
  const list = document.createElement('ui-list');

  for (const text of items) {
    const item = document.createElement('div');
    item.textContent = text;
    item.setAttribute('value', text);
    list.appendChild(item);
  }

  document.body.appendChild(list);

  return list as UiList;
}

function child(list: UiList, index: number): Element {
  return list.children[index] as Element;
}

describe('UiList', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-list')).toBe(UiList);
  });

  it('highlights the first item by default', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B', 'C']);

    expect(list.getHighlightIndex()).toBe(0);
    expect(child(list, 0).hasAttribute('highlighted')).toBe(true);
    expect(child(list, 1).hasAttribute('highlighted')).toBe(false);
  });

  it('moves highlight down with ArrowDown', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B', 'C']);

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(list.getHighlightIndex()).toBe(1);
    expect(child(list, 1).hasAttribute('highlighted')).toBe(true);
  });

  it('moves highlight up with ArrowUp', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B', 'C']);

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));

    expect(list.getHighlightIndex()).toBe(2);
  });

  it('wraps around at boundaries', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B']);

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(list.getHighlightIndex()).toBe(0);
  });

  it('selects item on Enter in single mode', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B', 'C']);

    let selected = false;
    list.addEventListener('select', () => {
      selected = true;
    });

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(selected).toBe(true);
    expect(child(list, 1).hasAttribute('selected')).toBe(true);
    expect(list.getSelectedValue()).toBe('B');
  });

  it('toggles selection on Enter in multi mode', () => {
    const {document} = createEnv();
    const list = buildList(document, ['A', 'B']);
    list.setAttribute('mode', 'multi');

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(child(list, 0).hasAttribute('selected')).toBe(true);

    list.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(child(list, 0).hasAttribute('selected')).toBe(false);
  });
});
