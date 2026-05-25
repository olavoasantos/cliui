import {Event} from './Event';
import type {UIEventInit} from '../types';

/**
 * Base class for user interface events (keyboard, mouse, wheel).
 */
export class UIEvent extends Event {
  /** Auxiliary numeric detail for the event (e.g. click count). */
  readonly detail: number;
  /** Abstract view associated with the event (typically a `Window`). */
  readonly view: unknown;

  /**
   * Creates a UI event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with `detail`, `view`, and standard event flags.
   */
  constructor(type: string, eventInitDict?: UIEventInit) {
    super(type, eventInitDict);

    this.detail = eventInitDict?.detail ?? 0;
    this.view = eventInitDict?.view ?? null;
  }
}
