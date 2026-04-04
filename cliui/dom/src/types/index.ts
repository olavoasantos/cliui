import type {EventTarget} from '../classes/EventTarget';
import type {Element} from '../classes/Element';
import type {Node} from '../classes/Node';
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

export type {PerformanceMarkOptions} from './PerformanceMarkOptions';
export type {PerformanceMeasureOptions} from './PerformanceMeasureOptions';
