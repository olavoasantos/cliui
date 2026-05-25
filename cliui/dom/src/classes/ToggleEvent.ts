import {Event} from './Event';
import type {ToggleEventInit} from '../types';

/**
 * Event dispatched when an element's toggle state changes (e.g. `<details>`, `<dialog>`).
 */
export class ToggleEvent extends Event {
  /** Previous toggle state before the transition. */
  readonly oldState: string | undefined;
  /** New toggle state after the transition. */
  readonly newState: string | undefined;

  /**
   * Creates a toggle event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Init dict with `oldState`, `newState`, and standard event flags.
   */
  constructor(type: string, eventInitDict: ToggleEventInit) {
    super(type, eventInitDict);

    this.oldState = eventInitDict.oldState;
    this.newState = eventInitDict.newState;
  }
}
