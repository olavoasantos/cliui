import {MouseEvent} from './MouseEvent';
import type {WheelEventInit} from '../types/index';

/**
 * Represents a wheel (scroll) event dispatched from terminal input.
 */
export class WheelEvent extends MouseEvent {
  static DOM_DELTA_PIXEL = 0;
  static DOM_DELTA_LINE = 1;
  static DOM_DELTA_PAGE = 2;

  readonly deltaX: number;
  readonly deltaY: number;
  readonly deltaZ: number;
  readonly deltaMode: number;

  constructor(type: string, eventInitDict?: WheelEventInit) {
    super(type, eventInitDict);

    this.deltaX = eventInitDict?.deltaX ?? 0;
    this.deltaY = eventInitDict?.deltaY ?? 0;
    this.deltaZ = eventInitDict?.deltaZ ?? 0;
    this.deltaMode = eventInitDict?.deltaMode ?? 0;
  }
}
