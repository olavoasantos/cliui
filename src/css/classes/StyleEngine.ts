import {CHILD, HOOKS, NEXT, NodeType} from '../../dom/constants';
import {collectStyleElements} from '../utilities/collectStyleElements';
import {hasLayoutChange} from '../utilities/hasLayoutChange';
import {walkElements} from '../utilities/walkElements';
import {CSSParser} from './CSSParser';
import {SelectorMatcher} from './SelectorMatcher';
import {StyleResolver} from './StyleResolver';

import type {Node} from '../../dom/classes/Node';
import type {Element} from '../../dom/classes/Element';
import type {Document} from '../../dom/classes/Document';
import type {Window} from '../../dom/classes/Window';
import type {HTMLStyleElement} from '../../dom/classes/HTMLStyleElement';
import type {Hooks} from '../../dom/types';
import type {CSSRule, ComputedStyle} from '../types';

/**
 * Orchestrates the full style computation pipeline:
 * collects CSS sources, triggers selector matching and cascade resolution,
 * manages a computed style cache, and exposes an internal getComputedStyle API.
 *
 * Supports dirty-tracking: DOM mutations mark elements as style-dirty via the
 * hooks bridge, and `recomputeDirty()` scopes recomputation to only those
 * elements. When computed styles change, affected elements are marked as
 * layout-dirty for consumption by the layout engine.
 */
export class StyleEngine {
  private readonly parser = new CSSParser();
  private readonly selectorMatcher = new SelectorMatcher();
  private readonly styleResolver = new StyleResolver();
  private readonly cache = new WeakMap<Element, ComputedStyle>();
  private readonly styleDirty = new Set<Element>();
  private readonly layoutDirty = new Set<Element>();
  private document: Document | null = null;
  private parsedRules: CSSRule[] = [];
  private stylesheetsDirty = true;
  private previousHooks: Partial<Hooks> | null = null;

  /**
   * Attaches this engine to a document and wires the hooks bridge so that
   * DOM mutations automatically mark affected elements as style-dirty.
   * Must be called before computing styles.
   */
  attach(document: Document): void {
    this.document = document;
    this.stylesheetsDirty = true;
    this.wireHooks(document.defaultView);
  }

