import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {NodeRegistry} from '../NodeRegistry';
import {DOMDomainHandler} from '../DOMDomainHandler';

import type {CDPEvent, CDPMethodHandler} from '../../types';

/**
 * Minimal CDPTransport stub for testing domain handlers.
 */
function createMockTransport() {
  const handlers = new Map<string, CDPMethodHandler>();
  const events: CDPEvent[] = [];

  return {
    handlers,
    events,
    registerMethod(method: string, handler: CDPMethodHandler) {
      handlers.set(method, handler);
    },
    broadcastEvent(event: CDPEvent) {
      events.push(event);
    },
    async call(method: string, params: Record<string, unknown> = {}) {
      const handler = handlers.get(method);
      if (!handler) throw new Error(`No handler for ${method}`);
      return (await handler(params)) ?? {};
    },
  };
}

describe('DOMDomainHandler', () => {
  let window: InstanceType<typeof Window>;
  let registry: NodeRegistry;
  let transport: ReturnType<typeof createMockTransport>;
  let handler: DOMDomainHandler;

  beforeEach(() => {
    window = new Window();
    registry = new NodeRegistry();
    transport = createMockTransport();
    handler = new DOMDomainHandler(transport as any, registry, window.document);
    handler.register();
  });

  describe('DOM.enable', () => {
    it('returns an empty result', async () => {
      const result = await transport.call('DOM.enable');
      expect(result).toEqual({});
    });
  });

  describe('DOM.getDocument', () => {
    it('returns the document tree at default depth', async () => {
      const result = await transport.call('DOM.getDocument');
      const root = result['root'] as any;

      expect(root.nodeType).toBe(9); // DOCUMENT_NODE
      expect(root.nodeName).toBe('#DOCUMENT');
      expect(root.childNodeCount).toBeGreaterThan(0);
    });

    it('respects custom depth', async () => {
      const result = await transport.call('DOM.getDocument', {depth: 0});
      const root = result['root'] as any;

      expect(root.nodeType).toBe(9);
      expect(root.children).toBeUndefined();
    });

    it('registers the document and its children in the registry', async () => {
      await transport.call('DOM.getDocument', {depth: -1});

      expect(registry.has(window.document)).toBe(true);
    });
  });

  describe('DOM.requestChildNodes', () => {
    it('sends children via DOM.setChildNodes event', async () => {
      const div = window.document.createElement('div');
      div.appendChild(window.document.createElement('span'));
      div.appendChild(window.document.createTextNode('hello'));
      window.document.body.appendChild(div);

      const divId = registry.register(div);
      await transport.call('DOM.requestChildNodes', {nodeId: divId});

      // Wait for microtask
      await new Promise((r) => setTimeout(r, 10));

      const event = transport.events.find((e) => e.method === 'DOM.setChildNodes');
      expect(event).toBeDefined();
      expect(event!.params.parentId).toBe(divId);
      expect((event!.params.nodes as any[]).length).toBe(2);
    });

    it('returns empty response (children come via event)', async () => {
      const div = window.document.createElement('div');
      const divId = registry.register(div);

      const result = await transport.call('DOM.requestChildNodes', {nodeId: divId});
      expect(result).toEqual({});
    });
  });

  describe('DOM.querySelector', () => {
    it('returns the matching node ID', async () => {
      const div = window.document.createElement('div');
      div.setAttribute('id', 'target');
      window.document.body.appendChild(div);

      const bodyId = registry.register(window.document.body);
      const result = await transport.call('DOM.querySelector', {
        nodeId: bodyId,
        selector: '#target',
      });

      expect(result['nodeId']).toBeGreaterThan(0);
      expect(registry.getNode(result['nodeId'] as number)).toBe(div);
    });

    it('returns 0 when no match', async () => {
      const bodyId = registry.register(window.document.body);
      const result = await transport.call('DOM.querySelector', {
        nodeId: bodyId,
        selector: '#nonexistent',
      });

      expect(result['nodeId']).toBe(0);
    });
  });

  describe('DOM.querySelectorAll', () => {
    it('returns all matching node IDs', async () => {
      const s1 = window.document.createElement('span');
      const s2 = window.document.createElement('span');
      window.document.body.appendChild(s1);
      window.document.body.appendChild(s2);

      const bodyId = registry.register(window.document.body);
      const result = await transport.call('DOM.querySelectorAll', {
        nodeId: bodyId,
        selector: 'span',
      });

      expect((result['nodeIds'] as number[]).length).toBe(2);
    });
  });

  describe('DOM.getOuterHTML', () => {
    it('returns the outer HTML of an element', async () => {
      const div = window.document.createElement('div');
      div.setAttribute('id', 'test');
      div.appendChild(window.document.createTextNode('hello'));
      window.document.body.appendChild(div);

      const divId = registry.register(div);
      const result = await transport.call('DOM.getOuterHTML', {nodeId: divId});

      expect(result['outerHTML']).toContain('<div');
      expect(result['outerHTML']).toContain('id="test"');
      expect(result['outerHTML']).toContain('hello');
    });
  });

  describe('DOM.setInspectedNode', () => {
    it('tracks the inspected node for $0', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.setInspectedNode', {nodeId: divId});

      expect(handler.inspectedNode).toBe(div);
    });
  });

  describe('DOM.setAttributeValue', () => {
    it('sets an attribute on the target element', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.setAttributeValue', {
        nodeId: divId,
        name: 'class',
        value: 'active',
      });

      expect(div.getAttribute('class')).toBe('active');
    });
  });

  describe('DOM.setAttributesAsText', () => {
    it('parses and applies multiple attributes from text', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.setAttributesAsText', {
        nodeId: divId,
        text: 'class="btn" id="main"',
      });

      expect(div.getAttribute('class')).toBe('btn');
      expect(div.getAttribute('id')).toBe('main');
    });

    it('removes the old attribute when not in new text', async () => {
      const div = window.document.createElement('div');
      div.setAttribute('class', 'old');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.setAttributesAsText', {
        nodeId: divId,
        text: 'id="new"',
        name: 'class',
      });

      expect(div.getAttribute('class')).toBeNull();
      expect(div.getAttribute('id')).toBe('new');
    });

    it('removes attribute when text is empty', async () => {
      const div = window.document.createElement('div');
      div.setAttribute('class', 'old');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.setAttributesAsText', {
        nodeId: divId,
        text: '',
        name: 'class',
      });

      expect(div.getAttribute('class')).toBeNull();
    });
  });

  describe('DOM.removeAttribute', () => {
    it('removes an attribute from an element', async () => {
      const div = window.document.createElement('div');
      div.setAttribute('class', 'active');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.removeAttribute', {nodeId: divId, name: 'class'});

      expect(div.getAttribute('class')).toBeNull();
    });
  });

  describe('DOM.removeNode', () => {
    it('removes a node from the DOM tree', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('DOM.removeNode', {nodeId: divId});

      expect(div.parentNode).toBeNull();
    });
  });

  describe('DOM.setNodeValue', () => {
    it('sets the value of a text node', async () => {
      const text = window.document.createTextNode('hello');
      const div = window.document.createElement('div');
      div.appendChild(text);
      window.document.body.appendChild(div);
      const textId = registry.register(text);

      await transport.call('DOM.setNodeValue', {nodeId: textId, value: 'world'});

      expect(text.data).toBe('world');
    });
  });

  describe('DOM.resolveNode', () => {
    it('returns a basic remote object when no resolver is set', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('DOM.resolveNode', {nodeId: divId});
      const obj = result['object'] as any;

      expect(obj.type).toBe('object');
      expect(obj.subtype).toBe('node');
    });

    it('uses the provided resolver function', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      handler.resolveNodeToRemoteObject = (node) => ({
        type: 'object',
        subtype: 'node',
        description: `Custom:${node.nodeName}`,
        objectId: 'custom-1',
      });

      const result = await transport.call('DOM.resolveNode', {nodeId: divId});
      const obj = result['object'] as any;

      expect(obj.description).toBe('Custom:DIV');
      expect(obj.objectId).toBe('custom-1');
    });
  });

  describe('DOMDebugger.getEventListeners', () => {
    it('returns an empty array for nodes with no listeners', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('DOMDebugger.getEventListeners', {
        objectId: String(divId),
      });

      expect(result['listeners']).toEqual([]);
    });

    it('returns attached event listeners', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);

      div.addEventListener('click', () => {});
      div.addEventListener('keydown', () => {}, {capture: true});

      const divId = registry.register(div);

      const result = await transport.call('DOMDebugger.getEventListeners', {
        objectId: String(divId),
      });

      const listeners = result['listeners'] as any[];
      expect(listeners.length).toBe(2);

      const clickListener = listeners.find((l) => l.type === 'click');
      expect(clickListener).toBeDefined();
      expect(clickListener.useCapture).toBe(false);

      const keydownListener = listeners.find((l) => l.type === 'keydown');
      expect(keydownListener).toBeDefined();
      expect(keydownListener.useCapture).toBe(true);
    });
  });
});
