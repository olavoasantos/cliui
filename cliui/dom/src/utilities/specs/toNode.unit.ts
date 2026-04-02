import {describe, expect, it} from 'vitest';

import {Node} from '../../classes/Node';
import {Window} from '../../classes/Window';
import {toNode} from '../toNode';

describe('toNode', () => {
  it('returns the node unchanged if it is already a Node instance', () => {
    const window = new Window();
    const parent = window.document.createElement('div');
    const node = window.document.createElement('span');

    expect(toNode(parent, node)).toBe(node);
  });

  it('converts a string to a text node', () => {
    const window = new Window();
    const parent = window.document.createElement('div');
    const node = toNode(parent, 'content');

    expect(node).toBeInstanceOf(Node);
    expect(node.textContent).toBe('content');
  });

  it('converts a number to a text node', () => {
    const window = new Window();
    const parent = window.document.createElement('div');

    expect(toNode(parent, 42).textContent).toBe('42');
  });

  it('converts null to a text node', () => {
    const window = new Window();
    const parent = window.document.createElement('div');

    expect(toNode(parent, null).textContent).toBe('null');
  });

  it('converts undefined to a text node', () => {
    const window = new Window();
    const parent = window.document.createElement('div');

    expect(toNode(parent, undefined).textContent).toBe('undefined');
  });
});
