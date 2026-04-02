import {ZERO_WIDTH_CLUSTER_REGEX} from '../constants/cellWidth';

/** Returns whether a grapheme cluster is entirely non-printing. */
export function ZeroWidthClusterGuard(segment: string): boolean {
  return ZERO_WIDTH_CLUSTER_REGEX.test(segment);
}
