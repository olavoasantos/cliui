import type {EventTarget} from '../classes/EventTarget';
import type {Element} from '../classes/Element';
import type {Text} from '../classes/Text';

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

export const SelectorCombinator = {
  Descendant: 0,
  Child: 1,
  Sibling: 2,
  Adjacent: 3,
  Inner: 4,
} as const;

export type SelectorCombinator = (typeof SelectorCombinator)[keyof typeof SelectorCombinator];

export const SelectorMatcherType = {
  Unknown: 0,
  Element: 1,
  Id: 2,
  Class: 3,
  Attribute: 4,
  Pseudo: 5,
  Function: 6,
} as const;

export type SelectorMatcherType = (typeof SelectorMatcherType)[keyof typeof SelectorMatcherType];

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
  setAttribute(element: Element, name: string, value: string, ns?: string | null): void;
  removeAttribute(element: Element, name: string, ns?: string | null): void;
  createText(text: Text, data: string): void;
  setText(text: Text, data: string): void;
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
}
