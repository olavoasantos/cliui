import type {ComputedStyle} from '../types';

/**
 * Resolves `var()` references in a CSS value string.
 *
 * Supports `var(--name)` and `var(--name, fallback)`.  Fallback values
 * may themselves contain `var()` references which are resolved
 * recursively.  Returns the original value unchanged when it contains
 * no `var()` calls.
 *
 * @param value - The CSS value string that may contain `var()` references.
 * @param properties - Map of custom property names to their values.
 * @param maxDepth - Recursion guard (defaults to 10).
 */
export function resolveVar(value: string, properties: ComputedStyle, maxDepth = 10): string {
  if (maxDepth <= 0 || !value.includes('var(')) {
    return value;
  }

  let result = '';
  let pos = 0;

  while (pos < value.length) {
    const varStart = value.indexOf('var(', pos);

    if (varStart === -1) {
      result += value.slice(pos);
      break;
    }

    result += value.slice(pos, varStart);

    const contentStart = varStart + 4;
    const contentEnd = findMatchingParen(value, contentStart);

    if (contentEnd === -1) {
      result += value.slice(varStart);
      break;
    }

    const content = value.slice(contentStart, contentEnd);
    const commaIndex = findTopLevelComma(content);

    let name: string;
    let fallback: string | undefined;

    if (commaIndex === -1) {
      name = content.trim();
    } else {
      name = content.slice(0, commaIndex).trim();
      fallback = content.slice(commaIndex + 1).trim();
    }

    const resolved = properties.get(name);

    if (resolved !== undefined) {
      result += resolveVar(resolved, properties, maxDepth - 1);
    } else if (fallback !== undefined) {
      result += resolveVar(fallback, properties, maxDepth - 1);
    }

    pos = contentEnd + 1;
  }

  return result;
}

/**
 * Finds the index of the closing parenthesis that matches the opening
 * one at `start - 1`.  Handles nested parentheses.
 */
function findMatchingParen(text: string, start: number): number {
  let depth = 1;

  for (let i = start; i < text.length; i++) {
    if (text[i] === '(') {
      depth++;
    } else if (text[i] === ')') {
      depth--;

      if (depth === 0) {
        return i;
      }
    }
  }

  return -1;
}

/**
 * Finds the index of the first comma that is not nested inside
 * parentheses.  Returns -1 if no top-level comma is found.
 */
function findTopLevelComma(text: string): number {
  let depth = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (ch === '(') {
      depth++;
    } else if (ch === ')') {
      depth--;
    } else if (ch === ',' && depth === 0) {
      return i;
    }
  }

  return -1;
}
