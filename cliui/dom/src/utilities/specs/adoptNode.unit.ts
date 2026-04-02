import {describe, expect, it} from 'vitest';

import {OWNER_DOCUMENT} from '../../constants';
import {Window} from '../../classes/Window';
import {adoptNode} from '../adoptNode';

describe('adoptNode', () => {
  it('sets the ownerDocument of the node to the new document', () => {
    const sourceWindow = new Window();
    const targetWindow = new Window();
    const node = sourceWindow.document.createElement('div');

    adoptNode(node, targetWindow.document);

    expect(node.ownerDocument).toBe(targetWindow.document);
  });

  it('recursively sets ownerDocument on all child nodes', () => {
    const sourceWindow = new Window();
    const targetWindow = new Window();
    const parent = sourceWindow.document.createElement('div');
    const child = sourceWindow.document.createElement('span');
    const grandchild = sourceWindow.document.createTextNode('content');
    child.appendChild(grandchild);
    parent.appendChild(child);

    adoptNode(parent, targetWindow.document);

    expect(parent.ownerDocument).toBe(targetWindow.document);
    expect(child.ownerDocument).toBe(targetWindow.document);
    expect(grandchild.ownerDocument).toBe(targetWindow.document);
  });

  it('does not recurse into children for non-ParentNode types', () => {
    const sourceWindow = new Window();
    const targetWindow = new Window();
    const text = sourceWindow.document.createTextNode('content');

    adoptNode(text, targetWindow.document);

    expect(text.ownerDocument).toBe(targetWindow.document);
    expect(text[OWNER_DOCUMENT]).toBe(targetWindow.document);
  });

  it('handles deeply nested subtrees', () => {
    const sourceWindow = new Window();
    const targetWindow = new Window();
    const root = sourceWindow.document.createElement('div');
    let current = root;

    for (let depth = 0; depth < 5; depth += 1) {
      const child = sourceWindow.document.createElement(`level-${depth}`);
      current.appendChild(child);
      current = child;
    }

    adoptNode(root, targetWindow.document);

    for (const node of [root, ...root.querySelectorAll('*')]) {
      expect(node.ownerDocument).toBe(targetWindow.document);
    }
  });
});
