import {describe, expect, it} from 'vitest';

import {Navmenu} from '../component';
import {NavmenuItem} from '../../NavmenuItem/component';
import {KeyboardEvent} from '@cliui/dom';
import {Window} from '@cliui/dom';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(Navmenu.tagName, Navmenu);
  window.customElements.define(NavmenuItem.tagName, NavmenuItem);

  return {window, document};
}

function buildMenu(document: any, items: string[]) {
  const menu = document.createElement('navmenu');

  for (const text of items) {
    const item = document.createElement('navmenuitem');
    item.setAttribute('value', text);
    item.textContent = text;
    menu.appendChild(item);
  }

  document.body.appendChild(menu);

  return menu as Navmenu;
}

describe('Navmenu', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('navmenu')).toBe(Navmenu);
  });

  it('opens and highlights first item', () => {
    const {document} = createEnv();
    const menu = buildMenu(document, ['Copy', 'Paste', 'Delete']);

    menu.open();

    expect(menu.hasAttribute('open')).toBe(true);

    const items = menu.querySelectorAll('navmenuitem');

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
    const items = menu.querySelectorAll('navmenuitem');
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
