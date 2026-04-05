import {CHILD, HOOKS, NEXT, NodeType} from '@cliui/dom';
import {USER_AGENT_STYLESHEET} from '../constants/userAgentStylesheet';
import {collectStyleElements} from '../utilities/collectStyleElements';
import {hasLayoutChange} from '../utilities/hasLayoutChange';
import {walkElements} from '../utilities/walkElements';
import {AnimationController} from './AnimationController';
import {CSSParser} from './CSSParser';
import {SelectorMatcher} from './SelectorMatcher';
import {StyleResolver} from './StyleResolver';
import {TransitionController} from './TransitionController';
import {parseTimeValue} from '../utilities/parseTimeValue';

import type {Node} from '@cliui/dom';
import type {Element} from '@cliui/dom';
import type {Document} from '@cliui/dom';
import type {Window} from '@cliui/dom';
import type {HTMLStyleElement} from '@cliui/dom';
import type {Hooks} from '@cliui/dom';
import {evaluateContainerCondition} from '../utilities/evaluateContainerCondition';
import {evaluateMediaCondition} from '../utilities/evaluateMediaCondition';
import {parseCondition} from '../utilities/parseCondition';

import type {CSSAtRule, CSSConditionalRule, CSSRule, ComputedStyle} from '../types';
import type {ContainerValues} from '../types/ContainerValues';
import type {MediaCondition} from '../types/MediaCondition';
import type {MediaValues} from '../types/MediaValues';
import type {MatchedDeclaration} from '../types/MatchedDeclaration';
import type {KeyframeRule} from '../types/KeyframeRule';

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
  private readonly atRuleHandlers = new Map<string, Array<(rule: CSSAtRule) => void>>();
  private readonly transitionController = new TransitionController();
  private readonly animationController = new AnimationController();
  private readonly keyframeRegistry = new Map<string, KeyframeRule>();
  private currentTimestamp = 0;
  private readonly activeAnimationNames = new WeakMap<Element, Set<string>>();
  /** Stores cascade-only computed styles (before transition/animation overrides). */
  private readonly cascadeCache = new WeakMap<Element, ComputedStyle>();

  /** Current media values for evaluating @media conditions. */
  private mediaValues: MediaValues = {
    width: 80,
    height: 24,
    'prefers-color-scheme': 'dark',
    'prefers-reduced-motion': 'no-preference',
    orientation: 'landscape',
  };

  /**
   * Tracks parsed conditional rules alongside their parsed conditions
   * so we can re-evaluate on resize without re-parsing.
   */
  private conditionalEntries: Array<{
    source: CSSConditionalRule;
    condition: MediaCondition;
    matched: boolean;
  }> = [];

  /** Parsed @container rules with their conditions and optional name. */
  private containerRules: Array<{
    source: CSSConditionalRule;
    condition: MediaCondition;
    name: string | null;
  }> = [];

  /** Resolved container sizes from the layout engine. */
  private readonly containerSizes = new WeakMap<Element, ContainerValues>();

  /**
   * Registers a handler for a specific at-rule identifier.
   */
  onAtRule(identifier: string, handler: (rule: CSSAtRule) => void): void {
    let handlers = this.atRuleHandlers.get(identifier);

    if (!handlers) {
      handlers = [];
      this.atRuleHandlers.set(identifier, handlers);
    }

    handlers.push(handler);
  }

  /** Returns the transition controller for external access. */
  getTransitionController(): TransitionController {
    return this.transitionController;
  }

  /** Returns the animation controller for external access. */
  getAnimationController(): AnimationController {
    return this.animationController;
  }

  /**
   * Advances the animation system by one frame.
   *
   * Marks elements with active animations or transitions as style-dirty
   * so their computed styles are recomputed with updated animated values.
   * When no animations or transitions are active, this is a no-op.
   *
   * @param timestamp - Current frame timestamp in milliseconds.
   */
  tick(timestamp: number): void {
    this.currentTimestamp = timestamp;

    if (!this.transitionController.hasActive && !this.animationController.hasActive) {
      return;
    }

    for (const element of this.transitionController.getActiveElements()) {
      this.styleDirty.add(element);
    }

    for (const element of this.animationController.getActiveElements()) {
      this.styleDirty.add(element);
    }
  }

  /** Returns true when there are active animations or transitions. */
  hasActiveAnimations(): boolean {
    return this.transitionController.hasActive || this.animationController.hasActive;
  }

  /**
   * Attaches this engine to a document and wires the hooks bridge so that
   * DOM mutations automatically mark affected elements as style-dirty.
   * Must be called before computing styles.
   */
  attach(document: Document): void {
    this.document = document;
    this.stylesheetsDirty = true;
    this.injectUserAgentStylesheet(document);
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
   * Updates the media values used for `@media` condition evaluation.
   *
   * When the terminal dimensions or preference values change, call this
   * method to update the values and re-evaluate all media conditions.
   * If any condition's match state changed, affected elements are marked
   * style-dirty and stylesheets are re-collected.
   *
   * @param values - Partial media values to merge with current values.
   */
  setMediaValues(values: Partial<MediaValues>): void {
    const prev = {...this.mediaValues};
    Object.assign(this.mediaValues, values);

    // Recompute orientation if dimensions changed
    if (values.width !== undefined || values.height !== undefined) {
      this.mediaValues.orientation =
        this.mediaValues.width > this.mediaValues.height ? 'landscape' : 'portrait';
    }

    // Re-evaluate media conditions and check for changes
    if (this.reevaluateMediaConditions()) {
      this.stylesheetsDirty = true;
      this.markAllDirty();
    }
  }

  /**
   * Returns the current media values.
   */
  getMediaValues(): Readonly<MediaValues> {
    return this.mediaValues;
  }

  /**
   * Records the resolved size of a container element.
   *
   * Called by the layout engine after computing a container element's
   * dimensions. Returns true if any `@container` conditions now match
   * that didn't before (or vice versa), indicating that the container's
   * subtree needs style recomputation and re-layout.
   *
   * @param element - The container element.
   * @param values - The container's resolved content dimensions.
   * @returns Whether any container query matches changed.
   */
  setContainerSize(element: Element, values: ContainerValues): boolean {
    const prev = this.containerSizes.get(element);

    if (prev && prev.width === values.width && prev.height === values.height) {
      return false;
    }

    this.containerSizes.set(element, values);

    // Check if any container rules targeting this container changed match state
    return this.containerRules.length > 0;
  }

  /**
   * Returns the resolved container size for an element, if set.
   */
  getContainerSize(element: Element): ContainerValues | undefined {
    return this.containerSizes.get(element);
  }

  /**
   * Returns CSS rules from `@container` blocks that match the given element's
   * nearest container ancestor. Used during style computation to include
   * container-query-matched rules in the cascade.
   */
  getContainerMatchedRules(element: Element): CSSRule[] {
    if (this.containerRules.length === 0) return [];

    const matched: CSSRule[] = [];

    for (const rule of this.containerRules) {
      const container = this.findContainerAncestor(element, rule.name);
      if (!container) continue;

      const size = this.containerSizes.get(container);
      if (!size) continue;

      if (evaluateContainerCondition(rule.condition, size)) {
        matched.push(...rule.source.rules);

        // Process nested conditional rules (@media inside @container)
        this.collectNestedMatchedRules(rule.source.conditionalRules, element, matched);
      }
    }

    return matched;
  }

  /**
   * Checks whether an element has `container-type` set.
   */
  isContainerElement(element: Element): boolean {
    const style = this.getComputedStyle(element);
    const containerType = style.get('container-type');
    return containerType !== undefined && containerType !== '' && containerType !== 'normal';
  }

  /**
   * Recursively collects rules from nested conditional at-rules within
   * a matched @container block. Evaluates @media conditions against current
   * media values and @container conditions against the element's container.
   */
  private collectNestedMatchedRules(
    conditionalRules: CSSConditionalRule[],
    element: Element,
    matched: CSSRule[],
  ): void {
    for (const nested of conditionalRules) {
      if (nested.identifier === 'media') {
        const condition = parseCondition(nested.prelude);
        if (!condition) continue;

        if (evaluateMediaCondition(condition, this.mediaValues)) {
          matched.push(...nested.rules);
          if (nested.conditionalRules.length > 0) {
            this.collectNestedMatchedRules(nested.conditionalRules, element, matched);
          }
        }
      } else if (nested.identifier === 'container') {
        const {name, conditionText} = this.parseContainerPrelude(nested.prelude);
        const condition = parseCondition(conditionText);
        if (!condition) continue;

        const container = this.findContainerAncestor(element, name);
        if (!container) continue;

        const size = this.containerSizes.get(container);
        if (!size) continue;

        if (evaluateContainerCondition(condition, size)) {
          matched.push(...nested.rules);
          if (nested.conditionalRules.length > 0) {
            this.collectNestedMatchedRules(nested.conditionalRules, element, matched);
          }
        }
      }
    }
  }

  /**
   * Walks up the tree to find the nearest ancestor with `container-type` set.
   * Optionally matches a specific `container-name`.
   */
  private findContainerAncestor(element: Element, name: string | null): Element | null {
    let current = element.parentElement as Element | null;

    while (current) {
      const style = this.getComputedStyle(current);
      const containerType = style.get('container-type');

      if (containerType && containerType !== 'normal') {
        if (name === null) {
          return current;
        }

        const containerName = style.get('container-name');
        if (containerName === name) {
          return current;
        }
      }

      current = current.parentElement as Element | null;
    }

    return null;
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
      const oldCascade = this.cascadeCache.get(element);
      this.cache.delete(element);

      const parentStyle = this.getParentComputedStyle(element);
      const matchedDeclarations = this.matchAllRules(element);
      const newStyle = this.styleResolver.resolve(matchedDeclarations, element.style, parentStyle);

      // Store cascade-only style before applying overrides
      const cascadeCopy = new Map(newStyle);
      this.cascadeCache.set(element, cascadeCopy);

      // Detect transitions: compare OLD cascade-only vs NEW cascade-only
      // This prevents re-triggering transitions every frame while one is running
      if (oldCascade) {
        this.transitionController.detectChanges(
          element,
          oldCascade,
          cascadeCopy,
          this.currentTimestamp,
        );
      }

      // Detect animation changes
      this.syncAnimations(element, newStyle);

      // Apply animation overrides (animation > normal cascade)
      const animValues = this.animationController.getValues(
        element,
        this.currentTimestamp,
        newStyle,
      );
      for (const [prop, val] of animValues) {
        newStyle.set(prop, val);
      }

      // Apply transition overrides (transition > animation > cascade)
      const transValues = this.transitionController.getValues(element, this.currentTimestamp);
      for (const [prop, val] of transValues) {
        newStyle.set(prop, val);
      }

      this.cache.set(element, newStyle);

      if (hasLayoutChange(oldStyle ?? null, newStyle)) {
        this.layoutDirty.add(element);
      }

      // Also recompute children whose styles depend on this element via inheritance
      this.recomputeChildrenIfNeeded(element, newStyle);
    }

    // Remove completed transitions and animations
    this.transitionController.removeCompleted(this.currentTimestamp);
    this.animationController.removeCompleted(this.currentTimestamp);

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
    const matchedDeclarations = this.matchAllRules(element);
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
   * Injects the user-agent stylesheet as the first `<style>` element in
   * `<head>`, giving it the lowest cascade priority.  Skips injection
   * when the element is already present (idempotent for re-attach).
   */
  private injectUserAgentStylesheet(document: Document): void {
    const marker = 'data-ua-stylesheet';

    if (document.head.querySelector(`[${marker}]`) != null) {
      return;
    }

    const style = document.createElement('style');
    style.setAttribute(marker, '');
    style.textContent = USER_AGENT_STYLESHEET;

    const firstChild = document.head.firstChild;

    if (firstChild) {
      document.head.insertBefore(style, firstChild);
    } else {
      document.head.appendChild(style);
    }
  }

  /**
   * Collects and parses CSS text from all `<style>` elements in the document.
   * Evaluates `@media` conditions and includes matching nested rules.
   */
  private collectStylesheets(): void {
    this.parsedRules = [];
    this.conditionalEntries = [];
    this.containerRules = [];
    this.stylesheetsDirty = false;

    if (!this.document) return;

    const styleElements = collectStyleElements(this.document);
    for (const styleEl of styleElements) {
      const cssText = (styleEl as HTMLStyleElement).sheet;
      if (cssText) {
        const result = this.parser.parse(cssText);
        this.parsedRules.push(...result.rules);

        // Process conditional at-rules (@media, @container)
        this.processConditionalRules(result.conditionalRules);

        for (const atRule of result.atRules) {
          const handlers = this.atRuleHandlers.get(atRule.identifier);

          if (handlers) {
            for (const handler of handlers) {
              handler(atRule);
            }
          }
        }

        for (const keyframeRule of result.keyframeRules) {
          this.keyframeRegistry.set(keyframeRule.name, keyframeRule);
        }
      }
    }
  }

  /**
   * Processes conditional at-rules, evaluating @media conditions and
   * including matching nested rules in parsedRules.
   * @container rules are stored but not evaluated here — they need
   * container dimensions from layout (handled in M14T7).
   */
  private processConditionalRules(conditionalRules: CSSConditionalRule[]): void {
    for (const rule of conditionalRules) {
      if (rule.identifier === 'media') {
        const condition = parseCondition(rule.prelude);
        if (!condition) continue;

        const matched = evaluateMediaCondition(condition, this.mediaValues);
        this.conditionalEntries.push({source: rule, condition, matched});

        if (matched) {
          this.parsedRules.push(...rule.rules);
          // Recursively process nested conditional rules
          if (rule.conditionalRules.length > 0) {
            this.processConditionalRules(rule.conditionalRules);
          }
        }
      } else if (rule.identifier === 'container') {
        // Parse the prelude to extract optional name and condition
        const {name, conditionText} = this.parseContainerPrelude(rule.prelude);
        const condition = parseCondition(conditionText);

        if (condition) {
          this.containerRules.push({source: rule, condition, name});
          this.conditionalEntries.push({source: rule, condition, matched: false});
        }
      }
    }
  }

  /**
   * Re-evaluates all tracked @media conditions against current media values.
   * Returns true if any condition's match state changed.
   */
  private reevaluateMediaConditions(): boolean {
    let changed = false;

    for (const entry of this.conditionalEntries) {
      if (entry.source.identifier !== 'media') continue;

      const newMatch = evaluateMediaCondition(entry.condition, this.mediaValues);
      if (newMatch !== entry.matched) {
        changed = true;
        entry.matched = newMatch;
      }
    }

    return changed;
  }

  /**
   * Parses a `@container` prelude to extract optional name and condition text.
   *
   * `@container sidebar (min-width: 30)` → `{ name: 'sidebar', conditionText: '(min-width: 30)' }`
   * `@container (min-width: 40)` → `{ name: null, conditionText: '(min-width: 40)' }`
   */
  private parseContainerPrelude(prelude: string): {name: string | null; conditionText: string} {
    const trimmed = prelude.trim();
    const parenIdx = trimmed.indexOf('(');

    if (parenIdx === -1) {
      // No condition — just a name (unusual but handle gracefully)
      return {name: trimmed || null, conditionText: ''};
    }

    if (parenIdx === 0) {
      // Starts with paren — no name
      return {name: null, conditionText: trimmed};
    }

    // Text before the paren is the container name
    const name = trimmed.slice(0, parenIdx).trim();
    const conditionText = trimmed.slice(parenIdx).trim();

    return {name: name || null, conditionText};
  }

  /**
   * Returns all matched declarations for an element, including container-query-matched rules.
   * Combines normal stylesheet rules with any @container rules whose conditions
   * match the element's nearest container ancestor.
   */
  private matchAllRules(element: Element): MatchedDeclaration[] {
    const matched = this.selectorMatcher.match(this.parsedRules, element);

    if (this.containerRules.length > 0) {
      const containerRules = this.getContainerMatchedRules(element);

      if (containerRules.length > 0) {
        const containerMatched = this.selectorMatcher.match(containerRules, element);
        matched.push(...containerMatched);
      }
    }

    return matched;
  }

  /**
   * Recursively computes styles for an element and its children.
   */
  private computeElement(element: Element, parentStyle: ComputedStyle | null): void {
    const matchedDeclarations = this.matchAllRules(element);
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

          const matchedDeclarations = this.matchAllRules(childEl);
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
   * Syncs active animations for an element based on its computed animation-name.
   */
  private syncAnimations(element: Element, style: ComputedStyle): void {
    const animationName = style.get('animation-name');
    const previousNames = this.activeAnimationNames.get(element);

    if (!animationName || animationName === 'none') {
      if (previousNames && previousNames.size > 0) {
        this.animationController.removeElement(element);
        this.activeAnimationNames.delete(element);
      }
      return;
    }

    const names = animationName.split(',').map((s) => s.trim());
    const durations = (style.get('animation-duration') ?? '0ms').split(',').map((s) => s.trim());
    const easings = (style.get('animation-timing-function') ?? 'ease')
      .split(',')
      .map((s) => s.trim());
    const delays = (style.get('animation-delay') ?? '0ms').split(',').map((s) => s.trim());
    const iterations = (style.get('animation-iteration-count') ?? '1')
      .split(',')
      .map((s) => s.trim());
    const directions = (style.get('animation-direction') ?? 'normal')
      .split(',')
      .map((s) => s.trim());
    const fillModes = (style.get('animation-fill-mode') ?? 'none').split(',').map((s) => s.trim());
    const playStates = (style.get('animation-play-state') ?? 'running')
      .split(',')
      .map((s) => s.trim());

    const newNames = new Set(names);

    // Remove animations that are no longer listed
    if (previousNames) {
      for (const prevName of previousNames) {
        if (!newNames.has(prevName)) {
          this.animationController.removeAnimation(element, prevName);
        }
      }
    }

    // Start new animations
    for (let i = 0; i < names.length; i++) {
      const name = names[i]!;
      if (previousNames?.has(name)) continue;

      const keyframeRule = this.keyframeRegistry.get(name);
      if (!keyframeRule) continue;

      const iterCount = iterations[i % iterations.length]!;

      this.animationController.startAnimation(
        element,
        name,
        keyframeRule.blocks,
        {
          duration: parseTimeValue(durations[i % durations.length] ?? '0ms'),
          delay: parseTimeValue(delays[i % delays.length] ?? '0ms'),
          easing: easings[i % easings.length] ?? 'ease',
          iterationCount: iterCount === 'infinite' ? Infinity : parseFloat(iterCount) || 1,
          direction: (directions[i % directions.length] ?? 'normal') as
            | 'normal'
            | 'reverse'
            | 'alternate'
            | 'alternate-reverse',
          fillMode: (fillModes[i % fillModes.length] ?? 'none') as
            | 'none'
            | 'forwards'
            | 'backwards'
            | 'both',
          playState: (playStates[i % playStates.length] ?? 'running') as 'running' | 'paused',
        },
        this.currentTimestamp,
      );
    }

    this.activeAnimationNames.set(element, newNames);
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

        // A <style> element's text changed — re-parse all stylesheets
        if (parent.localName === 'style') {
          this.invalidateStylesheets();
          this.markAllDirty();
        }
      }
    };

    hooks.insertChild = (parent, node, index) => {
      prevInsertChild?.(parent, node, index);
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        const el = node as unknown as Element;
        this.markStyleDirty(el);
        walkElements(el, (child) => this.markStyleDirty(child));

        // A <style> element was inserted — re-parse all stylesheets
        if (el.localName === 'style') {
          this.invalidateStylesheets();
          this.markAllDirty();
        }
      }

      // A child of a <style> element changed (textContent was set) — re-parse
      if (parent.localName === 'style') {
        this.invalidateStylesheets();
        this.markAllDirty();
      }

      // Structural changes can affect sibling selectors and layout
      this.markStyleDirty(parent);
      this.layoutDirty.add(parent);
    };

    hooks.removeChild = (parent, node, index) => {
      prevRemoveChild?.(parent, node, index);

      // A <style> element was removed — re-parse all stylesheets
      if (node.nodeType === NodeType.ELEMENT_NODE) {
        const el = node as unknown as Element;

        if (el.localName === 'style') {
          this.invalidateStylesheets();
          this.markAllDirty();
        }
      }

      // A child of a <style> element changed (textContent was set) — re-parse
      if (parent.localName === 'style') {
        this.invalidateStylesheets();
        this.markAllDirty();
      }

      // Structural changes can affect sibling selectors on remaining children
      this.markStyleDirty(parent);
      this.layoutDirty.add(parent);
      walkElements(parent, (child) => this.markStyleDirty(child));
    };

    const prevFocusChange = hooks.focusChange;
    const prevHoverChange = hooks.hoverChange;

    hooks.focusChange = (previous, next) => {
      prevFocusChange?.(previous, next);
      this.markStyleDirty(previous);
      this.markStyleDirty(next);
    };

    hooks.hoverChange = (previous, next) => {
      prevHoverChange?.(previous, next);
      this.markHoverChainDirty(previous);
      this.markHoverChainDirty(next);
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
      hooks.focusChange = this.previousHooks.focusChange;
      hooks.hoverChange = this.previousHooks.hoverChange;
      this.previousHooks = null;
    }
  }

  private markHoverChainDirty(element: Element | null): void {
    let current = element;

    while (current !== null) {
      this.markStyleDirty(current);
      current = current.parentElement as Element | null;
    }
  }
}
