/**
 * A 24-bit RGB color value used by renderer cells.
 */
export interface RGBColor {
  /** Red channel (0-255). */
  r: number;

  /** Green channel (0-255). */
  g: number;

  /** Blue channel (0-255). */
  b: number;
}

/**
 * Supported underline styles for painted text.
 */
export type UnderlineStyle = 'none' | 'solid' | 'double' | 'dotted' | 'dashed' | 'wavy';

/**
 * A single terminal cell in the renderer's backing buffer.
 */
export interface Cell {
  /** The grapheme or character painted into this cell. */
  char: string;

  /** Foreground color. */
  fg: RGBColor | null;

  /** Background color. */
  bg: RGBColor | null;

  /** Bold text flag. */
  bold: boolean;

  /** Italic text flag. */
  italic: boolean;

  /** Underline style. */
  underline: UnderlineStyle;

  /** Underline color. */
  underlineColor: RGBColor | null;

  /** Strikethrough text flag. */
  strikethrough: boolean;

  /** ANSI faint flag. */
  faint: boolean;

  /** Hyperlink target carried by this cell. */
  hyperlink: string | null;
}
