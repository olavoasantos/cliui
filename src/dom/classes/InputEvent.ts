import {UIEvent} from './UIEvent';
import type {InputEventInit} from '../types';

/**
 * Represents an event notifying of editable content changes.
 *
 * Follows the DOM `InputEvent` interface: extends `UIEvent` and exposes
 * `data` (the inserted text, if any) and `inputType` (the kind of edit).
 */
export class InputEvent extends UIEvent {
  readonly data: string | null;
  readonly inputType: string;

  constructor(type: string, eventInitDict: InputEventInit = {}) {
    super(type, eventInitDict);

    this.data = eventInitDict.data ?? null;
    this.inputType = eventInitDict.inputType ?? '';
  }
}
