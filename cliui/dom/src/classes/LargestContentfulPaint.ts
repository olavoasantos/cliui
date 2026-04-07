import {PerformanceEntry} from './PerformanceEntry';

import type {Element} from './Element';
import type {LargestContentfulPaintOptions} from '../types';

/**
 * Entry tracking the largest element by cell area that renders non-empty content.
 *
 * Updated when a larger element renders on a subsequent frame, until the first
 * user interaction (matching browser LCP behavior).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/LargestContentfulPaint
 */
export class LargestContentfulPaint extends PerformanceEntry {
  #element: Element;
  #size: number;
  #renderTime: number;

  constructor(options: LargestContentfulPaintOptions) {
    super('largest-contentful-paint', 'largest-contentful-paint', options.renderTime, 0);
    this.#element = options.element;
    this.#size = options.size;
    this.#renderTime = options.renderTime;
  }

  /** The DOM element that triggered this LCP entry. */
  get element(): Element {
    return this.#element;
  }

  /** The cell area of the element (`contentWidth × contentHeight`). */
  get size(): number {
    return this.#size;
  }

  /** High-resolution timestamp when the element was painted. */
  get renderTime(): number {
    return this.#renderTime;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      size: this.#size,
      renderTime: this.#renderTime,
    };
  }
}
