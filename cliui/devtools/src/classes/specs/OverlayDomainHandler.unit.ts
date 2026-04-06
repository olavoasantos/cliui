import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {NodeRegistry} from '../NodeRegistry';
import {OverlayDomainHandler} from '../OverlayDomainHandler';

import type {CDPEvent, CDPMethodHandler} from '../../types';

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

describe('OverlayDomainHandler', () => {
  let window: InstanceType<typeof Window>;
  let registry: NodeRegistry;
  let transport: ReturnType<typeof createMockTransport>;
  let handler: OverlayDomainHandler;
  const highlightedCells: Array<{x: number; y: number; w: number; h: number}> = [];

  const mockLayoutLookup = (element: any) => {
    // Return a predictable box model for testing
    return {
      x: 0,
      y: 0,
      width: 20,
      height: 5,
      contentX: 2,
      contentY: 1,
      contentWidth: 16,
      contentHeight: 3,
    };
  };

  const mockHighlighter = (x: number, y: number, w: number, h: number) => {
    highlightedCells.push({x, y, w, h});
  };

  beforeEach(() => {
    window = new Window();
    registry = new NodeRegistry();
    transport = createMockTransport();
    highlightedCells.length = 0;
    handler = new OverlayDomainHandler(
      transport as any,
      registry,
      mockLayoutLookup,
      mockHighlighter,
    );
    handler.register();
  });

  describe('Overlay.enable', () => {
    it('returns empty result', async () => {
      const result = await transport.call('Overlay.enable');
      expect(result).toEqual({});
    });
  });

  describe('Overlay.highlightNode', () => {
    it('highlights the box model regions of a node', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('Overlay.highlightNode', {
        nodeId: divId,
        highlightConfig: {
          contentColor: {r: 100, g: 100, b: 255, a: 0.5},
          paddingColor: {r: 100, g: 255, b: 100, a: 0.5},
          borderColor: {r: 255, g: 255, b: 100, a: 0.5},
          marginColor: {r: 255, g: 100, b: 100, a: 0.5},
        },
      });

      // Multiple regions should have been highlighted
      expect(highlightedCells.length).toBeGreaterThan(0);
      expect(handler.currentHighlight).toBe(divId);
    });

    it('highlights content area at correct coordinates', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('Overlay.highlightNode', {
        nodeId: divId,
        highlightConfig: {
          contentColor: {r: 100, g: 100, b: 255, a: 0.5},
          paddingColor: {r: 0, g: 0, b: 0, a: 0},
          borderColor: {r: 0, g: 0, b: 0, a: 0},
          marginColor: {r: 0, g: 0, b: 0, a: 0},
        },
      });

      // Only content region should be highlighted (others have a=0)
      const contentRegion = highlightedCells.find(
        (c) => c.x === 2 && c.y === 1 && c.w === 16 && c.h === 3,
      );
      expect(contentRegion).toBeDefined();
    });

    it('does nothing for non-element nodes', async () => {
      const text = window.document.createTextNode('hello');
      const textId = registry.register(text);

      await transport.call('Overlay.highlightNode', {nodeId: textId});

      expect(highlightedCells.length).toBe(0);
    });
  });

  describe('Overlay.hideHighlight', () => {
    it('clears the current highlight', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('Overlay.highlightNode', {
        nodeId: divId,
        highlightConfig: {
          contentColor: {r: 100, g: 100, b: 255, a: 0.5},
        },
      });
      expect(handler.currentHighlight).toBe(divId);

      await transport.call('Overlay.hideHighlight');
      expect(handler.currentHighlight).toBeNull();
    });
  });

  describe('Overlay.setInspectMode', () => {
    it('enables inspect mode with searchForNode', async () => {
      await transport.call('Overlay.setInspectMode', {mode: 'searchForNode'});
      expect(handler.isInspectMode).toBe(true);
    });

    it('disables inspect mode with none', async () => {
      await transport.call('Overlay.setInspectMode', {mode: 'searchForNode'});
      await transport.call('Overlay.setInspectMode', {mode: 'none'});
      expect(handler.isInspectMode).toBe(false);
    });
  });

  describe('inspectAtCoordinates', () => {
    it('highlights the element and emits nodeHighlightRequested', async () => {
      await transport.call('Overlay.setInspectMode', {mode: 'searchForNode'});

      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      registry.register(div);

      handler.inspectAtCoordinates(div);

      const event = transport.events.find(
        (e) => e.method === 'Overlay.nodeHighlightRequested',
      );
      expect(event).toBeDefined();
      expect(highlightedCells.length).toBeGreaterThan(0);
    });

    it('does nothing when inspect mode is off', () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      registry.register(div);

      handler.inspectAtCoordinates(div);

      expect(transport.events.length).toBe(0);
      expect(highlightedCells.length).toBe(0);
    });
  });

  describe('Overlay.disable', () => {
    it('hides highlight and disables inspect mode', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('Overlay.highlightNode', {
        nodeId: divId,
        highlightConfig: {contentColor: {r: 100, g: 100, b: 255, a: 0.5}},
      });
      await transport.call('Overlay.setInspectMode', {mode: 'searchForNode'});

      await transport.call('Overlay.disable');

      expect(handler.currentHighlight).toBeNull();
      expect(handler.isInspectMode).toBe(false);
    });
  });
});
