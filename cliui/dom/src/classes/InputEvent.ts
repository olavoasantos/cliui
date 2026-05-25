import {UIEvent} from './UIEvent';
import type {InputEventInit} from '../types';

/**
 * Represents an event notifying of editable content changes.
 *
 * Follows the DOM `InputEvent` interface: extends `UIEvent` and exposes
 * `data` (the inserted text, if any) and `inputType` (the kind of edit).
 */
export class InputEvent extends UIEvent {
  /** Inserted text, or `null` when the edit is a deletion. */
  readonly data: string | null;
  /** Kind of edit that triggered the event (e.g. `"insertText"`, `"deleteContentBackward"`). */
  readonly inputType: string;

  /**
   * Creates an input event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with `data`, `inputType`, and standard event flags.
   */
  constructor(type: string, eventInitDict: InputEventInit = {}) {
    super(type, eventInitDict);

    this.data = eventInitDict.data ?? null;
    this.inputType = eventInitDict.inputType ?? '';
  }
}
