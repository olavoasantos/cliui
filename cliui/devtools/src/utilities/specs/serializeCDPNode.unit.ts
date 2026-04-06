import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {NodeRegistry} from '../../classes/NodeRegistry';
import {serializeCDPNode} from '../serializeCDPNode';

describe('serializeCDPNode', () => {
  let registry: NodeRegistry;
  let window: InstanceType<typeof Window>;

  beforeEach(() => {
    registry = new NodeRegistry();
    window = new Window();
  });

  it('serializes an element node with uppercase nodeName and lowercase localName', () => {
    const el = window.document.createElement('div');
    const result = serializeCDPNode(el, registry);

    expect(result.nodeType).toBe(1);
    expect(result.nodeName).toBe('DIV');
    expect(result.localName).toBe('div');
    expect(result.nodeValue).toBe('');
  });

  it('assigns a nodeId via the registry', () => {
    const el = window.document.createElement('div');
    const result = serializeCDPNode(el, registry);

    expect(result.nodeId).toBeGreaterThan(0);
    expect(result.backendNodeId).toBe(result.nodeId);
    expect(registry.getNode(result.nodeId)).toBe(el);
  });

  it('serializes attributes as a flat key-value array', () => {
    const el = window.document.createElement('div');
    el.setAttribute('id', 'app');
    el.setAttribute('class', 'container');

    const result = serializeCDPNode(el, registry);

    expect(result.attributes).toEqual(['id', 'app', 'class', 'container']);
  });

  it('serializes an element with no attributes as an empty array', () => {
    const el = window.document.createElement('span');
    const result = serializeCDPNode(el, registry);

    expect(result.attributes).toEqual([]);
  });

  it('serializes a text node', () => {
    const text = window.document.createTextNode('hello world');
    const result = serializeCDPNode(text, registry);

    expect(result.nodeType).toBe(3);
    expect(result.nodeName).toBe('#TEXT');
    expect(result.localName).toBe('');
    expect(result.nodeValue).toBe('hello world');
    expect(result.attributes).toBeUndefined();
  });

  it('serializes a comment node', () => {
    const comment = window.document.createComment('a comment');
    const result = serializeCDPNode(comment, registry);

    expect(result.nodeType).toBe(8);
    expect(result.nodeName).toBe('#COMMENT');
    expect(result.localName).toBe('');
    expect(result.nodeValue).toBe('a comment');
  });

  it('serializes the document node', () => {
    const result = serializeCDPNode(window.document, registry);

    expect(result.nodeType).toBe(9);
    expect(result.nodeName).toBe('#DOCUMENT');
  });

  it('includes childNodeCount without children at depth 0', () => {
    const parent = window.document.createElement('div');
    parent.appendChild(window.document.createElement('span'));
    parent.appendChild(window.document.createTextNode('text'));

    const result = serializeCDPNode(parent, registry, 0);

    expect(result.childNodeCount).toBe(2);
    expect(result.children).toBeUndefined();
  });

  it('includes one level of children at depth 1', () => {
    const parent = window.document.createElement('div');
    const child = window.document.createElement('span');
    const grandchild = window.document.createElement('em');

    child.appendChild(grandchild);
    parent.appendChild(child);

    const result = serializeCDPNode(parent, registry, 1);

    expect(result.children).toHaveLength(1);
    expect(result.children![0].nodeName).toBe('SPAN');
    expect(result.children![0].childNodeCount).toBe(1);
    expect(result.children![0].children).toBeUndefined();
  });

  it('includes full subtree at depth -1', () => {
    const parent = window.document.createElement('div');
    const child = window.document.createElement('span');
    const grandchild = window.document.createElement('em');

    child.appendChild(grandchild);
    parent.appendChild(child);

    const result = serializeCDPNode(parent, registry, -1);

    expect(result.children).toHaveLength(1);
    expect(result.children![0].children).toHaveLength(1);
    expect(result.children![0].children![0].nodeName).toBe('EM');
  });

  it('registers all serialized nodes in the registry', () => {
    const parent = window.document.createElement('div');
    const child = window.document.createElement('span');
    parent.appendChild(child);

    serializeCDPNode(parent, registry, -1);

    expect(registry.has(parent)).toBe(true);
    expect(registry.has(child)).toBe(true);
  });

  it('serializes a document fragment', () => {
    const frag = window.document.createDocumentFragment();
    frag.appendChild(window.document.createElement('div'));

    const result = serializeCDPNode(frag, registry, 1);

    expect(result.nodeType).toBe(11);
    expect(result.nodeName).toBe('#DOCUMENT-FRAGMENT');
    expect(result.childNodeCount).toBe(1);
    expect(result.children).toHaveLength(1);
  });

  it('handles re-serialization after tree mutations', () => {
    const parent = window.document.createElement('div');
    const child = window.document.createElement('span');
    parent.appendChild(child);

    const first = serializeCDPNode(parent, registry, -1);
    expect(first.childNodeCount).toBe(1);

    // Mutate the tree
    const newChild = window.document.createElement('p');
    parent.appendChild(newChild);

    const second = serializeCDPNode(parent, registry, -1);
    expect(second.childNodeCount).toBe(2);
    expect(second.children).toHaveLength(2);
    // Parent keeps same ID
    expect(second.nodeId).toBe(first.nodeId);
  });
});
