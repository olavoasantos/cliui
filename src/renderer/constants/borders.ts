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

/**
 * Built-in border character mappings derived from Lip Gloss border sets.
 */
export const BORDER_CHARACTERS: Record<string, BorderCharacters> = {
  single: {
    topLeft: '┌',
    topRight: '┐',
    bottomLeft: '└',
    bottomRight: '┘',
    top: '─',
    bottom: '─',
    left: '│',
    right: '│',
  },
  rounded: {
    topLeft: '╭',
    topRight: '╮',
    bottomLeft: '╰',
    bottomRight: '╯',
    top: '─',
    bottom: '─',
    left: '│',
    right: '│',
  },
  double: {
    topLeft: '╔',
    topRight: '╗',
    bottomLeft: '╚',
    bottomRight: '╝',
    top: '═',
    bottom: '═',
    left: '║',
    right: '║',
  },
  thick: {
    topLeft: '┏',
    topRight: '┓',
    bottomLeft: '┗',
    bottomRight: '┛',
    top: '━',
    bottom: '━',
    left: '┃',
    right: '┃',
  },
  block: {
    topLeft: '█',
    topRight: '█',
    bottomLeft: '█',
    bottomRight: '█',
    top: '█',
    bottom: '█',
    left: '█',
    right: '█',
  },
  'half-block': {
    topLeft: '▛',
    topRight: '▜',
    bottomLeft: '▙',
    bottomRight: '▟',
    top: '▀',
    bottom: '▄',
    left: '▌',
    right: '▐',
  },
  ascii: {
    topLeft: '+',
    topRight: '+',
    bottomLeft: '+',
    bottomRight: '+',
    top: '-',
    bottom: '-',
    left: '|',
    right: '|',
  },
  hidden: {
    topLeft: ' ',
    topRight: ' ',
    bottomLeft: ' ',
    bottomRight: ' ',
    top: ' ',
    bottom: ' ',
    left: ' ',
    right: ' ',
  },
};
