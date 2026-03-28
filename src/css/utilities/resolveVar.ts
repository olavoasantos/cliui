import {parseCSSFunction} from './parseCSSFunction';

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
    const fn = parseCSSFunction(value, pos);

    if (fn === null) {
      result += value.slice(pos);
      break;
    }

    if (fn.name !== 'var') {
      /* Skip past this non-var function, but recurse into its args */
      result += value.slice(pos, fn.start);
      result += fn.name + '(' + resolveVar(fn.args, properties, maxDepth - 1) + ')';
      pos = fn.end;
      continue;
    }

    result += value.slice(pos, fn.start);

    const commaIndex = findTopLevelComma(fn.args);

    let name: string;
    let fallback: string | undefined;

    if (commaIndex === -1) {
      name = fn.args.trim();
    } else {
      name = fn.args.slice(0, commaIndex).trim();
      fallback = fn.args.slice(commaIndex + 1).trim();
    }

    const resolved = properties.get(name);

    if (resolved !== undefined) {
      result += resolveVar(resolved, properties, maxDepth - 1);
    } else if (fallback !== undefined) {
      result += resolveVar(fallback, properties, maxDepth - 1);
    }

    pos = fn.end;
  }

  return result;
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
