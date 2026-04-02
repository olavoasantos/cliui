/**
 * Represents a single visual line computed from a flat grapheme array.
 *
 * Visual lines are produced by {@link computeVisualLines} and account
 * for explicit `\n` line breaks and optional word wrapping at a given
 * viewport width.
 */
export interface VisualLine {
  /** Grapheme index where this visual line starts (inclusive). */
  start: number;

  /** Grapheme index where this visual line ends (exclusive). */
  end: number;

  /** Total terminal cell width of the graphemes on this line. */
  width: number;
}
