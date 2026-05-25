import {MouseEvent} from './MouseEvent';
import type {WheelEventInit} from '../types';

/**
 * Represents a wheel (scroll) event dispatched from terminal input.
 */
export class WheelEvent extends MouseEvent {
  /** Delta mode: pixel-based deltas. */
  static DOM_DELTA_PIXEL = 0;
  /** Delta mode: line-based deltas. */
  static DOM_DELTA_LINE = 1;
  /** Delta mode: page-based deltas. */
  static DOM_DELTA_PAGE = 2;

  /** Horizontal scroll amount. */
  readonly deltaX: number;
  /** Vertical scroll amount. */
  readonly deltaY: number;
  /** Depth-axis scroll amount. */
  readonly deltaZ: number;
  /** Unit of the delta values (`DOM_DELTA_PIXEL`, `DOM_DELTA_LINE`, or `DOM_DELTA_PAGE`). */
  readonly deltaMode: number;

  /**
   * Creates a wheel event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with delta values and mouse event properties.
   */
  constructor(type: string, eventInitDict?: WheelEventInit) {
    super(type, eventInitDict);

    this.deltaX = eventInitDict?.deltaX ?? 0;
    this.deltaY = eventInitDict?.deltaY ?? 0;
    this.deltaZ = eventInitDict?.deltaZ ?? 0;
    this.deltaMode = eventInitDict?.deltaMode ?? 0;
  }
}
