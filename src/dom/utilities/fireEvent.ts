import {CAPTURE_MARKER, EventPhase, LISTENERS, STOP_IMMEDIATE_PROPAGATION} from '../constants';

import type {EventTarget} from '../classes/EventTarget';
import type {Event} from '../classes/Event';

/** Invokes all listeners for an event target in the provided propagation phase. */
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
    } catch (error) {
      setTimeout(rethrowError, 0, error);
    }

    if (event[STOP_IMMEDIATE_PROPAGATION]) break;
  }
}

function rethrowError(error: unknown) {
  throw error;
}
