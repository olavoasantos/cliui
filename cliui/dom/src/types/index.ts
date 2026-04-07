import type {EventTarget} from '../classes/EventTarget';
import type {Element} from '../classes/Element';
import type {MutationObserver} from '../classes/MutationObserver';
import type {Node} from '../classes/Node';
import type {PerformanceEntry} from '../classes/PerformanceEntry';
import type {PerformanceObserver} from '../classes/PerformanceObserver';
import type {PerformanceObserverEntryList} from '../classes/PerformanceObserverEntryList';
import type {Text} from '../classes/Text';
import type {HTMLElement} from '../classes/HTMLElement';

export type NodeType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type NamespaceURI = 'http://www.w3.org/1999/xhtml' | 'http://www.w3.org/2000/svg';

export type EventPhase = 0 | 1 | 2 | 3;

export interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

export interface UIEventInit extends EventInit {
  detail?: number;
  view?: unknown;
}

export interface KeyboardEventInit extends UIEventInit {
  key?: string;
  code?: string;
  location?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

export interface MouseEventInit extends UIEventInit {
  screenX?: number;
  screenY?: number;
  clientX?: number;
  clientY?: number;
  offsetX?: number;
  offsetY?: number;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  button?: number;
  buttons?: number;
  relatedTarget?: EventTarget | null;
}

export interface WheelEventInit extends MouseEventInit {
  deltaX?: number;
  deltaY?: number;
  deltaZ?: number;
  deltaMode?: number;
}

export interface FocusEventInit extends EventInit {
  relatedTarget?: EventTarget | null;
}

export type MutationRecordType = 'attributes' | 'characterData' | 'childList';

export interface MutationObserverInit {
  attributeFilter?: string[];
  attributeOldValue?: boolean;
  attributes?: boolean;
  characterData?: boolean;
  characterDataOldValue?: boolean;
  childList?: boolean;
  subtree?: boolean;
}

export interface MutationRecord {
  type: MutationRecordType;
  target: Node | Element | Text;
  addedNodes: Array<Node | Element | Text>;
  removedNodes: Array<Node | Element | Text>;
  attributeName: string | null;
  oldValue: string | null;
}

export interface InputEventInit extends UIEventInit {
  data?: string | null;
  inputType?: string;
}

export interface ClipboardEventInit extends EventInit {
  clipboardData?: DataTransfer | null;
}

export interface ErrorEventInit extends EventInit {
  message?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  error?: unknown;
}

export interface PromiseRejectionEventInit extends EventInit {
  promise: Promise<unknown>;
  reason?: unknown;
}

export interface ToggleEventInit extends EventInit {
  oldState?: string;
  newState?: string;
}

export type SelectorCombinator = 0 | 1 | 2 | 3 | 4;

export type SelectorMatcherType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** A single matcher condition within a selector part. */
export interface SelectorMatcher {
  type: SelectorMatcherType;
  name: string;
  value?: string;
}

/** A segment of a parsed selector, combining a combinator with its matchers. */
export interface SelectorPart {
  combinator: SelectorCombinator;
  matchers: SelectorMatcher[];
}

export interface Hooks {
  createElement(element: Element, ns?: string | null): void;
  setAttribute(
    element: Element,
    name: string,
    value: string,
    ns?: string | null,
    oldValue?: string | null,
  ): void;
  removeAttribute(
    element: Element,
    name: string,
    ns?: string | null,
    oldValue?: string | null,
  ): void;
  createText(text: Text, data: string): void;
  setText(text: Text, data: string, oldValue?: string | null): void;
  insertChild(parent: Element, node: Element | Text, index: number): void;
  removeChild(parent: Element, node: Element | Text, index: number): void;
  addEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;
  focusChange(previous: Element, next: Element): void;
  hoverChange(previous: Element | null, next: Element | null): void;
}

export interface CustomElementConstructor {
  new (): HTMLElement;
}

/** Options accepted by {@link Performance.mark}. */
export interface PerformanceMarkOptions {
  /** Optional metadata to attach to the mark. */
  detail?: unknown;
  /** Explicit start time (high-resolution timestamp). Defaults to `performance.now()`. */
  startTime?: number;
}

/** Options accepted by {@link Performance.measure}. */
export interface PerformanceMeasureOptions {
  /** Optional metadata to attach to the measure. */
  detail?: unknown;
  /** Start mark name or timestamp. */
  start?: string | number;
  /** End mark name or timestamp. */
  end?: string | number;
  /** Explicit duration override. */
  duration?: number;
}

/** Options for constructing a {@link PerformanceEventTiming} entry. */
export interface PerformanceEventTimingOptions {
  /** The event type name (e.g. `'keydown'`, `'click'`). */
  name: string;
  /** High-resolution timestamp when input bytes were received. */
  startTime: number;
  /** High-resolution timestamp when event handler execution began. */
  processingStart: number;
  /** High-resolution timestamp when event handler execution ended. */
  processingEnd: number;
  /**
   * Total duration from input received to next frame written.
   * Set to `0` initially; finalized after the next render frame completes.
   */
  duration: number;
  /** Unique identifier grouping related events in a single logical interaction. */
  interactionId: number;
  /**
   * Entry type: `'event'` for general interactions, `'first-input'` for the
   * first interaction.
   */
  entryType: 'event' | 'first-input';
}

/** Options accepted by {@link PerformanceObserver.observe}. */
export interface PerformanceObserverObserveOptions {
  /** Subscribe to multiple entry types at once. */
  entryTypes?: string[];
  /** Subscribe to a single entry type. */
  type?: string;
}

/** Options for constructing a {@link LargestContentfulPaint} entry. */
export interface LargestContentfulPaintOptions {
  /** High-resolution timestamp when the element was painted. */
  renderTime: number;
  /** The cell area of the element (`contentWidth × contentHeight`). */
  size: number;
  /** The DOM element that triggered the LCP. */
  element: Element;
}

/**
 * Init options for {@link AnimationEvent}.
 * @internal
 */
export interface AnimationEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  animationName?: string;
  elapsedTime?: number;
  pseudoElement?: string;
}

