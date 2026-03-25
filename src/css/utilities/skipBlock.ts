import {findClosingBrace} from './findClosingBrace';

/** Skips a CSS block starting just after its opening brace. */
export function skipBlock(css: string, position: number): number {
  const closeIndex = findClosingBrace(css, position);
  return closeIndex === -1 ? css.length : closeIndex + 1;
}
