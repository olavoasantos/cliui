/**
 * Border character set used to paint a one-cell border around a layout box.
 */
export interface BorderCharacters {
  /** Top-left corner character. */
  topLeft: string;

  /** Top-right corner character. */
  topRight: string;

  /** Bottom-left corner character. */
  bottomLeft: string;

  /** Bottom-right corner character. */
  bottomRight: string;

  /** Top edge character. */
  top: string;

  /** Bottom edge character. */
  bottom: string;

  /** Left edge character. */
  left: string;

  /** Right edge character. */
  right: string;
}
