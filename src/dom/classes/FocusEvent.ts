import {Event} from './Event';
import type {EventTarget} from './EventTarget';

export interface FocusEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  relatedTarget?: EventTarget | null;
}

export class FocusEvent extends Event {
  readonly relatedTarget: EventTarget | null;

  constructor(type: string, eventInitDict: FocusEventInit = {}) {
    super(type, eventInitDict);

    this.relatedTarget = eventInitDict.relatedTarget ?? null;
  }
}
