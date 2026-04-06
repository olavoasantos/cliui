import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {NodeRegistry} from '../NodeRegistry';
import {DOMMutationBridge} from '../DOMMutationBridge';

import type {CDPEvent} from '../../types';

/**
 * Minimal CDPTransport stub that captures broadcast events.
 */
function createMockTransport() {
  const events: CDPEvent[] = [];
  return {
    events,
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
  };
}

describe('DOMMutationBridge', () => {
  let window: InstanceType<typeof Window>;
  let registry: NodeRegistry;
  let transport: ReturnType<typeof createMockTransport>;
  let bridge: DOMMutationBridge;

  beforeEach(() => {
    window = new Window();
    registry = new NodeRegistry();
    transport = createMockTransport();
    bridge = new DOMMutationBridge(transport as any, registry);
    bridge.install(window);
    bridge.enable();
  });

  it('emits DOM.childNodeInserted when a tracked parent gets a new child', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    doc.body.appendChild(parent);
    registry.register(parent);

    const child = doc.createElement('span');
    parent.appendChild(child);

    const event = transport.events.find((e) => e.method === 'DOM.childNodeInserted');
    expect(event).toBeDefined();
    expect(event!.params.parentNodeId).toBe(registry.getId(parent));
    expect((event!.params.node as any).nodeName).toBe('SPAN');
  });

  it('emits DOM.childNodeRemoved when a tracked child is removed', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    const child = doc.createElement('span');
    doc.body.appendChild(parent);
    parent.appendChild(child);

    registry.register(parent);
    registry.register(child);

    parent.removeChild(child);

    const event = transport.events.find((e) => e.method === 'DOM.childNodeRemoved');
    expect(event).toBeDefined();
    expect(event!.params.parentNodeId).toBe(registry.getId(parent));
  });

  it('cleans up registry on child removal', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    const child = doc.createElement('span');
    doc.body.appendChild(parent);
    parent.appendChild(child);

    registry.register(parent);
    registry.register(child);

    parent.removeChild(child);

    expect(registry.has(child)).toBe(false);
  });

  it('emits DOM.attributeModified when a tracked element attribute changes', () => {
    const doc = window.document;
    const el = doc.createElement('div');
    doc.body.appendChild(el);
    registry.register(el);

    el.setAttribute('class', 'active');

    const event = transport.events.find((e) => e.method === 'DOM.attributeModified');
    expect(event).toBeDefined();
    expect(event!.params.nodeId).toBe(registry.getId(el));
    expect(event!.params.name).toBe('class');
    expect(event!.params.value).toBe('active');
  });

  it('emits DOM.attributeRemoved when a tracked element attribute is removed', () => {
    const doc = window.document;
    const el = doc.createElement('div');
    el.setAttribute('class', 'active');
    doc.body.appendChild(el);
    registry.register(el);

    el.removeAttribute('class');

    const event = transport.events.find((e) => e.method === 'DOM.attributeRemoved');
    expect(event).toBeDefined();
    expect(event!.params.nodeId).toBe(registry.getId(el));
    expect(event!.params.name).toBe('class');
  });

  it('emits DOM.characterDataModified when a tracked text node changes', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    const text = doc.createTextNode('hello');
    parent.appendChild(text);
    doc.body.appendChild(parent);

    registry.register(parent);
    registry.register(text);

    text.data = 'world';

    const event = transport.events.find((e) => e.method === 'DOM.characterDataModified');
    expect(event).toBeDefined();
    expect(event!.params.nodeId).toBe(registry.getId(text));
    expect(event!.params.characterData).toBe('world');
  });

  it('does not emit events for untracked nodes', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    doc.body.appendChild(parent);
    // parent is NOT registered in the registry

    const child = doc.createElement('span');
    parent.appendChild(child);

    expect(transport.events).toHaveLength(0);
  });

  it('does not emit events when disabled', () => {
    bridge.disable();

    const doc = window.document;
    const parent = doc.createElement('div');
    doc.body.appendChild(parent);
    registry.register(parent);

    const child = doc.createElement('span');
    parent.appendChild(child);

    expect(transport.events).toHaveLength(0);
  });

  it('resumes emitting after re-enable', () => {
    bridge.disable();
    expect(bridge.isEnabled).toBe(false);

    bridge.enable();
    expect(bridge.isEnabled).toBe(true);

    const doc = window.document;
    const parent = doc.createElement('div');
    doc.body.appendChild(parent);
    registry.register(parent);

    parent.appendChild(doc.createElement('span'));

    expect(transport.events.length).toBeGreaterThan(0);
  });

  it('sets previousNodeId for non-first children', () => {
    const doc = window.document;
    const parent = doc.createElement('div');
    const first = doc.createElement('span');
    doc.body.appendChild(parent);
    parent.appendChild(first);

    registry.register(parent);
    registry.register(first);

    const second = doc.createElement('p');
    parent.appendChild(second);

    const event = transport.events.find((e) => e.method === 'DOM.childNodeInserted');
    expect(event).toBeDefined();
    expect(event!.params.previousNodeId).toBe(registry.getId(first));
  });
});
