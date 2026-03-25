/** Skips CSS whitespace and block comments starting at a given offset. */
export function skipWhitespaceAndComments(css: string, position: number): number {
  const length = css.length;

  while (position < length) {
    const codePoint = css.charCodeAt(position);

    if (codePoint === 32 || codePoint === 9 || codePoint === 10 || codePoint === 13) {
      position += 1;
      continue;
    }

    if (codePoint === 47 && position + 1 < length && css.charCodeAt(position + 1) === 42) {
      const endIndex = css.indexOf('*/', position + 2);

      if (endIndex === -1) {
        return length;
      }

      position = endIndex + 2;
      continue;
    }

    break;
  }

  return position;
}
