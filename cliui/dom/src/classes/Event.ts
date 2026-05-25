import {IS_TRUSTED, PATH, STOP_IMMEDIATE_PROPAGATION, EventPhase} from '../constants';
import {getEventTimeStamp} from '../utilities/getEventTimeStamp';

import type {EventTarget} from './EventTarget';
import type {EventInit, EventPhase as EventPhaseValue} from '../types';

/**
 * Represents an event dispatched through the DOM.
 */
export class Event {
  /** No phase — event is not being dispatched. */
  static NONE = EventPhase.NONE;
  /** Capture phase constant. */
  static CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  /** At-target phase constant. */
  static AT_TARGET = EventPhase.AT_TARGET;
  /** Bubble phase constant. */
  static BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  /** High-resolution timestamp (milliseconds) of when the event was created. */
  timeStamp = getEventTimeStamp();
  /** Event target that dispatched this event. Set during dispatch. */
  target: EventTarget | null = null;
  /** Event target currently processing this event. Updated as the event traverses the propagation path. */
  currentTarget: EventTarget | null = null;
  /** @deprecated Legacy alias for {@link target}. */
  srcElement: EventTarget | null = null;
  /** Whether the event propagates up through the DOM tree. */
  bubbles = false;
  /** Whether the event's default action can be prevented. */
  cancelable = false;
  /** Whether the event crosses shadow DOM boundaries. */
  composed = false;
  /** Whether `preventDefault()` has been called. */
  defaultPrevented = false;
  /** Whether propagation has been stopped. Set by `stopPropagation()`. */
  cancelBubble = false;
  /** Current dispatch phase (`NONE`, `CAPTURING_PHASE`, `AT_TARGET`, or `BUBBLING_PHASE`). */
  eventPhase: EventPhaseValue = 0;
  /** Optional data payload. Non-standard convenience property — use `CustomEvent.detail` or `InputEvent.data` for spec-aligned alternatives. */
  data?: unknown;
  /** @internal */
  [PATH]: EventTarget[] = [];
  /** @internal */
  [IS_TRUSTED]!: boolean;
  /** @internal */
  [STOP_IMMEDIATE_PROPAGATION] = false;

  /** Event type string (e.g. `"click"`, `"keydown"`). */
  type: string;

  /**
   * Creates a new event.
   *
   * @param type - Event type string.
   * @param options - Optional flags controlling `bubbles`, `cancelable`, and `composed`.
   */
  constructor(type: string, options?: EventInit) {
    this.type = type;
    Object.defineProperty(this, IS_TRUSTED, {writable: true, value: false});
    if (options) {
      if (options.bubbles) this.bubbles = options.bubbles;
      if (options.cancelable) this.cancelable = options.cancelable;
      if (options.composed) this.composed = options.composed;
    }
  }

  /** Whether the event was dispatched by the system rather than by application code. */
  get isTrusted() {
    return this[IS_TRUSTED];
  }

  /**
   * Returns the event's propagation path as an array of `EventTarget` nodes
   * from the dispatch target to the root.
   *
   * @returns Ordered array of targets in the propagation path.
   */
  composedPath() {
    return this[PATH];
  }

  /** Stops the event from reaching further targets in the propagation path. */
  stopPropagation() {
    this.cancelBubble = true;
  }

  /**
   * Stops propagation and prevents remaining listeners on the current
   * target from being invoked.
   */
  stopImmediatePropagation() {
    this[STOP_IMMEDIATE_PROPAGATION] = true;
    this.cancelBubble = true;
  }

  /**
   * Marks the event as cancelled. No-op when `cancelable` is `false`.
   */
  preventDefault() {
    if (this.cancelable) {
      this.defaultPrevented = true;
    }
  }

  /**
   * Legacy property. Setting to `false` is equivalent to calling `preventDefault()`.
   */
  set returnValue(value) {
    if (!value) this.defaultPrevented = true;
  }

  /**
   * Legacy property. Returns `false` when `defaultPrevented` is `true`.
   */
  get returnValue() {
    return !this.defaultPrevented;
  }

  /** @deprecated Legacy event initializer. Use the constructor instead. */
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean) {
    this.type = type;
    this.bubbles = Boolean(bubbles);
    this.cancelable = Boolean(cancelable);
  }
}
