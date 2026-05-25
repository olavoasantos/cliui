import {Event} from './Event';
import type {ClipboardEventInit} from '../types';

/**
 * Event dispatched during clipboard operations (`copy`, `cut`, `paste`).
 */
export class ClipboardEvent extends Event {
  /** Data associated with the clipboard operation. `null` when unavailable. */
  readonly clipboardData: DataTransfer | null;

  /**
   * Creates a clipboard event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with `clipboardData` and standard event flags.
   */
  constructor(type: string, eventInitDict: ClipboardEventInit = {}) {
    super(type, eventInitDict);

    this.clipboardData = eventInitDict.clipboardData ?? null;
  }
}
