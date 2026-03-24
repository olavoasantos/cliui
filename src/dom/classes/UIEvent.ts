import {Event} from './Event';
import type {UIEventInit} from '../types/index';

/**
 * Base class for user interface events (keyboard, mouse, wheel).
 */
export class UIEvent extends Event {
  readonly detail: number;
  readonly view: unknown;

  constructor(type: string, eventInitDict?: UIEventInit) {
    super(type, eventInitDict);

    this.detail = eventInitDict?.detail ?? 0;
    this.view = eventInitDict?.view ?? null;
  }
}
