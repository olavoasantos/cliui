import {describe, it, expect, beforeEach} from 'vitest';
import {Window} from '@cliui/dom';
import {StyleEngine} from '@cliui/terminal/core';
import {SelectorMatcher} from '@cliui/terminal/css';
import {CSSParser} from '@cliui/terminal/css';
import {NodeRegistry} from '../NodeRegistry';
import {CSSDomainHandler} from '../CSSDomainHandler';

import type {CDPEvent, CDPMethodHandler, CSSPropertyEntry} from '../../types';

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

describe('CSSDomainHandler', () => {
  let window: InstanceType<typeof Window>;
  let registry: NodeRegistry;
  let transport: ReturnType<typeof createMockTransport>;
  let styleEngine: StyleEngine;
  let handler: CSSDomainHandler;

  beforeEach(() => {
    window = new Window();
    registry = new NodeRegistry();
    transport = createMockTransport();
    styleEngine = new StyleEngine();
    styleEngine.attach(window.document);
    handler = new CSSDomainHandler(
      transport as any,
      registry,
      window.document,
      styleEngine,
      new SelectorMatcher(),
      new CSSParser(),
    );
    handler.register();
  });

  describe('CSS.enable', () => {
    it('returns empty result and discovers existing stylesheets', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.test { color: red; }';
      window.document.head.appendChild(style);

      const result = await transport.call('CSS.enable');
      expect(result).toEqual({});

      const addedEvent = transport.events.find((e) => e.method === 'CSS.styleSheetAdded');
      expect(addedEvent).toBeDefined();
    });
  });

  describe('CSS.getComputedStyleForNode', () => {
    it('returns computed style properties', async () => {
      const div = window.document.createElement('div');
      div.style.color = 'red';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('CSS.getComputedStyleForNode', {nodeId: divId});
      const computed = result['computedStyle'] as Array<{name: string; value: string}>;

      expect(computed.length).toBeGreaterThan(0);
      const colorProp = computed.find((p) => p.name === 'color');
      expect(colorProp).toBeDefined();
    });
  });

  describe('CSS.getInlineStylesForNode', () => {
    it('returns inline style properties', async () => {
      const div = window.document.createElement('div');
      div.style.color = 'red';
      div.style.fontWeight = 'bold';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('CSS.getInlineStylesForNode', {nodeId: divId});
      const inlineStyle = result['inlineStyle'] as {cssProperties: CSSPropertyEntry[]};

      expect(inlineStyle.cssProperties.length).toBeGreaterThan(0);
      const colorProp = inlineStyle.cssProperties.find((p) => p.name === 'color');
      expect(colorProp).toBeDefined();
      expect(colorProp!.value).toBe('red');
    });

    it('includes range objects on all properties', async () => {
      const div = window.document.createElement('div');
      div.style.color = 'red';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('CSS.getInlineStylesForNode', {nodeId: divId});
      const inlineStyle = result['inlineStyle'] as {cssProperties: CSSPropertyEntry[]};

      for (const prop of inlineStyle.cssProperties) {
        expect(prop.range).toBeDefined();
        expect(typeof prop.range!.startLine).toBe('number');
        expect(typeof prop.range!.startColumn).toBe('number');
        expect(typeof prop.range!.endLine).toBe('number');
        expect(typeof prop.range!.endColumn).toBe('number');
      }
    });
  });

  describe('CSS.getMatchedStylesForNode', () => {
    it('returns matched rules from style elements', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.highlight { font-weight: bold; }';
      window.document.head.appendChild(style);

      const div = window.document.createElement('div');
      div.className = 'highlight';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      // Trigger style computation
      styleEngine.getComputedStyle(div);

      const result = await transport.call('CSS.getMatchedStylesForNode', {nodeId: divId});
      const matched = result['matchedCSSRules'] as any[];

      const highlightRule = matched.find((m: any) =>
        m.rule.selectorList.text.includes('highlight'),
      );
      expect(highlightRule).toBeDefined();
      expect(highlightRule.rule.style.cssProperties.length).toBeGreaterThan(0);
    });

    it('returns inline style separately', async () => {
      const div = window.document.createElement('div');
      div.style.color = 'blue';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('CSS.getMatchedStylesForNode', {nodeId: divId});
      const inlineStyle = result['inlineStyle'] as {cssProperties: CSSPropertyEntry[]};

      const colorProp = inlineStyle.cssProperties.find((p) => p.name === 'color');
      expect(colorProp).toBeDefined();
      expect(colorProp!.value).toBe('blue');
    });

    it('returns inherited styles from ancestors', async () => {
      const parent = window.document.createElement('div');
      parent.style.color = 'green';
      window.document.body.appendChild(parent);

      const child = window.document.createElement('span');
      parent.appendChild(child);
      const childId = registry.register(child);

      const result = await transport.call('CSS.getMatchedStylesForNode', {nodeId: childId});
      const inherited = result['inherited'] as any[];

      expect(inherited.length).toBeGreaterThan(0);
    });
  });

  describe('CSS.getStyleSheetText', () => {
    it('returns the CSS text of a style element', async () => {
      const style = window.document.createElement('style');
      const cssText = '.app { display: flex; }';
      style.textContent = cssText;
      window.document.head.appendChild(style);

      const sheetId = handler.getStylesheetId(style);

      const result = await transport.call('CSS.getStyleSheetText', {styleSheetId: sheetId});
      expect(result['text']).toBe(cssText);
    });
  });

  describe('CSS.setStyleTexts', () => {
    it('updates a stylesheet element text content', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.old { color: red; }';
      window.document.head.appendChild(style);

      const sheetId = handler.getStylesheetId(style);
      const newCSS = '.new { color: blue; }';

      await transport.call('CSS.setStyleTexts', {
        edits: [{styleSheetId: sheetId, text: newCSS}],
      });

      expect(style.textContent).toBe(newCSS);
    });

    it('updates inline style on a node', async () => {
      const div = window.document.createElement('div');
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      await transport.call('CSS.setStyleTexts', {
        edits: [{nodeId: divId, text: 'color: red; font-weight: bold'}],
      });

      expect(div.getAttribute('style')).toBe('color: red; font-weight: bold');
    });
  });

  describe('stylesheet events', () => {
    it('emits styleSheetAdded event', () => {
      const style = window.document.createElement('style');
      style.textContent = '.test {}';

      handler.emitStyleSheetAdded(style);

      const event = transport.events.find((e) => e.method === 'CSS.styleSheetAdded');
      expect(event).toBeDefined();
      expect((event!.params.header as any).origin).toBe('regular');
    });

    it('emits styleSheetRemoved event', () => {
      const style = window.document.createElement('style');
      handler.getStylesheetId(style); // Register it first
      handler.emitStyleSheetRemoved(style);

      const event = transport.events.find((e) => e.method === 'CSS.styleSheetRemoved');
      expect(event).toBeDefined();
    });
  });
});
