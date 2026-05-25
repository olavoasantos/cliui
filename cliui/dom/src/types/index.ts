import type {EventTarget} from '../classes/EventTarget';
import type {Element} from '../classes/Element';
import type {MutationObserver} from '../classes/MutationObserver';
import type {Node} from '../classes/Node';
import type {PerformanceEntry} from '../classes/PerformanceEntry';
import type {PerformanceObserver} from '../classes/PerformanceObserver';
import type {PerformanceObserverEntryList} from '../classes/PerformanceObserverEntryList';
import type {Text} from '../classes/Text';
import type {Comment} from '../classes/Comment';
import type {HTMLElement} from '../classes/HTMLElement';

export type NodeType = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export type NamespaceURI = 'http://www.w3.org/1999/xhtml' | 'http://www.w3.org/2000/svg';

export type EventPhase = 0 | 1 | 2 | 3;

/** Initialization options for constructing an {@link Event}. */
export interface EventInit {
  /** Whether the event bubbles up through the DOM tree. */
  bubbles?: boolean;
  /** Whether the event can be cancelled via `preventDefault()`. */
  cancelable?: boolean;
  /** Whether the event crosses shadow DOM boundaries. */
  composed?: boolean;
}

/** Initialization options for constructing a {@link UIEvent}. */
export interface UIEventInit extends EventInit {
  /** Application-specific detail value. */
  detail?: number;
  /** The window in which the event occurred. */
  view?: unknown;
}

/** Initialization options for constructing a {@link KeyboardEvent}. */
export interface KeyboardEventInit extends UIEventInit {
  /** The key value of the key pressed (e.g. `'Enter'`, `'a'`). */
  key?: string;
  /** The physical key code (e.g. `'KeyA'`, `'ArrowUp'`). */
  code?: string;
  /** The location of the key on the keyboard. */
  location?: number;
  /** Whether the Ctrl key was held. */
  ctrlKey?: boolean;
  /** Whether the Shift key was held. */
  shiftKey?: boolean;
  /** Whether the Alt key was held. */
  altKey?: boolean;
  /** Whether the Meta (Cmd/Win) key was held. */
  metaKey?: boolean;
  /** Whether the key is being held down continuously. */
  repeat?: boolean;
  /** Whether the event occurs during an IME composition session. */
  isComposing?: boolean;
}

/** Initialization options for constructing a {@link MouseEvent}. */
export interface MouseEventInit extends UIEventInit {
  /** Horizontal position relative to the screen. */
  screenX?: number;
  /** Vertical position relative to the screen. */
  screenY?: number;
  /** Horizontal position relative to the viewport. */
  clientX?: number;
  /** Vertical position relative to the viewport. */
  clientY?: number;
  /** Horizontal position relative to the target element. */
  offsetX?: number;
  /** Vertical position relative to the target element. */
  offsetY?: number;
  /** Whether the Ctrl key was held. */
  ctrlKey?: boolean;
  /** Whether the Shift key was held. */
  shiftKey?: boolean;
  /** Whether the Alt key was held. */
  altKey?: boolean;
  /** Whether the Meta (Cmd/Win) key was held. */
  metaKey?: boolean;
  /** The button number that triggered the event (0 = primary). */
  button?: number;
  /** Bitmask of currently pressed buttons. */
  buttons?: number;
  /** The secondary target (e.g. the element being exited during `mouseenter`). */
  relatedTarget?: EventTarget | null;
}

/** Initialization options for constructing a {@link WheelEvent}. */
export interface WheelEventInit extends MouseEventInit {
  /** Horizontal scroll delta. */
  deltaX?: number;
  /** Vertical scroll delta. */
  deltaY?: number;
  /** Z-axis scroll delta. */
  deltaZ?: number;
  /** Unit of the delta values (0 = pixels, 1 = lines, 2 = pages). */
  deltaMode?: number;
}

/** Initialization options for constructing a {@link FocusEvent}. */
export interface FocusEventInit extends EventInit {
  /** The secondary target (the element losing or gaining focus). */
  relatedTarget?: EventTarget | null;
}

export type MutationRecordType = 'attributes' | 'characterData' | 'childList';

/** Configuration for {@link MutationObserver.observe}. */
export interface MutationObserverInit {
  /** Observe only the listed attribute names. Only takes effect when `attributes` is `true`. */
  attributeFilter?: string[];
  /** Record the previous attribute value in {@link MutationRecord.oldValue}. */
  attributeOldValue?: boolean;
  /** Observe attribute changes. */
  attributes?: boolean;
  /** Observe text content changes on {@link Text} and {@link Comment} nodes. */
  characterData?: boolean;
  /** Record the previous text content in {@link MutationRecord.oldValue}. */
  characterDataOldValue?: boolean;
  /** Observe child insertions and removals. */
  childList?: boolean;
  /** Extend observation to the entire subtree, not just direct children. */
  subtree?: boolean;
}

/** A single mutation observed by a {@link MutationObserver}. */
export interface MutationRecord {
  /** The kind of mutation: attribute change, text change, or child list change. */
  type: MutationRecordType;
  /** The node affected by the mutation. */
  target: Node | Element | Text;
  /** Nodes inserted during a `childList` mutation. Empty for other types. */
  addedNodes: Array<Node | Element | Text>;
  /** Nodes removed during a `childList` mutation. Empty for other types. */
  removedNodes: Array<Node | Element | Text>;
  /** The name of the changed attribute, or `null` for non-attribute mutations. */
  attributeName: string | null;
  /** The previous value (attribute or character data), or `null` when not recorded. */
  oldValue: string | null;
}

