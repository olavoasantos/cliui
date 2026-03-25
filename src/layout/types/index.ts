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
