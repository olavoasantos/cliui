import {Event} from './Event';
import type {ErrorEventInit} from '../types';

/**
 * Event dispatched when a runtime error occurs.
 */
export class ErrorEvent extends Event {
  /** Human-readable error description. */
  readonly message: string | undefined;
  /** Name of the file where the error originated. */
  readonly filename: string | undefined;
  /** Line number where the error occurred. */
  readonly lineno: number | undefined;
  /** Column number where the error occurred. */
  readonly colno: number | undefined;
  /** Error object or value that was thrown. */
  readonly error: unknown;

  /**
   * Creates an error event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Init dict with error details and standard event flags.
   */
  constructor(type: string, eventInitDict: ErrorEventInit) {
    super(type, eventInitDict);

    this.message = eventInitDict.message;
    this.filename = eventInitDict.filename;
    this.lineno = eventInitDict.lineno;
    this.colno = eventInitDict.colno;
    this.error = eventInitDict.error;
  }
}
