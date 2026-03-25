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

  /** Horizontal edge character. */
  horizontal: string;

  /** Vertical edge character. */
  vertical: string;
}

/**
 * Phase 1 border character mappings derived from Lip Gloss border sets.
 */
export const BORDER_CHARACTERS: Record<string, BorderCharacters> = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    horizontal: '─',
    vertical: '│',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    horizontal: '─',
    vertical: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    horizontal: '═',
    vertical: '║',
  },
  thick: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    horizontal: '━',
    vertical: '┃',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    horizontal: '-',
    vertical: '|',
  },
  hidden: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    horizontal: ' ',
    vertical: ' ',
  },
};
