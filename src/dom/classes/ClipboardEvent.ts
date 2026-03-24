import {Event} from './Event';

export interface ClipboardEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  clipboardData?: DataTransfer | null;
}

export class ClipboardEvent extends Event {
  readonly clipboardData: DataTransfer | null;

  constructor(type: string, eventInitDict: ClipboardEventInit = {}) {
    super(type, eventInitDict);

    this.clipboardData = eventInitDict.clipboardData ?? null;
  }
}
