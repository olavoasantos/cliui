import {Event} from './Event';
import type {ToggleEventInit} from '../types/index';

export class ToggleEvent extends Event {
  readonly oldState: string | undefined;
  readonly newState: string | undefined;

  constructor(type: string, eventInitDict: ToggleEventInit) {
    super(type, eventInitDict);

    this.oldState = eventInitDict.oldState;
    this.newState = eventInitDict.newState;
  }
}
