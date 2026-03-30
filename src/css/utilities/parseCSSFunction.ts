import type {CSSFunctionCall} from '../types/CSSFunctionCall';

/**
 * Finds the first CSS function call in a value string.
 *
 * Handles nested parentheses correctly so that
 * `var(--a, var(--b))` returns the outer `var` with the full
 * inner content as `args`.
 *
 * @param value - CSS value string to search.
 * @param offset - Position to start searching from.
 * @returns The parsed function call, or `null` if none found.
 */
export function parseCSSFunction(value: string, offset = 0): CSSFunctionCall | null {
  const funcStart = value.indexOf('(', offset);

  if (funcStart === -1) {
    return null;
  }

  // Walk backwards from '(' to find the function name
  let nameStart = funcStart;

  while (nameStart > offset && /[a-zA-Z0-9_-]/.test(value[nameStart - 1]!)) {
    nameStart--;
  }

  if (nameStart === funcStart) {
    // No name before the paren — not a function call
    return null;
  }

  const name = value.slice(nameStart, funcStart);

  // Find matching closing paren
  let depth = 1;
  let pos = funcStart + 1;

  while (pos < value.length && depth > 0) {
    if (value[pos] === '(') {
      depth++;
    } else if (value[pos] === ')') {
      depth--;
    }

    pos++;
  }

  if (depth !== 0) {
    // Unmatched parenthesis
    return null;
  }

  const args = value.slice(funcStart + 1, pos - 1);

  return {name, args, start: nameStart, end: pos};
}
