import {Event} from './Event';
import type {PromiseRejectionEventInit} from '../types/index';

export class PromiseRejectionEvent extends Event {
  readonly promise: Promise<unknown>;
  readonly reason: unknown;

  constructor(type: string, eventInitDict: PromiseRejectionEventInit) {
    super(type, eventInitDict);

    this.promise = eventInitDict.promise;
    this.reason = eventInitDict.reason;
  }
}
