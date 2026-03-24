import {Event} from './Event';
import type {EventTarget as DOMEventTarget} from './EventTarget';
import type {FocusEventInit} from '../types/index';

export class FocusEvent extends Event {
  readonly relatedTarget: DOMEventTarget | null;

  constructor(type: string, eventInitDict: FocusEventInit = {}) {
    super(type, eventInitDict);

    this.relatedTarget = eventInitDict.relatedTarget ?? null;
  }
}
