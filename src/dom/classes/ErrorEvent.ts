import {Event} from './Event';
import type {ErrorEventInit} from '../types/index';

export class ErrorEvent extends Event {
  readonly message: string | undefined;
  readonly filename: string | undefined;
  readonly lineno: number | undefined;
  readonly colno: number | undefined;
  readonly error: unknown;

  constructor(type: string, eventInitDict: ErrorEventInit) {
    super(type, eventInitDict);

    this.message = eventInitDict.message;
    this.filename = eventInitDict.filename;
    this.lineno = eventInitDict.lineno;
    this.colno = eventInitDict.colno;
    this.error = eventInitDict.error;
  }
}
