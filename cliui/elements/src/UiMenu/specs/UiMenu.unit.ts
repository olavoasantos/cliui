import {describe, expect, it} from 'vitest';

import {UiMenu} from '../component';
import {UiMenuItem} from '../../UiMenuItem/component';
import {KeyboardEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiMenu.tagName, UiMenu);
  window.customElements.define(UiMenuItem.tagName, UiMenuItem);

  return {window, document};
}

function buildMenu(document: any, items: string[]) {
  const menu = document.createElement('ui-menu');

  for (const text of items) {
    const item = document.createElement('ui-menu-item');
    item.setAttribute('value', text);
    item.textContent = text;
    menu.appendChild(item);
  }

  document.body.appendChild(menu);

  return menu as UiMenu;
}

describe('UiMenu', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-menu')).toBe(UiMenu);
  });

  it('opens and highlights first item', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['Copy', 'Paste', 'Delete']);

    menu.open();

    expect(menu.hasAttribute('open')).toBe(true);

    const items = menu.querySelectorAll('ui-menu-item');

    expect(items[0]!.hasAttribute('highlighted')).toBe(true);
  });

  it('navigates with ArrowDown and ArrowUp', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['A', 'B', 'C']);
    menu.open();

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    expect(menu.getHighlightedValue()).toBe('B');

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));

    expect(menu.getHighlightedValue()).toBe('A');
  });

  it('wraps navigation at boundaries', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['A', 'B']);
    menu.open();

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowUp', bubbles: true}));

    expect(menu.getHighlightedValue()).toBe('B');
  });

  it('dispatches select and closes on Enter', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['A', 'B']);
    menu.open();

    let selected = false;
    menu.addEventListener('select', () => {
      selected = true;
    });

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(selected).toBe(true);
    expect(menu.hasAttribute('open')).toBe(false);
  });

  it('closes on Escape', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['A']);
    menu.open();

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));

    expect(menu.hasAttribute('open')).toBe(false);
  });

  it('skips disabled items during navigation', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['A', 'B', 'C']);
    const items = menu.querySelectorAll('ui-menu-item');
    items[1]!.setAttribute('disabled', '');
    menu.open();

    menu.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    // highlight index advances by 1 but item B is disabled,
    // so getHighlightedValue returns the next non-disabled
    // Actually our navigation doesn't skip — it highlights index 1
    // but getItems() filters disabled, so index 1 maps to C
    expect(menu.getHighlightedValue()).toBe('C');
  });
});
