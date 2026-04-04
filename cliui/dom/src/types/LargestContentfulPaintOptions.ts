import type {Element} from '../classes/Element';

/** Options for constructing a {@link LargestContentfulPaint} entry. */
export interface LargestContentfulPaintOptions {
  /** High-resolution timestamp when the element was painted. */
  renderTime: number;
  /** The cell area of the element (`contentWidth × contentHeight`). */
  size: number;
  /** The DOM element that triggered the LCP. */
  element: Element;
}
