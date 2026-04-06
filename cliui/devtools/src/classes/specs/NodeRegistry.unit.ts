import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {NodeRegistry} from '../NodeRegistry';

describe('NodeRegistry', () => {
  let registry: NodeRegistry;
  let window: InstanceType<typeof Window>;

  beforeEach(() => {
    registry = new NodeRegistry();
    window = new Window();
  });

  it('assigns a unique integer ID on first registration', () => {
    const el = window.document.createElement('div');
    const id = registry.register(el);

    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('returns the same ID for the same node on subsequent registrations', () => {
    const el = window.document.createElement('div');
    const id1 = registry.register(el);
    const id2 = registry.register(el);

    expect(id1).toBe(id2);
  });

  it('assigns different IDs to different nodes', () => {
    const el1 = window.document.createElement('div');
    const el2 = window.document.createElement('span');
    const id1 = registry.register(el1);
    const id2 = registry.register(el2);

    expect(id1).not.toBe(id2);
  });

  it('looks up node by ID', () => {
    const el = window.document.createElement('div');
    const id = registry.register(el);

    expect(registry.getNode(id)).toBe(el);
  });

  it('looks up ID by node', () => {
    const el = window.document.createElement('div');
    const id = registry.register(el);

    expect(registry.getId(el)).toBe(id);
  });

  it('returns undefined for unregistered lookups', () => {
    const el = window.document.createElement('div');

    expect(registry.getId(el)).toBeUndefined();
    expect(registry.getNode(999)).toBeUndefined();
  });

  it('reports whether a node is registered', () => {
    const el = window.document.createElement('div');

    expect(registry.has(el)).toBe(false);
    registry.register(el);
    expect(registry.has(el)).toBe(true);
  });

  it('unregisters a node and removes both mappings', () => {
    const el = window.document.createElement('div');
    const id = registry.register(el);

    registry.unregister(el);

    expect(registry.getId(el)).toBeUndefined();
    expect(registry.getNode(id)).toBeUndefined();
    expect(registry.has(el)).toBe(false);
  });

  it('unregisters a node and its entire subtree', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    const child1 = doc.createElement('span');
    const child2 = doc.createElement('p');
    const grandchild = doc.createElement('em');

    parent.appendChild(child1);
    parent.appendChild(child2);
    child1.appendChild(grandchild);

    registry.register(parent);
    registry.register(child1);
    registry.register(child2);
    registry.register(grandchild);
    expect(registry.size).toBe(4);

    registry.unregisterSubtree(parent);

    expect(registry.size).toBe(0);
    expect(registry.has(parent)).toBe(false);
    expect(registry.has(child1)).toBe(false);
    expect(registry.has(child2)).toBe(false);
    expect(registry.has(grandchild)).toBe(false);
  });

  it('does nothing when unregistering an unknown node', () => {
    const el = window.document.createElement('div');
    expect(() => registry.unregister(el)).not.toThrow();
  });

  it('clears all mappings', () => {
    const el1 = window.document.createElement('div');
    const el2 = window.document.createElement('span');

    registry.register(el1);
    registry.register(el2);
    expect(registry.size).toBe(2);

    registry.clear();

    expect(registry.size).toBe(0);
    expect(registry.has(el1)).toBe(false);
    expect(registry.has(el2)).toBe(false);
  });

  it('resets ID counter on clear', () => {
    const el1 = window.document.createElement('div');
    registry.register(el1);

    registry.clear();

    const el2 = window.document.createElement('span');
    const id = registry.register(el2);

    // After clear, IDs start from 1 again
    expect(id).toBe(1);
  });

  it('tracks text nodes', () => {
    const text = window.document.createTextNode('hello');
    const id = registry.register(text);

    expect(registry.getNode(id)).toBe(text);
  });

  it('tracks comment nodes', () => {
    const comment = window.document.createComment('a comment');
    const id = registry.register(comment);

    expect(registry.getNode(id)).toBe(comment);
  });

  it('tracks the document node', () => {
    const id = registry.register(window.document);

    expect(registry.getNode(id)).toBe(window.document);
  });
});
