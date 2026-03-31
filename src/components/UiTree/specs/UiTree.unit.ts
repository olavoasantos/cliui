import {describe, expect, it, vi} from 'vitest';

import {UiTree} from '../component';
import {UiTreeItem} from '../../UiTreeItem/component';
import {KeyboardEvent} from '../../../dom/classes/KeyboardEvent';
import {Window} from '../../../dom/classes/Window';

function createEnv() {
  const window = new Window();
  const document = window.document;

  window.customElements.define(UiTree.tagName, UiTree);
  window.customElements.define(UiTreeItem.tagName, UiTreeItem);

  return {window, document};
}

describe('UiTree', () => {
  it('registers the custom element under its tag name', () => {
    const {window} = createEnv();

    expect(window.customElements.get('ui-tree')).toBe(UiTree);
  });

  it('collects visible leaf items', () => {
    const {document} = createEnv();
    const tree = document.createElement('ui-tree') as UiTree;

    for (const name of ['A', 'B', 'C']) {
      const item = document.createElement('ui-tree-item');
      item.setAttribute('value', name);
      item.textContent = name;
      tree.appendChild(item);
    }

    document.body.appendChild(tree);

    expect(tree.getVisibleItems().length).toBe(3);
  });

  it('hides children of collapsed expandable items', () => {
    const {document} = createEnv();
    const tree = document.createElement('ui-tree') as UiTree;

    const parent = document.createElement('ui-tree-item');
    parent.setAttribute('value', 'parent');
    parent.setAttribute('expandable', '');
    parent.textContent = 'Parent';

    const child = document.createElement('ui-tree-item');
    child.setAttribute('value', 'child');
    child.textContent = 'Child';
    parent.appendChild(child);

    tree.appendChild(parent);
    document.body.appendChild(tree);

    /* Collapsed: only parent visible */
    expect(tree.getVisibleItems().length).toBe(1);

    /* Expand */
    parent.setAttribute('open', '');

    expect(tree.getVisibleItems().length).toBe(2);
  });

  it('navigates with ArrowDown/ArrowUp', () => {
    const {document} = createEnv();
    const tree = document.createElement('ui-tree') as UiTree;

    for (const name of ['A', 'B', 'C']) {
      const item = document.createElement('ui-tree-item');
      item.setAttribute('value', name);
      item.textContent = name;
      tree.appendChild(item);
    }

    document.body.appendChild(tree);

    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));

    const items = tree.getVisibleItems();

    expect(items[1]!.hasAttribute('highlighted')).toBe(true);
  });

  it('dispatches select on Enter', () => {
    const {document} = createEnv();
    const tree = document.createElement('ui-tree') as UiTree;

    const item = document.createElement('ui-tree-item');
    item.setAttribute('value', 'A');
    item.textContent = 'A';
    tree.appendChild(item);
    document.body.appendChild(tree);

    const handler = vi.fn();
    tree.addEventListener('select', handler);

    tree.dispatchEvent(new KeyboardEvent('keydown', {key: 'Enter', bubbles: true}));

    expect(handler).toHaveBeenCalledOnce();
  });
});
