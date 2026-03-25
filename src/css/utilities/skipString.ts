/** Advances past a CSS string literal. */
export function skipString(css: string, position: number, quote: number): number {
  position += 1;
  const length = css.length;

  while (position < length) {
    const codePoint = css.charCodeAt(position);

    if (codePoint === 92) {
      position += 2;
      continue;
    }

    if (codePoint === quote) {
      position += 1;
      break;
    }

    position += 1;
  }

  return position;
}