  /**
   * Detaches this engine from its document and removes hooks.
   */
  detach(): void {
    if (this.document) {
      this.unwireHooks(this.document.defaultView);
    }
    this.document = null;
    this.styleDirty.clear();
    this.layoutDirty.clear();
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
   * Marks an element as style-dirty, so its computed style will be
   * recomputed on the next `recomputeDirty()` call.
   */
  markStyleDirty(element: Element): void {
    this.styleDirty.add(element);
  }

  /**
   * Marks all elements in the document tree as style-dirty.
   */
  markAllDirty(): void {
    if (!this.document) return;
    const body = this.document.body;
    if (!body) return;
    this.styleDirty.add(body);
    walkElements(body, (el) => {
      this.styleDirty.add(el);
    });
  }

  /**
   * Returns the set of elements currently marked as style-dirty.
   */
  getDirtyElements(): ReadonlySet<Element> {
    return this.styleDirty;
  }

  /**
   * Returns the set of elements currently marked as layout-dirty.
   * These are elements whose computed styles changed in layout-affecting
   * properties during the last `recomputeDirty()` call.
   */
  getLayoutDirtyElements(): ReadonlySet<Element> {
    return this.layoutDirty;
  }

  /**
   * Clears the layout-dirty set after a layout pass consumes it.
   */
  clearLayoutDirty(): void {
    this.layoutDirty.clear();
  }

  /**
   * Clears both the style-dirty and layout-dirty sets.
   */
  clearDirty(): void {
    this.styleDirty.clear();
    this.layoutDirty.clear();
  }

  /**
   * Recomputes styles only for elements that have been marked as style-dirty.
   * After recomputation, compares old and new computed styles to determine
   * which elements need layout recomputation, and marks those layout-dirty.
   */
  recomputeDirty(): void {
    if (!this.document) return;

    if (this.stylesheetsDirty) {
      this.collectStylesheets();
    }

    this.layoutDirty.clear();

    for (const element of this.styleDirty) {
      const oldStyle = this.cache.get(element);
      this.cache.delete(element);

      const parentStyle = this.getParentComputedStyle(element);
      const matchedDeclarations = this.selectorMatcher.match(this.parsedRules, element);
      const newStyle = this.styleResolver.resolve(matchedDeclarations, element.style, parentStyle);

      this.cache.set(element, newStyle);

      if (hasLayoutChange(oldStyle ?? null, newStyle)) {
        this.layoutDirty.add(element);
      }

      // Also recompute children whose styles depend on this element via inheritance
      this.recomputeChildrenIfNeeded(element, newStyle);
    }

    this.styleDirty.clear();
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
   * Recomputes children of a dirty element that were not themselves marked
   * dirty but may have inherited values that changed.
   */
  private recomputeChildrenIfNeeded(element: Element, parentStyle: ComputedStyle): void {
    let child = (element as unknown as {[CHILD]: Node | undefined})[CHILD];
    while (child) {
      if (child.nodeType === NodeType.ELEMENT_NODE) {
        const childEl = child as unknown as Element;
        if (!this.styleDirty.has(childEl)) {
          const oldChildStyle = this.cache.get(childEl);
          this.cache.delete(childEl);

          const matchedDeclarations = this.selectorMatcher.match(this.parsedRules, childEl);
          const newChildStyle = this.styleResolver.resolve(
            matchedDeclarations,
            childEl.style,
            parentStyle,
          );

          this.cache.set(childEl, newChildStyle);

          if (hasLayoutChange(oldChildStyle ?? null, newChildStyle)) {
            this.layoutDirty.add(childEl);
          }

          // Recurse into grandchildren
          this.recomputeChildrenIfNeeded(childEl, newChildStyle);
        }
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

  /**
   * Wires DOM hooks to automatically mark elements as style-dirty on mutations.
   */
  private wireHooks(window: Window): void {
    const hooks = window[HOOKS] as Partial<Hooks>;
    this.previousHooks = {...hooks};

    const prevSetAttribute = hooks.setAttribute;
    const prevRemoveAttribute = hooks.removeAttribute;
    const prevSetText = hooks.setText;
    const prevInsertChild = hooks.insertChild;
    const prevRemoveChild = hooks.removeChild;

    hooks.setAttribute = (element, name, value, ns) => {
      prevSetAttribute?.(element, name, value, ns);
      if (name === 'class' || name === 'id' || name === 'style') {
        this.markStyleDirty(element);
        // Class/id changes can affect selectors that match descendants
        walkElements(element, (child) => this.markStyleDirty(child));
      } else {
        // Attribute selectors may match on any attribute
        this.markStyleDirty(element);
      }
    };

    hooks.removeAttribute = (element, name, ns) => {
      prevRemoveAttribute?.(element, name, ns);
      if (name === 'class' || name === 'id' || name === 'style') {
        this.markStyleDirty(element);
        walkElements(element, (child) => this.markStyleDirty(child));
      } else {
        this.markStyleDirty(element);
      }
    };

    hooks.setText = (text, data, oldValue) => {
      prevSetText?.(text, data, oldValue);

      const parent = text.parentElement;

      if (parent !== null && parent.nodeType === NodeType.ELEMENT_NODE) {
        this.layoutDirty.add(parent as unknown as Element);
      }
    };

    hooks.insertChild = (parent, node, index) => {
      prevInsertChild?.(parent, node, index);
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        const el = node as unknown as Element;
        this.markStyleDirty(el);
        walkElements(el, (child) => this.markStyleDirty(child));
      }
      // Structural changes can affect sibling selectors and layout
      this.markStyleDirty(parent);
      this.layoutDirty.add(parent);
    };

    hooks.removeChild = (parent, node, index) => {
      prevRemoveChild?.(parent, node, index);
      // Structural changes can affect sibling selectors on remaining children
      this.markStyleDirty(parent);
      this.layoutDirty.add(parent);
      walkElements(parent, (child) => this.markStyleDirty(child));
    };
  }

  /**
   * Removes hooks wired by this engine, restoring previous hooks.
   */
  private unwireHooks(window: Window): void {
    if (this.previousHooks) {
      const hooks = window[HOOKS] as Partial<Hooks>;
      hooks.setAttribute = this.previousHooks.setAttribute;
      hooks.removeAttribute = this.previousHooks.removeAttribute;
      hooks.setText = this.previousHooks.setText;
      hooks.insertChild = this.previousHooks.insertChild;
      hooks.removeChild = this.previousHooks.removeChild;
      this.previousHooks = null;
    }
  }
}
