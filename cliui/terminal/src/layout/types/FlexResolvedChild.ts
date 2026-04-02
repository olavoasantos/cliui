/**
 * Resolved dimensions for a single flex child after grow/shrink distribution.
 *
 * Produced by {@link FlexLayout.computeSizes} and consumed by
 * {@link LayoutEngine} to lay out each child at its final size before the
 * positioning phase.
 */
export interface FlexResolvedChild {
  /** Final main-axis total size after flex grow/shrink and min/max clamping. */
  mainSize: number;

  /** Final cross-axis total size (may be stretched to the flex line's cross size). */
  crossSize: number;

  /** Whether the cross-axis was stretched beyond the intrinsic size. */
  stretched: boolean;
}
