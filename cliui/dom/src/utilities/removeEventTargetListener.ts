import {CAPTURE_MARKER, HOOKS, LISTENERS, OWNER_DOCUMENT} from '../constants';
import {ONCE_LISTENERS} from '../constants/eventTarget';

import type {Hooks} from '../types';
import type {EventTarget} from '../classes/EventTarget';

/** Removes an event listener from an EventTarget implementation. */
export function removeEventTargetListener(
  target: EventTarget,
  type: string,
  listener: EventListenerOrEventListenerObject | null,
  options?: boolean | EventListenerOptions,
): void {
  if (listener == null) {
    return;
  }

  const onceListeners = target[ONCE_LISTENERS];
  const normalizedListener = onceListeners?.get(listener) ?? listener;

  onceListeners?.delete(listener);

  const capture =
    options === true ||
    (options != null && typeof options === 'object' && options.capture === true);
  const key = `${type}${capture ? CAPTURE_MARKER : ''}`;
  const list = target[LISTENERS]?.get(key);

  if (list) {
    const deleted = list.delete(normalizedListener);

    if (deleted) {
      (
        target[OWNER_DOCUMENT]?.defaultView[HOOKS] as Partial<Hooks> | undefined
      )?.removeEventListener?.(target as never, type, listener, options);
    }
  }
}
