import {Event} from './Event';
import type {ClipboardEventInit} from '../types';

export class ClipboardEvent extends Event {
  readonly clipboardData: DataTransfer | null;

  constructor(type: string, eventInitDict: ClipboardEventInit = {}) {
    super(type, eventInitDict);

    this.clipboardData = eventInitDict.clipboardData ?? null;
  }
}
