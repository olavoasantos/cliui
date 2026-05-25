import {CAPTURE_MARKER, HOOKS, LISTENERS, OWNER_DOCUMENT, PATH, EventPhase} from '../constants';
import {ONCE_LISTENERS} from '../constants/eventTarget';
import {fireEvent} from '../utilities/fireEvent';
import {removeEventTargetListener} from '../utilities/removeEventTargetListener';

import type {Event} from './Event';
import type {ChildNode} from './ChildNode';
import type {Document} from './Document';
import type {Hooks} from '../types';

/**
 * Base class providing event listener registration and event dispatch.
 */
export class EventTarget {
  [LISTENERS]: Map<string, Set<EventListenerOrEventListenerObject>> | undefined = undefined;

  [ONCE_LISTENERS]: WeakMap<EventListenerOrEventListenerObject, EventListener> | undefined =
    undefined;

  /**
   * Property set by entities that extend this class that are part of the DOM tree.
   * @internal
   */
  [OWNER_DOCUMENT]: Document | undefined = undefined;

  /**
   * Registers an event listener for the given event type.
   *
   * Duplicate listeners (same callback + capture flag) are silently ignored.
   *
   * @param type - Event type to listen for.
   * @param listener - Callback or `EventListener` object to invoke. Ignored when `null`.
   * @param options - Capture flag or options object. When an object: `capture` routes
   *   the listener to the capture phase, `once` auto-removes it after the first
   *   invocation, `passive` is accepted but has no behavioral effect, and `signal`
   *   (`AbortSignal`) removes the listener when aborted.
   *
   * @example
   * ```ts
   * element.addEventListener('click', (event) => {
   *   console.log('clicked', event.target);
   * });
   * ```
   *
   * @see {@link Hooks.addEventListener} for the hook notification fired after registration.
   */
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

    // Check if the original listener (or its once-wrapper) is already registered
    if (list.has(listener)) return;
    const existingOnceWrapper = this[ONCE_LISTENERS]?.get(listener);
    if (existingOnceWrapper && list.has(existingOnceWrapper as EventListenerOrEventListenerObject))
      return;

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

  /**
   * Removes a previously registered event listener.
   *
   * The `capture` flag must match the value used during registration.
   * No-ops if the listener is not found.
   *
   * @param type - Event type the listener was registered for.
   * @param listener - Callback or `EventListener` object to remove.
   * @param options - Capture flag or options object used during registration.
   */
  removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject | null,
    options?: boolean | EventListenerOptions,
  ) {
    removeEventTargetListener(this, type, listener, options);
  }

  /**
   * Dispatches an event through the capture and bubble phases.
   *
   * Builds the propagation path from `this` to the root, fires capture-phase
   * listeners top-down, then bubble-phase listeners bottom-up (when
   * `event.bubbles` is `true`).
   *
   * @param event - Event to dispatch.
   * @returns `false` when `preventDefault()` was called on the event, `true` otherwise.
   */
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
      if (event.cancelBubble) return !event.defaultPrevented;
    }

    const bubblePath = event.bubbles ? path : path.slice(0, 1);

    for (let index = 0; index < bubblePath.length; index++) {
      fireEvent(event, bubblePath[index]!, EventPhase.BUBBLING_PHASE);
      if (event.cancelBubble) return !event.defaultPrevented;
    }

    return !event.defaultPrevented;
  }
}
