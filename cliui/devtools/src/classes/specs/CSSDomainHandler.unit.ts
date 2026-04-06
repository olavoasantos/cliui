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

    it('includes cssText and range on matched rule style objects', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.box { color: red; font-weight: bold; }';
      window.document.head.appendChild(style);

      const div = window.document.createElement('div');
      div.className = 'box';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      const result = await transport.call('CSS.getMatchedStylesForNode', {nodeId: divId});
      const matched = result['matchedCSSRules'] as any[];
      const boxRule = matched.find((m: any) => m.rule.selectorList.text.includes('box'));

      expect(boxRule).toBeDefined();
      // DevTools requires cssText and range on rule.style to enable editing
      expect(boxRule.rule.style.cssText).toBeDefined();
      expect(typeof boxRule.rule.style.cssText).toBe('string');
      expect(boxRule.rule.style.cssText).toContain('color');
      expect(boxRule.rule.style.range).toBeDefined();
      expect(typeof boxRule.rule.style.range.startLine).toBe('number');
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
    it('updates stylesheet text content', async () => {
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

    it('round-trips: getMatchedStyles returns data that setStyleTexts can use', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.card { color: red; }';
      window.document.head.appendChild(style);

      const div = window.document.createElement('div');
      div.className = 'card';
      window.document.body.appendChild(div);
      const divId = registry.register(div);

      // 1. Get matched styles (what DevTools reads)
      const matched = await transport.call('CSS.getMatchedStylesForNode', {nodeId: divId});
      const rules = matched['matchedCSSRules'] as any[];
      const cardRule = rules.find((r: any) => r.rule.selectorList.text.includes('card'));
      expect(cardRule).toBeDefined();

      // 2. Use the returned styleSheetId and range to send an edit (what DevTools sends)
      const ruleStyle = cardRule.rule.style;
      expect(ruleStyle.styleSheetId).toBeDefined();
      expect(ruleStyle.range).toBeDefined();

      const editResult = await transport.call('CSS.setStyleTexts', {
        edits: [{
          styleSheetId: ruleStyle.styleSheetId,
          range: ruleStyle.range,
          text: 'color: blue;',
        }],
      });

      // 3. The edit should succeed and return a styles array
      const styles = editResult['styles'] as any[];
      expect(styles.length).toBe(1);
      expect(styles[0].cssText).toBe('color: blue;');
    });

    it('setStyleTexts response has correct range for subsequent edits', async () => {
      const style = window.document.createElement('style');
      style.textContent = '.a{color:red}.b{padding:1}';
      window.document.head.appendChild(style);

      const div = window.document.createElement('div');
      div.className = 'a';
      window.document.body.appendChild(div);
      registry.register(div);

      const matched = await transport.call('CSS.getMatchedStylesForNode', {nodeId: registry.getId(div)!});
      const aRule = (matched['matchedCSSRules'] as any[]).find((r: any) => r.rule.selectorList.text.includes('.a'));
      const ruleStyle = aRule.rule.style;

      // First edit
      const editResult = await transport.call('CSS.setStyleTexts', {
        edits: [{styleSheetId: ruleStyle.styleSheetId, range: ruleStyle.range, text: 'color:blue'}],
      });

      const resultStyle = editResult['styles'][0] as any;

      // Response cssText should be ONLY the edited rule body, not the whole sheet
      expect(resultStyle.cssText).toBe('color:blue');

      // Response range should point to where the body is NOW in the updated source
      const newSrc = style.textContent!;
      expect(newSrc).toBe('.a{color:blue}.b{padding:1}');
      const bodyFromRange = newSrc.slice(resultStyle.range.startColumn, resultStyle.range.endColumn);
      expect(bodyFromRange).toBe('color:blue');

      // Response properties should be only from this rule, not the whole sheet
      expect(resultStyle.cssProperties.length).toBe(1);
      expect(resultStyle.cssProperties[0].name).toBe('color');

      // Second edit using the response range should also work
      const editResult2 = await transport.call('CSS.setStyleTexts', {
        edits: [{styleSheetId: ruleStyle.styleSheetId, range: resultStyle.range, text: 'color:green'}],
      });
      expect(style.textContent).toBe('.a{color:green}.b{padding:1}');
      expect(editResult2['styles'][0].cssText).toBe('color:green');
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

describe('CSS range accuracy with minified CSS', () => {
  let window2: InstanceType<typeof Window>;
  let registry2: NodeRegistry;
  let transport2: ReturnType<typeof createMockTransport>;
  let handler2: CSSDomainHandler;

  beforeEach(() => {
    window2 = new Window();
    registry2 = new NodeRegistry();
    transport2 = createMockTransport();
    const se = new StyleEngine();
    se.attach(window2.document);
    handler2 = new CSSDomainHandler(transport2 as any, registry2, window2.document, se, new SelectorMatcher(), new CSSParser());
    handler2.register();
  });

  it('property ranges accurately point to the source text', async () => {
    const style = window2.document.createElement('style');
    // Minified CSS — no spaces after colons, no newlines
    style.textContent = '.box{color:#c4b5fd;font-weight:700}';
    window2.document.head.appendChild(style);

    const div = window2.document.createElement('div');
    div.className = 'box';
    window2.document.body.appendChild(div);
    registry2.register(div);

    const result = await transport2.call('CSS.getMatchedStylesForNode', {nodeId: registry2.getId(div)!});
    const rules = result['matchedCSSRules'] as any[];
    const boxRule = rules.find((r: any) => r.rule.selectorList.text.includes('box'));
    expect(boxRule).toBeDefined();

    const src = style.textContent!;
    const ruleStyle = boxRule.rule.style;

    // Rule-level cssText should be the actual source between { and }
    const bodyFromRange = src.slice(ruleStyle.range.startColumn, ruleStyle.range.endColumn);
    expect(bodyFromRange).toBe('color:#c4b5fd;font-weight:700');

    // Property-level ranges should point to exact positions in the source
    for (const prop of ruleStyle.cssProperties) {
      const propFromRange = src.slice(prop.range.startColumn, prop.range.endColumn);
      // The range should cover exactly "property:value;" or "property:value" for the last one
      expect(propFromRange).toContain(prop.name);
      expect(propFromRange).toContain(prop.value);
    }
  });

  it('setStyleTexts with rule range produces valid CSS', async () => {
    const style = window2.document.createElement('style');
    style.textContent = '.a{color:red}.b{padding:1}';
    window2.document.head.appendChild(style);

    const div = window2.document.createElement('div');
    div.className = 'a';
    window2.document.body.appendChild(div);
    registry2.register(div);

    const result = await transport2.call('CSS.getMatchedStylesForNode', {nodeId: registry2.getId(div)!});
    const aRule = (result['matchedCSSRules'] as any[]).find((r: any) => r.rule.selectorList.text.includes('.a'));
    const ruleStyle = aRule.rule.style;

    // Edit: replace the rule body with new text
    await transport2.call('CSS.setStyleTexts', {
      edits: [{styleSheetId: ruleStyle.styleSheetId, range: ruleStyle.range, text: 'color:blue'}],
    });

    // The .b rule should be intact
    expect(style.textContent).toBe('.a{color:blue}.b{padding:1}');
  });
});
