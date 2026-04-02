import {IS_TRUSTED, PATH, STOP_IMMEDIATE_PROPAGATION, EventPhase} from '../constants';
import {getEventTimeStamp} from '../utilities/getEventTimeStamp';

import type {EventTarget} from './EventTarget';
import type {EventInit, EventPhase as EventPhaseValue} from '../types';

export class Event {
  static NONE = EventPhase.NONE;
  static CAPTURING_PHASE = EventPhase.CAPTURING_PHASE;
  static AT_TARGET = EventPhase.AT_TARGET;
  static BUBBLING_PHASE = EventPhase.BUBBLING_PHASE;

  timeStamp = getEventTimeStamp();
  target: EventTarget | null = null;
  currentTarget: EventTarget | null = null;
  srcElement: EventTarget | null = null;
  bubbles = false;
  cancelable = false;
  composed = false;
  defaultPrevented = false;
  cancelBubble = false;
  eventPhase: EventPhaseValue = 0;
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
