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

/**
 * A consecutive horizontal run of changed cells on a single row.
 */
export interface ChangedRegion {
  /** Start column of the changed run. */
  x: number;
  /** Row containing the changed run. */
  y: number;
  /** Cells from left to right within the changed run. */
  cells: Cell[];
}

/**
 * Supported terminal graphics protocol identifiers.
 */
export type GraphicsProtocolName = 'kitty' | 'iterm2' | 'sixel' | 'fallback' | (string & {});

/**
 * A pluggable terminal graphics protocol that can render images.
 */
export interface GraphicsProtocol {
  /** Unique protocol identifier used for capability matching. */
  readonly name: GraphicsProtocolName;
  /**
   * Produces terminal escape sequences that render an image.
   *
   * @param request - The image data and target cell region.
   * @returns Escape sequence string to write to the terminal.
   */
  render(request: ImageRenderRequest): string;
}

/**
 * Describes an image that needs to be rendered at a specific cell
 * region during the current frame.
 */
export interface ImageRenderRequest {
  /** Raw image file bytes (PNG, JPEG, or GIF). */
  data: Uint8Array;
  /** Original image pixel width as read from the file header. */
  naturalWidth: number;
  /** Original image pixel height as read from the file header. */
  naturalHeight: number;
  /** Terminal column where the image region starts. */
  x: number;
  /** Terminal row where the image region starts. */
  y: number;
  /** Width of the image region in terminal cells. */
  cellWidth: number;
  /** Height of the image region in terminal cells. */
  cellHeight: number;
  /** Fallback text to display when no graphics protocol is available. */
  alt: string;
}

/**
 * Border character set used to paint a one-cell border around a layout box.
 */
export interface BorderCharacters {
  topLeft: string;
  topRight: string;
  bottomLeft: string;
  bottomRight: string;
  top: string;
  bottom: string;
  left: string;
  right: string;
}

/**
 * Painter metrics derived from a layout box.
 * @internal
 */
export interface BoxMetrics {
  outerX: number;
  outerY: number;
  outerWidth: number;
  outerHeight: number;
  hasBorder: boolean;
}

/**
 * Rectangular clipping region used during painting.
 * @internal
 */
export interface ClipRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A color stop with a normalized position (0.0–1.0). */
export interface ColorStop {
  color: RGBColor;
  position: number;
}

/**
 * Parsed result of a `linear-gradient()` CSS value.
 * @internal
 */
export interface ParsedGradient {
  /** CSS angle in degrees (default 180 = top to bottom). */
  angleDeg: number;
  /** Color stops with normalized positions (0.0–1.0). */
  stops: ColorStop[];
}

/**
 * ANSI writer style state tracked across serialized cells.
 * @internal
 */
export interface StyleState {
  fg: RGBColor | null;
  bg: RGBColor | null;
  bold: boolean;
  italic: boolean;
  underline: UnderlineStyle;
  underlineColor: RGBColor | null;
  strikethrough: boolean;
  faint: boolean;
  hyperlink: string | null;
}

/**
 * Parsed image dimensions from a file header.
 * @internal
 */
export interface ImageDimensions {
  /** Image width in pixels. */
  width: number;
  /** Image height in pixels. */
  height: number;
}
