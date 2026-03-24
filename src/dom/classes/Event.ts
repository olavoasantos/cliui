import {
  PATH,
  IS_TRUSTED,
  LISTENERS,
  STOP_IMMEDIATE_PROPAGATION,
  EventPhase,
  CAPTURE_MARKER,
} from '../constants/index';
import type {EventTarget} from './EventTarget';

export interface EventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
}

const now = typeof performance === 'undefined' ? Date.now : performance.now.bind(performance);

export class Event {
  static NONE = EventPhase.NONE;
  static CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  static AT_TARGET = EventPhase.AT_TARGET;
  static BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  timeStamp = now();
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  srcElement: EventTarget | null = null;
  bubbles = false;
  cancelable = false;
  composed = false;
  defaultPrevented = false;
  cancelBubble = false;
  eventPhase: EventPhase = 0;
  data?: unknown;
  [PATH]: EventTarget[] = [];
  [IS_TRUSTED]!: boolean;
  [STOP_IMMEDIATE_PROPAGATION] = false;

  type: string;

  constructor(type: string, options?: EventInit) {
    this.type = type;
    Object.defineProperty(this, IS_TRUSTED, {writable: true, value: false});
    if (options) {
      if (options.bubbles) this.bubbles = options.bubbles;
      if (options.cancelable) this.cancelable = options.cancelable;
      if (options.composed) this.composed = options.composed;
    }
  }

  get isTrusted() {
    return this[IS_TRUSTED];
  }

  composedPath() {
    return this[PATH];
  }

  stopPropagation() {
    this.cancelBubble = true;
  }

  stopImmediatePropagation() {
    this[STOP_IMMEDIATE_PROPAGATION] = true;
    this.cancelBubble = true;
  }

  preventDefault() {
    this.defaultPrevented = true;
  }

  set returnValue(value) {
    this.defaultPrevented = value;
  }

  get returnValue() {
    return this.defaultPrevented;
  }

  /** @deprecated */
  initEvent(type: string, bubbles?: boolean, cancelable?: boolean) {
    this.type = type;
    this.bubbles = Boolean(bubbles);
    this.cancelable = Boolean(cancelable);
  }
}

export function fireEvent(
  event: Event,
  currentTarget: EventTarget,
  phase: typeof EventPhase.BUBBLING_PHASE | typeof EventPhase.CAPTURING_PHASE,
): void {
  const listeners = currentTarget[LISTENERS];
  const list = listeners?.get(
    `${event.type}${phase === EventPhase.CAPTURING_PHASE ? CAPTURE_MARKER : ''}`,
  );

  if (!list) return;

  for (const listener of list) {
    event.eventPhase = event.target === currentTarget ? EventPhase.AT_TARGET : phase;
    event.currentTarget = currentTarget;

    try {
      if (typeof listener === 'object') {
        listener.handleEvent(event);
      } else {
        listener.call(currentTarget, event);
      }
    } catch (err) {
      setTimeout(thrower, 0, err);
    }

    if (event[STOP_IMMEDIATE_PROPAGATION]) break;
  }
}

function thrower(error: unknown) {
  throw error;
}
