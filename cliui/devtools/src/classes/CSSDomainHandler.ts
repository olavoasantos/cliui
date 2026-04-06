import {FRAME_ID} from '../constants';

import type {CDPTransport} from './CDPTransport';
import type {NodeRegistry} from './NodeRegistry';
import type {Element, Document} from '@cliui/dom';
import type {CSSPropertyEntry, SourceRange} from '../types';

/**
 * Interface for the StyleEngine subset needed by the CSS domain.
 * Optional — when absent, computed styles are derived from matched rules.
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
  private readonly styleEngine: StyleEngineAccessor | null;
  private readonly selectorMatcher: SelectorMatcherAccessor;
  private readonly cssParser: CSSParserAccessor;

  /** Maps stylesheet IDs to `<style>` elements. */
  private readonly stylesheetMap = new Map<string, Element>();
  /** Maps virtual inline-style stylesheet IDs to the element they belong to. */
  private readonly inlineStyleMap = new Map<string, Element>();
  private nextStylesheetId = 1;
  private nextInlineId = 1;

  constructor(
    transport: CDPTransport,
    registry: NodeRegistry,
    document: Document,
    styleEngine: StyleEngineAccessor | null,
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
    this.transport.registerMethod('CSS.getEnvironmentVariables', () => ({variables: {}}));
    this.transport.registerMethod('CSS.trackComputedStyleUpdatesForNode', () => ({}));
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
          frameId: FRAME_ID,
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

    // Use the external style engine if available
    if (this.styleEngine) {
      const computed = this.styleEngine.getComputedStyle(node);
      const properties: Array<{name: string; value: string}> = [];
      for (const [name, value] of computed) {
        properties.push({name, value});
      }
      return {computedStyle: properties};
    }

    // Fallback: derive computed style from matched rules + inline styles
    const properties: Array<{name: string; value: string}> = [];
    const seen = new Set<string>();

    // Inline styles take highest priority
    const style = (node as any).style;
    if (style && typeof style.cssText === 'string' && style.cssText) {
      const pairs = style.cssText.split(';').filter((s: string) => s.trim());
      for (const pair of pairs) {
        const colonIndex = pair.indexOf(':');
        if (colonIndex === -1) continue;
        const name = pair.slice(0, colonIndex).trim();
        const value = pair.slice(colonIndex + 1).trim();
        if (!seen.has(name)) {
          properties.push({name, value});
          seen.add(name);
        }
      }
    }

    // Then matched rules (already sorted by specificity)
    const styleElements = this.document.querySelectorAll('style');
    for (let i = 0; i < styleElements.length; i++) {
      const cssText = (styleElements[i] as Element).textContent ?? '';
      if (!cssText) continue;
      const {rules} = this.cssParser.parse(cssText);
      const matched = this.selectorMatcher.match(rules, node);
      for (const m of matched) {
        if (!seen.has(m.declaration.property)) {
          properties.push({name: m.declaration.property, value: m.declaration.value});
          seen.add(m.declaration.property);
        }
      }
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

      // Check if this is an inline style edit
      const inlineElement = this.inlineStyleMap.get(edit.styleSheetId);
      if (inlineElement) {
        // Get the current inline style text
        const currentCssText = (inlineElement as any).style?.cssText ?? '';

        // Apply range-based edit (DevTools sends partial edits as user types)
        const newCssText = edit.range
          ? this.applyInlineRangeEdit(currentCssText, edit.range, edit.text)
          : edit.text;

        (inlineElement as any).style.cssText = newCssText;

        // Build response with correct range
        const newRange = makeRange(0, 0, 0, newCssText.length);
        styles.push({
          styleSheetId: edit.styleSheetId,
          cssProperties: this.parseBodyProperties(newCssText, newRange),
          shorthandEntries: [],
          cssText: newCssText,
          range: newRange,
        });
        continue;
      }

      // Otherwise it's a <style> element edit
      const styleElement = this.stylesheetMap.get(edit.styleSheetId);
      if (!styleElement) {
        // Unknown stylesheet — return a stub so DevTools doesn't crash
        styles.push(this.makeStyleResult(edit.styleSheetId, edit.text));
        continue;
      }

      const currentText = styleElement.textContent ?? '';
      const editRange = edit.range;
      const newFullText = editRange
        ? this.applyRangeEdit(currentText, editRange, edit.text)
        : edit.text;

      styleElement.textContent = newFullText;

      // The response must describe ONLY the edited style (not the whole sheet)
      // with its new range in the updated source.
      const newBodyStart = editRange ? editRange.startColumn : 0;
      const newBodyEnd = newBodyStart + edit.text.length;
      const newRange = makeRange(
        editRange?.startLine ?? 0,
        newBodyStart,
        editRange?.startLine ?? 0,
        newBodyEnd,
      );

      // Parse properties from the edited body text only
      const bodyProperties = this.parseBodyProperties(edit.text, newRange);

      styles.push({
        styleSheetId: edit.styleSheetId,
        cssProperties: bodyProperties,
        shorthandEntries: [],
        cssText: edit.text,
        range: newRange,
      });
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
    let cssText = '';

    if (style) {
      cssText = typeof style.cssText === 'string' ? style.cssText : '';

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

    // Assign a virtual inline-style stylesheet ID so DevTools can edit it
    const inlineId = this.getInlineStylesheetId(element);

    return {
      styleSheetId: inlineId,
      cssProperties: properties,
      shorthandEntries: [],
      cssText,
      range: makeRange(0, 0, Math.max(0, line - 1), cssText.length),
    };
  }

  /**
   * Returns the virtual stylesheet ID for an element's inline style,
   * creating one if this is the first encounter.
   */
  private getInlineStylesheetId(element: Element): string {
    for (const [id, el] of this.inlineStyleMap) {
      if (el === element) return id;
    }
    const id = `inline-${this.nextInlineId++}`;
    this.inlineStyleMap.set(id, element);
    return id;
  }

  /**
   * Gets matched CSS rules for an element from all stylesheets.
   */
  private getMatchedRules(element: Element): unknown[] {
    const result: unknown[] = [];
    const styleElements = this.document.querySelectorAll('style');

    for (let i = 0; i < styleElements.length; i++) {
      const styleEl = styleElements[i] as Element;
      const cssSource = styleEl.textContent ?? '';
      if (!cssSource) continue;

      const stylesheetId = this.getStylesheetId(styleEl);
      const {rules} = this.cssParser.parse(cssSource);

      for (let ruleIdx = 0; ruleIdx < rules.length; ruleIdx++) {
        const rule = rules[ruleIdx];
        const matched = this.selectorMatcher.match([rule], element);

        if (matched.length > 0) {
          const selectorText = this.buildSelectorText(rule.selectors);

          // Locate this rule's body in the source text for accurate ranges
          const bodyRange = this.findRuleBodyRange(cssSource, selectorText, ruleIdx);

          // Extract cssText directly from the source (the text between { and })
          const cssText = this.extractRangeText(cssSource, bodyRange);

          // Build per-property ranges by finding each declaration in the source
          const properties = this.buildPropertyRangesFromSource(
            cssSource,
            bodyRange,
            rule.declarations,
          );

          result.push({
            rule: {
              styleSheetId: stylesheetId,
              selectorList: {
                selectors: [
                  {
                    text: selectorText,
                    range: makeRange(
                      bodyRange.startLine,
                      0,
                      bodyRange.startLine,
                      selectorText.length,
                    ),
                  },
                ],
                text: selectorText,
              },
              style: {
                styleSheetId: stylesheetId,
                cssProperties: properties,
                shorthandEntries: [],
                cssText,
                range: bodyRange,
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
  /**
   * Extracts text from the source corresponding to a SourceRange.
   */
  private extractRangeText(source: string, range: SourceRange): string {
    const lines = source.split('\n');
    if (range.startLine === range.endLine) {
      return (lines[range.startLine] ?? '').slice(range.startColumn, range.endColumn);
    }
    let text = (lines[range.startLine] ?? '').slice(range.startColumn);
    for (let i = range.startLine + 1; i < range.endLine; i++) {
      text += '\n' + (lines[i] ?? '');
    }
    text += '\n' + (lines[range.endLine] ?? '').slice(0, range.endColumn);
    return text;
  }

  /**
   * Builds per-property CSSPropertyEntry items with ranges that point to
   * the actual source positions (not synthesized text).
   */
  private buildPropertyRangesFromSource(
    source: string,
    bodyRange: SourceRange,
    declarations: Array<{property: string; value: string}>,
  ): CSSPropertyEntry[] {
    const bodyText = this.extractRangeText(source, bodyRange);
    const properties: CSSPropertyEntry[] = [];

    for (const decl of declarations) {
      // Find this declaration in the body text
      // Search for "property" followed by ":" and the value
      const propPattern = decl.property;
      const searchStart =
        properties.length > 0
          ? properties[properties.length - 1].range!.endColumn - bodyRange.startColumn
          : 0;

      const propIdx = bodyText.indexOf(propPattern, searchStart);
      if (propIdx === -1) {
        // Fallback: can't find in source, use approximate range
        properties.push({name: decl.property, value: decl.value, range: bodyRange});
        continue;
      }

      // Find the end of this declaration (next ; or end of body)
      const afterProp = bodyText.indexOf(';', propIdx);
      const declEnd = afterProp !== -1 ? afterProp + 1 : bodyText.length;

      properties.push({
        name: decl.property,
        value: decl.value,
        range: makeRange(
          bodyRange.startLine,
          bodyRange.startColumn + propIdx,
          bodyRange.startLine,
          bodyRange.startColumn + declEnd,
        ),
      });
    }

    return properties;
  }

  /**
   * Parses CSS property entries from a rule body string (e.g. "color:red;font-weight:700")
   * and assigns ranges relative to the given body range.
   */
  private parseBodyProperties(bodyText: string, bodyRange: SourceRange): CSSPropertyEntry[] {
    const properties: CSSPropertyEntry[] = [];
    // Split on ; and parse each declaration
    const parts = bodyText.split(';').filter((s) => s.trim());
    let searchPos = 0;

    for (const part of parts) {
      const colonIdx = part.indexOf(':');
      if (colonIdx === -1) continue;
      const name = part.slice(0, colonIdx).trim();
      const value = part.slice(colonIdx + 1).trim();

      // Find this declaration in the body text for accurate range
      const declStart = bodyText.indexOf(name, searchPos);
      const declEnd = bodyText.indexOf(';', declStart);
      const end = declEnd !== -1 ? declEnd + 1 : declStart + part.trimStart().length;

      properties.push({
        name,
        value,
        range: makeRange(
          bodyRange.startLine,
          bodyRange.startColumn + declStart,
          bodyRange.startLine,
          bodyRange.startColumn + end,
        ),
      });
      searchPos = end;
    }
    return properties;
  }

  /**
   * Applies a range edit to inline style text.
   *
   * Inline style ranges are always single-line with column offsets
   * into the cssText string.
   */
  private applyInlineRangeEdit(text: string, range: SourceRange, replacement: string): string {
    const before = text.slice(0, range.startColumn);
    const after = text.slice(range.endColumn);
    return before + replacement + after;
  }

  private emptyStyle(): Record<string, unknown> {
    return {cssProperties: [], shorthandEntries: []};
  }

  /**
   * Finds the source range of a rule's declaration body (`{ ... }`) in the
   * stylesheet text.  Used to produce accurate ranges for `setStyleTexts`.
   */
  private findRuleBodyRange(source: string, _selectorText: string, ruleIndex: number): SourceRange {
    const lines = source.split('\n');
    let braceCount = 0;
    let rulesSeen = 0;

    for (let line = 0; line < lines.length; line++) {
      const text = lines[line];
      for (let col = 0; col < text.length; col++) {
        if (text[col] === '{') {
          if (braceCount === 0) {
            if (rulesSeen === ruleIndex) {
              // Found the opening brace of our rule.
              // The body starts after '{'.
              const startLine = line;
              const startCol = col + 1;

              // Find the matching closing brace
              let depth = 1;
              let endLine = line;
              let endCol = col + 1;
              for (let l = line; l < lines.length && depth > 0; l++) {
                const start = l === line ? col + 1 : 0;
                for (let c = start; c < lines[l].length && depth > 0; c++) {
                  if (lines[l][c] === '{') depth++;
                  else if (lines[l][c] === '}') {
                    depth--;
                    if (depth === 0) {
                      endLine = l;
                      endCol = c;
                    }
                  }
                }
              }

              return makeRange(startLine, startCol, endLine, endCol);
            }
            rulesSeen++;
          }
          braceCount++;
        } else if (text[col] === '}') {
          braceCount--;
        }
      }
    }

    // Fallback — couldn't find the rule, return a zero range
    return makeRange(0, 0, 0, 0);
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
