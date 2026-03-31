import type {ComputedStyle} from '../../css/types';

/**
 * A child's intrinsic measurements used as input to flex sizing.
 *
 * {@link FlexLayout.computeSizes} uses these values together with the child's
 * flex properties (from {@link computedStyle}) to resolve the final main-axis
 * and cross-axis dimensions.
 */
export interface FlexChildBasis {
  /** Intrinsic main-axis total size (including the child's margin). */
  intrinsicMainSize: number;

  /** Intrinsic cross-axis total size (including the child's margin). */
  intrinsicCrossSize: number;

  /** The child's computed style (flex-grow, flex-shrink, flex-basis, align-self, min/max, etc.). */
  computedStyle: ComputedStyle;
}
