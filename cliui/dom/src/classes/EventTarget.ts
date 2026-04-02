import {CAPTURE_MARKER, HOOKS, LISTENERS, OWNER_DOCUMENT, PATH, EventPhase} from '../constants';
import {ONCE_LISTENERS} from '../constants/eventTarget';
import {fireEvent} from '../utilities/fireEvent';
import {removeEventTargetListener} from '../utilities/removeEventTargetListener';

import type {Event} from './Event';
import type {ChildNode} from './ChildNode';
import type {Document} from './Document';
import type {Hooks} from '../types';

export class EventTarget {
  [LISTENERS]: Map<string, Set<EventListenerOrEventListenerObject>> | undefined = undefined;

  [ONCE_LISTENERS]: WeakMap<EventListenerOrEventListenerObject, EventListener> | undefined =
    undefined;

  /**
   * Property set by entities that extend this class that are part of the DOM tree.
   * @internal
   */
  [OWNER_DOCUMENT]: Document | undefined = undefined;

  addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | AddEventListenerOptions,
  ) {
    if (listener == null) return;

    const capture =
      options === true ||
      (options != null && typeof options === 'object' && options.capture === true);
    const once = typeof options === 'object' && options != null && options.once === true;
    const signal = typeof options === 'object' && options != null ? options.signal : undefined;
    const key = `${type}${capture ? CAPTURE_MARKER : ''}`;
    let normalizedListener = listener;

    if (once) {
      normalizedListener = function normalizedListener(
        this: EventTarget,
        ...args: Parameters<EventListener>
      ) {
        this.removeEventListener(type, listener, options);

        return typeof listener === 'object'
          ? listener.handleEvent(...args)
          : listener.call(this, ...args);
      };

      let onceListeners = this[ONCE_LISTENERS];
      if (!onceListeners) {
        onceListeners = new WeakMap();
        this[ONCE_LISTENERS] = onceListeners;
      }

      onceListeners.set(listener, normalizedListener as EventListener);
    }

    let listeners = this[LISTENERS];
    if (!listeners) {
      listeners = new Map();
      this[LISTENERS] = listeners;
    }

    let list = listeners.get(key);
    if (!list) {
      list = new Set();
      listeners.set(key, list);
    }

    if (list.has(normalizedListener)) return;

    signal?.addEventListener(
      'abort',
      () => {
        removeEventTargetListener(this, type, listener, options);
      },
      {once: true},
    );

    list.add(normalizedListener);
    (this[OWNER_DOCUMENT]?.defaultView[HOOKS] as Partial<Hooks> | undefined)?.addEventListener?.(
      this as never,
      type,
      listener,
      options,
    );
  }

  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    removeEventTargetListener(this, type, listener, options);
  }

  dispatchEvent(event: Event) {
    const path: EventTarget[] = [];
    let target = this as unknown as ChildNode | null;
    while (target != null) {
      path.push(target);
      target = target.parentNode as ChildNode | null;
    }
    event.target = this;
    event.srcElement = this;
    event[PATH] = path;

    for (let index = path.length; index--; ) {
      fireEvent(event, path[index]!, EventPhase.CAPTURING_PHASE);
      if (event.cancelBubble) return event.defaultPrevented;
    }

    const bubblePath = event.bubbles ? path : path.slice(0, 1);

    for (let index = 0; index < bubblePath.length; index++) {
      fireEvent(event, bubblePath[index]!, EventPhase.BUBBLING_PHASE);
      if (event.cancelBubble) return event.defaultPrevented;
    }

    return event.defaultPrevented;
  }
}
