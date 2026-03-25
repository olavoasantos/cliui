import {CHILD, NEXT, NodeType} from '../../dom/constants/index';
import {CSSParser} from './CSSParser';
import {SelectorMatcher} from './SelectorMatcher';
import {StyleResolver} from './StyleResolver';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';
import type {Document} from '../../dom/classes/Document';
import type {HTMLStyleElement} from '../../dom/classes/HTMLStyleElement';
import type {CSSRule, ComputedStyle} from '../types/index';

/**
 * Orchestrates the full style computation pipeline:
 * collects CSS sources, triggers selector matching and cascade resolution,
 * manages a computed style cache, and exposes an internal getComputedStyle API.
 */
export class StyleEngine {
  private readonly parser = new CSSParser();
  private readonly selectorMatcher = new SelectorMatcher();
  private readonly styleResolver = new StyleResolver();
  private readonly cache = new WeakMap<Element, ComputedStyle>();
  private document: Document | null = null;
  private parsedRules: CSSRule[] = [];
  private stylesheetsDirty = true;

  /**
   * Attaches this engine to a document. Must be called before computing styles.
   */
  attach(document: Document): void {
    this.document = document;
    this.stylesheetsDirty = true;
  }

  /**
   * Marks stylesheets as dirty, forcing re-parsing on next computation.
   * Call when `<style>` elements are added, removed, or their content changes.
   */
  invalidateStylesheets(): void {
    this.stylesheetsDirty = true;
  }

  /**
   * Invalidates the cached computed style for an element, causing
   * recomputation on the next getComputedStyle call.
   */
  invalidateElement(element: Element): void {
    this.cache.delete(element);
  }

  /**
   * Invalidates the computed style cache for an element and all its descendants.
   */
  invalidateSubtree(element: Element): void {
    this.cache.delete(element);
    walkElements(element, (child) => {
      this.cache.delete(child);
    });
  }

  /**
   * Returns the computed style for an element. Uses the cache if available;
   * otherwise computes from scratch by running the full pipeline.
   */
  getComputedStyle(element: Element): ComputedStyle {
    const cached = this.cache.get(element);
    if (cached) return cached;

    if (this.stylesheetsDirty) {
      this.collectStylesheets();
    }

    const parentStyle = this.getParentComputedStyle(element);
    const matchedDeclarations = this.selectorMatcher.match(this.parsedRules, element);
    const computed = this.styleResolver.resolve(matchedDeclarations, element.style, parentStyle);

    this.cache.set(element, computed);
    return computed;
  }

  /**
   * Computes styles for the entire document tree, populating the cache.
   */
  computeAll(): void {
    if (!this.document) return;

    if (this.stylesheetsDirty) {
      this.collectStylesheets();
    }

    const body = this.document.body;
    if (body) {
      this.computeElement(body, null);
    }
  }

  /**
   * Collects and parses CSS text from all `<style>` elements in the document.
   */
  private collectStylesheets(): void {
    this.parsedRules = [];
    this.stylesheetsDirty = false;

    if (!this.document) return;

    const styleElements = collectStyleElements(this.document);
    for (const styleEl of styleElements) {
      const cssText = (styleEl as HTMLStyleElement).sheet;
      if (cssText) {
        const rules = this.parser.parse(cssText);
        this.parsedRules.push(...rules);
      }
    }
  }

  /**
   * Recursively computes styles for an element and its children.
   */
  private computeElement(element: Element, parentStyle: ComputedStyle | null): void {
    const matchedDeclarations = this.selectorMatcher.match(this.parsedRules, element);
    const computed = this.styleResolver.resolve(matchedDeclarations, element.style, parentStyle);
    this.cache.set(element, computed);

    // Recurse into children
    let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];
    while (child) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        this.computeElement(child as unknown as Element, computed);
      }
      child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
    }
  }

  /**
   * Gets the parent element's computed style, computing it if necessary.
   */
  private getParentComputedStyle(element: Element): ComputedStyle | null {
    const parent = element.parentElement as Element | null;
    if (!parent) return null;
    return this.getComputedStyle(parent);
  }
}

/**
 * Walks all element descendants of a given element, invoking the callback on each.
 */
function walkElements(element: Element, callback: (el: Element) => void): void {
  let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];
  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const el = child as unknown as Element;
      callback(el);
      walkElements(el, callback);
    }
    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }
}

/**
 * Collects all `<style>` elements from the document.
 */
function collectStyleElements(document: Document): Element[] {
  const elements: Element[] = [];
  const head = document.head;
  if (!head) return elements;

  let child = (head as unknown as {[CHILD]: Node | undefined})[CHILD];
  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const el = child as unknown as Element;
      if (el.localName === 'style') {
        elements.push(el);
      }
    }
    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }

  // Also check body for <style> elements (less common but valid)
  const body = document.body;
  if (body) {
    walkAndCollectStyle(body, elements);
  }

  return elements;
}

/**
 * Recursively walks a subtree collecting `<style>` elements.
 */
function walkAndCollectStyle(element: Element, elements: Element[]): void {
  let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];
  while (child) {
    if (child.nodeType === NodeType.ELEMENT_NODE) {
      const el = child as unknown as Element;
      if (el.localName === 'style') {
        elements.push(el);
      } else {
        walkAndCollectStyle(el, elements);
      }
    }
    child = (child as unknown as {[NEXT]: Node | undefined})[NEXT];
  }
}
