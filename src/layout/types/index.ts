import type {Element} from '../../dom/classes/Element';
import type {ComputedStyle} from '../../css/types';

/**
 * Represents a single line of measured text produced by {@link TextLayout}.
 *
 * Each line contains the text content and its pre-computed terminal cell width,
 * so the layout engine can position lines without re-measuring.
 */
export interface TextLine {
  /** The text content of this line. */
  text: string;

  /** The terminal cell width of this line, as measured by `cellWidth`. */
  width: number;
}

/**
 * Represents a positioned box in the layout tree.
 *
 * Each layout box corresponds to a DOM element and contains the computed
 * position, dimensions, content area, styling information, and child boxes.
 * The outer dimensions (x, y, width, height) include margin, border, and
 * padding. The content area (contentX, contentY, contentWidth, contentHeight)
 * is the inner region where children and text are placed.
 */
export interface LayoutBox {
  /** The DOM element this layout box corresponds to. */
  element: Element;

  /** The x position of the box's margin edge in terminal cells. */
  x: number;

  /** The y position of the box's margin edge in terminal cells. */
  y: number;

  /** The total width of the box including margin, border, and padding. */
  width: number;

  /** The total height of the box including margin, border, and padding. */
  height: number;

  /** The x position of the content area in terminal cells. */
  contentX: number;

  /** The y position of the content area in terminal cells. */
  contentY: number;

  /** The width of the content area in terminal cells. */
  contentWidth: number;

  /** The height of the content area in terminal cells. */
  contentHeight: number;

  /** The computed CSS styles for this element. */
  computedStyle: ComputedStyle;

  /** Measured text lines for text content, if any. */
  textLines?: string[];

  /** Child layout boxes positioned within this box's content area. */
  children: LayoutBox[];

  /** The z-index for layer ordering. */
  zIndex: number;
}
