import {Event} from './Event';
import type {EventTarget as DOMEventTarget} from './EventTarget';
import type {FocusEventInit} from '../types';

/**
 * Event dispatched during focus transitions (`focus`, `blur`, `focusin`, `focusout`).
 */
export class FocusEvent extends Event {
  /** Element on the opposite side of the focus transition — the one gaining or losing focus. `null` when there is no counterpart. */
  readonly relatedTarget: DOMEventTarget | null;

  /**
   * Creates a focus event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with `relatedTarget` and standard event flags.
   */
  constructor(type: string, eventInitDict: FocusEventInit = {}) {
    super(type, eventInitDict);

    this.relatedTarget = eventInitDict.relatedTarget ?? null;
  }
}