/** Initialization options for constructing an {@link InputEvent}. */
export interface InputEventInit extends UIEventInit {
  /** The inserted text, or `null` for deletions. */
  data?: string | null;
  /** The type of input change (e.g. `'insertText'`, `'deleteContentBackward'`). */
  inputType?: string;
}

/** Initialization options for constructing a {@link ClipboardEvent}. */
export interface ClipboardEventInit extends EventInit {
  /** The clipboard data associated with the event. */
  clipboardData?: DataTransfer | null;
}

/** Initialization options for constructing an {@link ErrorEvent}. */
export interface ErrorEventInit extends EventInit {
  /** Human-readable error description. */
  message?: string;
  /** URL of the script where the error originated. */
  filename?: string;
  /** Line number of the error. */
  lineno?: number;
  /** Column number of the error. */
  colno?: number;
  /** The error object. */
  error?: unknown;
}

/** Initialization options for constructing a {@link PromiseRejectionEvent}. */
export interface PromiseRejectionEventInit extends EventInit {
  /** The rejected promise. */
  promise: Promise<unknown>;
  /** The rejection reason. */
  reason?: unknown;
}

/** Initialization options for constructing a {@link ToggleEvent}. */
export interface ToggleEventInit extends EventInit {
  /** The state before the toggle (e.g. `'closed'`). */
  oldState?: string;
  /** The state after the toggle (e.g. `'open'`). */
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

/**
 * Lifecycle hooks invoked by the DOM as it mutates.
 *
 * Hooks are stored on `window[HOOKS]`. Multiple consumers (e.g. a renderer
 * and a `MutationObserver`) coexist by **chaining**: each consumer saves
 * the previous hook function, installs its own, and calls the saved one
 * inside its implementation. Breaking the chain silently disables other
 * consumers.
 *
 * @example
 * ```ts
 * const prev = window[HOOKS].insertChild;
 * window[HOOKS].insertChild = (parent, node, index) => {
 *   prev(parent, node, index);
 *   // custom logic here
 * };
 * ```
 */
export interface Hooks {
  /**
   * Fires after a new element is created via `document.createElement` or
   * `document.createElementNS`.
   *
   * @param element - The newly created element.
   * @param ns - The namespace URI, or `undefined` for HTML elements.
   */
  createElement(element: Element, ns?: string | null): void;

  /**
   * Fires when an attribute is set or changed on an element.
   *
   * Also fires when `style.cssText` is assigned — in that case `name` is
   * `'style'` and `value` contains the full serialized CSS text.
   *
   * @param element - The element whose attribute changed.
   * @param name - The attribute name.
   * @param value - The new attribute value.
   * @param ns - The attribute namespace, or `null`.
   * @param oldValue - The previous attribute value, or `null` when the
   *   attribute is being set for the first time.
   */
  setAttribute(
    element: Element,
    name: string,
    value: string,
    ns?: string | null,
    oldValue?: string | null,
  ): void;

  /**
   * Fires when an attribute is removed from an element.
   *
   * @param element - The element whose attribute was removed.
   * @param name - The removed attribute name.
   * @param ns - The attribute namespace, or `null`.
   * @param oldValue - The attribute value before removal, or `null`.
   */
  removeAttribute(
    element: Element,
    name: string,
    ns?: string | null,
    oldValue?: string | null,
  ): void;

  /**
   * Fires after a new `Text` node is created via `document.createTextNode`.
   *
   * @param text - The newly created text node.
   * @param data - The initial text content.
   */
  createText(text: Text, data: string): void;

  /**
   * Fires when a text-bearing node's (Text or Comment) character data changes.
   *
   * @param text - The text-bearing node whose content changed.
   * @param data - The new text content.
   * @param oldValue - The previous text content, or `null`.
   */
  setText(text: Text | Comment, data: string, oldValue?: string | null): void;

  /**
   * Fires when a child node is inserted into an element.
   *
   * @param parent - The parent element receiving the child.
   * @param node - The child node being inserted.
   * @param index - The zero-based child index at which the node was inserted.
   */
  insertChild(parent: Element, node: Element | Text | Comment, index: number): void;

  /**
   * Fires when a child node is removed from an element.
   *
   * @param parent - The parent element losing the child.
   * @param node - The child node being removed.
   * @param index - The zero-based child index from which the node was removed.
   */
  removeChild(parent: Element, node: Element | Text | Comment, index: number): void;

  /**
   * Fires after an event listener is registered on an event target.
   *
   * @param element - The event target.
   * @param type - The event type (e.g. `'click'`).
   * @param listener - The registered listener.
   * @param options - Listener options, if provided.
   */
  addEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ): void;

  /**
   * Fires after an event listener is removed from an event target.
   *
   * @param element - The event target.
   * @param type - The event type.
   * @param listener - The removed listener.
   * @param options - Listener options, if provided.
   */
  removeEventListener(
    element: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ): void;

  /**
   * Fires when `document.activeElement` changes.
   *
   * Neither parameter is ever `null` — the document normalizes `null` to
   * `document.body` before firing.
   *
   * @param previous - The element that lost focus.
   * @param next - The element that gained focus.
   */
  focusChange(previous: Element, next: Element): void;

  /**
   * Fires when `document.hoveredElement` changes.
   *
   * @param previous - The previously hovered element, or `null`.
   * @param next - The newly hovered element, or `null`.
   */
  hoverChange(previous: Element | null, next: Element | null): void;
}

/** Constructor for a custom element registered via `customElements.define()`. */
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
