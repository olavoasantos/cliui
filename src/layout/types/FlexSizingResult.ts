import type {FlexContext} from './FlexContext';
import type {FlexResolvedChild} from './FlexResolvedChild';

/**
 * Result of {@link FlexLayout.computeSizes}: resolved child dimensions and
 * the precomputed context needed by {@link FlexLayout.position}.
 */
export interface FlexSizingResult {
  /** Resolved dimensions per child, in input order. */
  resolvedChildren: FlexResolvedChild[];

  /** Opaque context for the positioning phase. */
  context: FlexContext;
}
