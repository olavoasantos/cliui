import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Element, Document} from '@cliui/dom';
import type {CSSPropertyEntry, SourceRange} from '../types';

/**
 * Interface for the StyleEngine subset needed by the CSS domain.
 */
interface StyleEngineAccessor {
  getComputedStyle(element: Element): Map<string, string>;
}

/**
 * Interface for SelectorMatcher subset.
 */
interface SelectorMatcherAccessor {
  match(
    rules: Array<{selectors: unknown[][]; declarations: Array<{property: string; value: string}>}>,
    element: Element,
  ): Array<{
    declaration: {property: string; value: string};
    specificity: [number, number, number];
    order: number;
  }>;
}

/**
 * Interface for CSSParser subset.
 */
interface CSSParserAccessor {
  parse(css: string): {
    rules: Array<{selectors: unknown[][]; declarations: Array<{property: string; value: string}>}>;
  };
}

/**
 * CDP CSS domain handler for style inspection.
 *
 * Returns real matched rules from the SelectorMatcher with selectors and
 * specificity, real computed values from StyleEngine.getComputedStyle(),
 * and inline style properties.
 *
 * This is where terminal-dom's architecture pays off — instead of stubbing,
 * the CSS domain returns genuinely correct data from the cascade.
 */
export class CSSDomainHandler {
  private readonly transport: CDPTransport;
  private readonly registry: NodeRegistry;
  private readonly document: Document;
  private readonly styleEngine: StyleEngineAccessor;
  private readonly selectorMatcher: SelectorMatcherAccessor;
  private readonly cssParser: CSSParserAccessor;

  /** Maps stylesheet IDs to `<style>` elements. */
  private readonly stylesheetMap = new Map<string, Element>();
  private nextStylesheetId = 1;

  constructor(
    transport: CDPTransport,
    registry: NodeRegistry,
    document: Document,
    styleEngine: StyleEngineAccessor,
    selectorMatcher: SelectorMatcherAccessor,
    cssParser: CSSParserAccessor,
  ) {
    this.transport = transport;
    this.registry = registry;
    this.document = document;
    this.styleEngine = styleEngine;
    this.selectorMatcher = selectorMatcher;
    this.cssParser = cssParser;
  }

  /** Registers all CSS domain method handlers with the transport. */
  register(): void {
    this.transport.registerMethod('CSS.enable', () => this.enable());
    this.transport.registerMethod('CSS.disable', () => ({}));
    this.transport.registerMethod('CSS.getMatchedStylesForNode', (params) =>
      this.getMatchedStylesForNode(params),
    );
    this.transport.registerMethod('CSS.getComputedStyleForNode', (params) =>
      this.getComputedStyleForNode(params),
    );
    this.transport.registerMethod('CSS.getInlineStylesForNode', (params) =>
      this.getInlineStylesForNode(params),
    );
    this.transport.registerMethod('CSS.getStyleSheetText', (params) =>
      this.getStyleSheetText(params),
    );
    this.transport.registerMethod('CSS.setStyleTexts', (params) => this.setStyleTexts(params));
  }

  /**
   * Returns the stylesheet ID for a `<style>` element, assigning one if new.
   */
  getStylesheetId(styleElement: Element): string {
    for (const [id, el] of this.stylesheetMap) {
      if (el === styleElement) return id;
    }
    const id = `stylesheet-${this.nextStylesheetId++}`;
    this.stylesheetMap.set(id, styleElement);
    return id;
  }

  /**
   * Emits a `CSS.styleSheetAdded` event for a `<style>` element.
   */
  emitStyleSheetAdded(styleElement: Element): void {
    const id = this.getStylesheetId(styleElement);
    this.transport.broadcastEvent({
      method: 'CSS.styleSheetAdded',
      params: {
        header: {
          styleSheetId: id,
          frameId: 'main',
          sourceURL: '',
          origin: 'regular',
          title: '',
          disabled: false,
          isInline: true,
          startLine: 0,
          startColumn: 0,
          length: (styleElement.textContent ?? '').length,
        },
      },
    });
  }

  /**
   * Emits a `CSS.styleSheetRemoved` event for a `<style>` element.
   */
  emitStyleSheetRemoved(styleElement: Element): void {
    for (const [id, el] of this.stylesheetMap) {
      if (el === styleElement) {
        this.transport.broadcastEvent({
          method: 'CSS.styleSheetRemoved',
          params: {styleSheetId: id},
        });
        this.stylesheetMap.delete(id);
        return;
      }
    }
  }

  /**
   * `CSS.enable` — initializes the domain and discovers existing stylesheets.
   */
  private enable(): Record<string, unknown> {
    // Discover existing <style> elements
    const styleElements = this.document.querySelectorAll('style');
    for (let i = 0; i < styleElements.length; i++) {
      this.emitStyleSheetAdded(styleElements[i] as Element);
    }
    return {};
  }