/**
 * Internal state store for CSSStyleDeclaration instances.
 * @internal
 */
export interface CSSStyleDeclarationState {
  properties: Map<string, string>;
  element: Element | null;
}

/**
 * Element shape supporting custom-element attribute change callbacks.
 * @internal
 */
export interface CustomElementWithAttributeChangedCallback extends Element {
  attributeChangedCallback?(name: string, oldValue: string | null, newValue: string | null): void;
}

/**
 * Per-window store tracking installed mutation observer hooks.
 * @internal
 */
export interface MutationObserverStore {
  installed: boolean;
  observers: Set<MutationObserver>;
}

/**
 * Internal state for a MutationObserver's single observation target.
 * @internal
 */
export interface Observation {
  target: Node;
  options: MutationObserverInit;
}

/**
 * Window.onerror-compatible callback type.
 * @internal
 */
export type OnErrorHandler =
  | ((message: string, filename?: string, lineno?: number, colno?: number, error?: unknown) => void)
  | null;

/**
 * Callback invoked when a new entry is recorded.
 *
 * Used internally to notify {@link PerformanceObserver} instances.
 * @internal
 */
export type PerformanceEntryListener = (entry: PerformanceEntry) => void;

/**
 * Callback signature for {@link PerformanceObserver}.
 * @internal
 */
export type PerformanceObserverCallback = (
  list: PerformanceObserverEntryList,
  observer: PerformanceObserver,
) => void;

/**
 * Init options for {@link TransitionEvent}.
 * @internal
 */
export interface TransitionEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  propertyName?: string;
  elapsedTime?: number;
  pseudoElement?: string;
}
