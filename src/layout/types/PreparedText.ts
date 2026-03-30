/**
 * Pre-computed text measurement data for fast relayout.
 *
 * Created by the preparation phase (whitespace collapsing + word splitting +
 * `cellWidth` measurement), consumed by the layout phase (pure arithmetic on
 * cached widths). Separating these phases means resize-driven relayout skips
 * all string operations and width measurement.
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
}
