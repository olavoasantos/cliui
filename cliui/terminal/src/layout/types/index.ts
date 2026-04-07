import type {Element} from '@cliui/dom';
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
 * Options controlling text measurement behavior.
 */
export interface TextLayoutOptions {
  /** White-space handling mode. */
  whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap';

  /** Overflow behavior for unwrapped text. */
  textOverflow?: 'clip' | 'ellipsis';

  /** Controls whether long words may break at grapheme boundaries. */
  overflowWrap?: 'normal' | 'break-word';

  /** Controls word-breaking behavior for all text. */
  wordBreak?: 'normal' | 'break-all';

  /** Number of spaces per tab stop in `pre-wrap` mode. */
  tabSize?: number;
}

/**
 * Represents a positioned box in the layout tree.
 *
 * Each layout box corresponds to a DOM element and contains the computed
 * position, dimensions, content area, styling information, and child boxes.
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

  /** The active vertical scroll offset for `overflow: scroll`. */
  scrollOffsetY?: number;

  /** The total scrollable content height for `overflow: scroll`. */
  scrollHeight?: number;

  /** The z-index for layer ordering. */
  zIndex: number;
}

/**
 * Parsed box-model values extracted from a computed style map.
 * @internal
 */
export interface BoxModel {
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
  marginTop: number;
  marginRight: number;
  marginBottom: number;
  marginLeft: number;
  borderTop: number;
  borderRight: number;
  borderBottom: number;
  borderLeft: number;
}

/**
 * A child's intrinsic measurements used as input to flex sizing.
 * @internal
 */
export interface FlexChildBasis {
  /** Intrinsic main-axis total size (including the child's margin). */
  intrinsicMainSize: number;

  /** Intrinsic cross-axis total size (including the child's margin). */
  intrinsicCrossSize: number;

  /** The child's computed style (flex-grow, flex-shrink, flex-basis, align-self, min/max, etc.). */
  computedStyle: ComputedStyle;
}

/**
 * Precomputed layout context shared between {@link FlexLayout.computeSizes}
 * and {@link FlexLayout.position}.
 * @internal
 */
export interface FlexContext {
  /** Container outer width (border-box + content). */
  outerWidth: number;
  /** Container outer height (border-box + content). */
  outerHeight: number;
  /** Container content area width. */
  contentWidth: number;
  /** Container content area height. */
  contentHeight: number;
  /** Parsed box model insets. */
  boxModel: BoxModel;
  /** Total horizontal margin. */
  horizontalMargin: number;
  /** Total horizontal border + padding. */
  horizontalBorderPadding: number;
  /** Total vertical border + padding. */
  verticalBorderPadding: number;
  /** Resolved flex-direction value. */
  flexDirection: string;
  /** Whether the main axis is horizontal. */
  isRowDirection: boolean;
  /** Whether flex wrapping is enabled. */
  isWrapEnabled: boolean;
  /** Whether wrap direction is reversed. */
  isWrapReverse: boolean;
  /** Main-axis gap between items. */
  mainGap: number;
  /** Cross-axis gap between lines. */
  lineGap: number;
  /** Resolved z-index. */
  zIndex: number;
  /** Flex line structure — each entry is an array of child indices. */
  lineChildIndices: number[][];
  /** Cross size per flex line. */
  lineCrossSizes: number[];
}

/**
 * A wrapped flex line produced during layout.
 * @internal
 */
export interface FlexLine {
  children: LayoutBox[];
  crossSize: number;
}

/**
 * Resolved dimensions for a single flex child after grow/shrink distribution.
 * @internal
 */
export interface FlexResolvedChild {
  /** Final main-axis total size after flex grow/shrink and min/max clamping. */
  mainSize: number;
  /** Final cross-axis total size (may be stretched to the flex line's cross size). */
  crossSize: number;
  /** Whether the cross-axis was stretched beyond the intrinsic size. */
  stretched: boolean;
}

/**
 * Result of {@link FlexLayout.computeSizes}: resolved child dimensions and
 * the precomputed context needed by {@link FlexLayout.position}.
 * @internal
 */
export interface FlexSizingResult {
  /** Resolved dimensions per child, in input order. */
  resolvedChildren: FlexResolvedChild[];
  /** Opaque context for the positioning phase. */
  context: FlexContext;
}

/**
 * Pre-computed text measurement data for fast relayout.
 * @internal
 */
export interface PreparedText {
  /** Word strings after whitespace collapsing and splitting. */
  readonly words: string[];
  /** Pre-measured cell widths per word (parallel to {@link words}). */
  readonly widths: number[];
  /**
   * Per-grapheme cell widths for words that may need to be broken at
   * grapheme boundaries when they exceed the available line width.
   * `null` entries indicate the word has only one grapheme or is narrow
   * enough that sub-word breaking metadata is not needed.
   */
  readonly graphemeWidths: (number[] | null)[];
  /**
   * Per-grapheme text strings for breakable words (parallel to
   * {@link graphemeWidths}). `null` when the word is not breakable.
   */
  readonly graphemes: (string[] | null)[];
  /**
   * Whether the words array contains explicit `' '` space segments.
   * When `false`, spaces between words are implicit and the layout
   * walk joins consecutive words with spaces at break opportunities.
   */
  readonly hasExplicitSpaces: boolean;
}

/**
 * Classifies how a segment break character behaves during line layout.
 * @internal
 */
export type SegmentBreakKind =
  | 'text'
  | 'space'
  | 'glue'
  | 'zero-width-break'
  | 'soft-hyphen'
  | 'hard-break';
