import {describe, expect, it} from 'vitest';

import {OWNER_DOCUMENT} from '../../constants';
import {Node} from '../../classes/Node';
import {Window} from '../../classes/Window';
import {createNode} from '../createNode';

describe('createNode', () => {
  it('sets the OWNER_DOCUMENT property on the node', () => {
    const window = new Window();
    const node = new Node();

    createNode(node, window.document);

    expect(node.ownerDocument).toBe(window.document);
  });

  it('makes the OWNER_DOCUMENT property non-enumerable', () => {
    const window = new Window();
    const node = new Node();

    createNode(node, window.document);

    const descriptor = Object.getOwnPropertyDescriptor(node, OWNER_DOCUMENT);

    expect(descriptor?.enumerable).toBe(false);
  });

  it('returns the same node instance', () => {
    const window = new Window();
    const node = new Node();

    expect(createNode(node, window.document)).toBe(node);
  });
});
