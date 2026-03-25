import {skipString} from './skipString';

/** Finds the matching closing brace for a CSS block. */
export function findClosingBrace(css: string, position: number): number {
  let depth = 1;
  const length = css.length;

  while (position < length && depth > 0) {
    const codePoint = css.charCodeAt(position);

    if (codePoint === 47 && position + 1 < length && css.charCodeAt(position + 1) === 42) {
      const endIndex = css.indexOf('*/', position + 2);

      if (endIndex === -1) {
        return -1;
      }

      position = endIndex + 2;
      continue;
    }

    if (codePoint === 34 || codePoint === 39) {
      position = skipString(css, position, codePoint);
      continue;
    }

    if (codePoint === 123) {
      depth += 1;
    }

    if (codePoint === 125) {
      depth -= 1;
    }

    position += 1;
  }

  return depth === 0 ? position - 1 : -1;
}