  /**
   * `CSS.getMatchedStylesForNode` — returns matched CSS rules, inline styles,
   * and inherited styles for a node.
   */
  private getMatchedStylesForNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (!node || node.nodeType !== 1) {
      return {matchedCSSRules: [], inlineStyle: this.emptyStyle(), inherited: []};
    }

    // Get inline style
    const inlineStyle = this.getInlineStyleObject(node);

    // Get matched rules from all stylesheets
    const matchedCSSRules = this.getMatchedRules(node);

    // Get inherited styles from ancestors
    const inherited = this.getInheritedStyles(node);

    return {inlineStyle, matchedCSSRules, inherited};
  }

  /**
   * `CSS.getComputedStyleForNode` — returns all computed properties.
   */
  private getComputedStyleForNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (!node || node.nodeType !== 1) {
      return {computedStyle: []};
    }

    const computed = this.styleEngine.getComputedStyle(node);
    const properties: Array<{name: string; value: string}> = [];

    for (const [name, value] of computed) {
      properties.push({name, value});
    }

    return {computedStyle: properties};
  }

  /**
   * `CSS.getInlineStylesForNode` — returns only inline style properties.
   */
  private getInlineStylesForNode(params: Record<string, unknown>): Record<string, unknown> {
    const nodeId = params['nodeId'] as number;
    const node = this.registry.getNode(nodeId) as Element | undefined;

    if (!node || node.nodeType !== 1) {
      return {inlineStyle: this.emptyStyle()};
    }

    return {inlineStyle: this.getInlineStyleObject(node)};
  }

  /**
   * `CSS.getStyleSheetText` — returns the CSS text of a `<style>` element.
   */
  private getStyleSheetText(params: Record<string, unknown>): Record<string, unknown> {
    const styleSheetId = params['styleSheetId'] as string;
    const styleElement = this.stylesheetMap.get(styleSheetId);

    if (styleElement) {
      return {text: styleElement.textContent ?? ''};
    }

    return {text: ''};
  }

  /**
   * `CSS.setStyleTexts` — applies style edits.
   *
   * DevTools sends edits as `{styleSheetId, range, text}` objects.
   * Each edit replaces the text within `range` of the stylesheet.
   */
  private setStyleTexts(params: Record<string, unknown>): Record<string, unknown> {
    const edits = params['edits'] as
      | Array<{
          styleSheetId?: string;
          range?: SourceRange;
          text: string;
        }>
      | undefined;

    const styles = [];

    for (const edit of edits ?? []) {
      if (!edit.styleSheetId) continue;

      const styleElement = this.stylesheetMap.get(edit.styleSheetId);
      if (!styleElement) {
        // Unknown stylesheet — return a stub so DevTools doesn't crash
        styles.push(this.makeStyleResult(edit.styleSheetId, edit.text));
        continue;
      }

      const currentText = styleElement.textContent ?? '';
      const newText = edit.range
        ? this.applyRangeEdit(currentText, edit.range, edit.text)
        : edit.text;

      styleElement.textContent = newText;
      styles.push(this.makeStyleResult(edit.styleSheetId, newText));
    }

    return {styles};
  }

  /**
   * Applies a range edit to CSS text, replacing characters between
   * `range.startLine:startColumn` and `range.endLine:endColumn`.
   */
  private applyRangeEdit(text: string, range: SourceRange, replacement: string): string {
    const lines = text.split('\n');
    const before =
      lines.slice(0, range.startLine).join('\n') +
      (range.startLine > 0 ? '\n' : '') +
      (lines[range.startLine]?.slice(0, range.startColumn) ?? '');
    const after =
      (lines[range.endLine]?.slice(range.endColumn) ?? '') +
      (range.endLine < lines.length - 1 ? '\n' : '') +
      lines.slice(range.endLine + 1).join('\n');
    return before + replacement + after;
  }

  /**
   * Builds a CSSStyle result object from stylesheet text.
   */
  private makeStyleResult(styleSheetId: string, cssText: string): Record<string, unknown> {
    const properties = this.parseCSSProperties(cssText);
    return {
      styleSheetId,
      cssProperties: properties,
      shorthandEntries: [],
      cssText,
      range: makeRange(0, 0, cssText.split('\n').length - 1, cssText.length),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────

  /**
   * Returns the inline style properties of an element.
   */
  private getInlineStyleObject(element: Element): Record<string, unknown> {
    const style = (element as any).style;
    const properties: CSSPropertyEntry[] = [];
    let line = 0;

    if (style) {
      const cssText = typeof style.cssText === 'string' ? style.cssText : '';

      if (cssText) {
        const pairs = cssText.split(';').filter((s: string) => s.trim());
        for (const pair of pairs) {
          const colonIndex = pair.indexOf(':');
          if (colonIndex === -1) continue;
          const name = pair.slice(0, colonIndex).trim();
          const value = pair.slice(colonIndex + 1).trim();
          properties.push({
            name,
            value,
            range: makeRange(line, 0, line, pair.length),
          });
          line++;
        }
      }
    }

    return {
      styleSheetId: undefined,
      cssProperties: properties,
      shorthandEntries: [],
    };
  }

  /**
   * Gets matched CSS rules for an element from all stylesheets.
   */
  private getMatchedRules(element: Element): unknown[] {
    const result: unknown[] = [];
    const styleElements = this.document.querySelectorAll('style');

    for (let i = 0; i < styleElements.length; i++) {
      const styleEl = styleElements[i] as Element;
      const cssText = styleEl.textContent ?? '';
      if (!cssText) continue;

      const stylesheetId = this.getStylesheetId(styleEl);
      const {rules} = this.cssParser.parse(cssText);

      for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
        const rule = rules[ruleIdx];
        const matched = this.selectorMatcher.match([rule], element);

        if (matched.length > 0) {
          // Build selector text from the rule
          const selectorText = this.buildSelectorText(rule.selectors);
          const properties: CSSPropertyEntry[] = [];

          for (let d = 0; d < rule.declarations.length; d++) {
            const decl = rule.declarations[d];
            properties.push({
              name: decl.property,
              value: decl.value,
              range: makeRange(ruleIdx, 0, ruleIdx, `${decl.property}: ${decl.value}`.length),
            });
          }

          result.push({
            rule: {
              styleSheetId: stylesheetId,
              selectorList: {
                selectors: [
                  {text: selectorText, range: makeRange(ruleIdx, 0, ruleIdx, selectorText.length)},
                ],
                text: selectorText,
              },
              style: {
                styleSheetId: stylesheetId,
                cssProperties: properties,
                shorthandEntries: [],
              },
            },
            matchingSelectors: [0],
          });
        }
      }
    }

    return result;
  }

  /**
   * Gets inherited styles from ancestor elements.
   */
  private getInheritedStyles(element: Element): unknown[] {
    const inherited: unknown[] = [];
    let ancestor = element.parentElement as Element | null;

    while (ancestor) {
      const inlineStyle = this.getInlineStyleObject(ancestor);
      const matchedRules = this.getMatchedRules(ancestor);

      inherited.push({
        inlineStyle,
        matchedCSSRules: matchedRules,
      });

      ancestor = ancestor.parentElement as Element | null;
    }

    return inherited;
  }

  /**
   * Builds a CSS selector text string from parsed selector parts.
   */
  private buildSelectorText(selectors: unknown[][]): string {
    const parts: string[] = [];

    for (const selectorParts of selectors) {
      const selectorStr = selectorParts
        .map((part: any) => {
          const matchers = part.matchers ?? [];
          let str = '';
          for (const m of matchers) {
            switch (m.type) {
              case 1: // Element
                str += m.name ?? '';
                break;
              case 2: // Id
                str += `#${m.name ?? ''}`;
                break;
              case 3: // Class
                str += `.${m.name ?? ''}`;
                break;
              case 4: // Attribute
                str += `[${m.name ?? ''}${m.value ? `="${m.value}"` : ''}]`;
                break;
              case 5: // Pseudo
                str += `:${m.name ?? ''}`;
                break;
              case 6: // Function
                str += `:${m.name ?? ''}(${m.value ?? ''})`;
                break;
              default:
                str += m.name ?? '';
            }
          }
          if (part.combinator === 1) str = ' > ' + str;
          else if (part.combinator === 2) str = ' ~ ' + str;
          else if (part.combinator === 3) str = ' + ' + str;
          else if (part.combinator === 0) str = ' ' + str;
          // combinator 4 (Inner) = same compound selector, no separator
          return str;
        })
        .join('');
      parts.push(selectorStr);
    }

    return parts.join(', ');
  }

  /**
   * Parses CSS properties from a stylesheet text.
   */
  private parseCSSProperties(cssText: string): CSSPropertyEntry[] {
    const properties: CSSPropertyEntry[] = [];
    const {rules} = this.cssParser.parse(cssText);
    let line = 0;

    for (const rule of rules) {
      for (const decl of rule.declarations) {
        properties.push({
          name: decl.property,
          value: decl.value,
          range: makeRange(line, 0, line, `${decl.property}: ${decl.value}`.length),
        });
        line++;
      }
    }

    return properties;
  }

  /** Creates an empty style object. */
  private emptyStyle(): Record<string, unknown> {
    return {cssProperties: [], shorthandEntries: []};
  }
}

/**
 * Creates a CDP SourceRange object.
 */
function makeRange(
  startLine: number,
  startColumn: number,
  endLine: number,
  endColumn: number,
): SourceRange {
  return {startLine, startColumn, endLine, endColumn};
}
