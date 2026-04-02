import type {BoxModel} from './BoxModel';

/**
 * Precomputed layout context shared between {@link FlexLayout.computeSizes}
 * and {@link FlexLayout.position}.
 *
 * This carries the container metrics, flex configuration, and line structure
 * determined during the sizing phase so the positioning phase does not need
 * to recompute them.
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
