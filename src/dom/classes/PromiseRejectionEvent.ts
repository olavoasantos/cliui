import {Event} from './Event';

export interface PromiseRejectionEventInit {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  promise: Promise<unknown>;
  reason?: unknown;
}

export class PromiseRejectionEvent extends Event {
  readonly promise: Promise<unknown>;
  readonly reason: unknown;

  constructor(type: string, eventInitDict: PromiseRejectionEventInit) {
    super(type, eventInitDict);

    this.promise = eventInitDict.promise;
    this.reason = eventInitDict.reason;
  }
}
