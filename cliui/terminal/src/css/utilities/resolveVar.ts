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

  /* Fast path: value is exactly "var(--name)" or "var(--name, fallback)" */
  const len = value.length;

  if (
    value.charCodeAt(0) === 118 /* v */ &&
    value.startsWith('var(') &&
    value.charCodeAt(len - 1) === 41 /* ) */
  ) {
    /* Check there is no text outside the outer var() */
    let outerDepth = 1;
    let outerClose = 4;

    while (outerClose < len && outerDepth > 0) {
      const c = value.charCodeAt(outerClose);

      if (c === 40 /* ( */) outerDepth++;
      else if (c === 41 /* ) */) outerDepth--;

      outerClose++;
    }

    if (outerDepth === 0 && outerClose === len) {
      return resolveVarCall(value, 4, len - 1, properties, maxDepth);
    }
  }

  /* General path: collect chunks and join once */
  const chunks: string[] = [];
  let pos = 0;

  while (pos < len) {
    const fnStart = findFunctionStart(value, pos);

    if (fnStart === -1) {
      /* No more functions — push the tail and stop */
      chunks.push(pos === 0 ? value : value.slice(pos));
      break;
    }

    /* Walk backwards to find the function name start */
    let nameStart = fnStart;

    while (nameStart > pos && isFuncNameChar(value.charCodeAt(nameStart - 1))) {
      nameStart--;
    }

    if (nameStart === fnStart) {
      /* Bare parenthesis, not a function — skip past it */
      chunks.push(value.slice(pos, fnStart + 1));
      pos = fnStart + 1;
      continue;
    }

    /* Find the matching close parenthesis */
    let depth = 1;
    let closePos = fnStart + 1;

    while (closePos < len && depth > 0) {
      const c = value.charCodeAt(closePos);

      if (c === 40 /* ( */) depth++;
      else if (c === 41 /* ) */) depth--;

      closePos++;
    }

    if (depth !== 0) {
      /* Unmatched paren — push the rest as-is */
      chunks.push(value.slice(pos));
      break;
    }

    /* Push any text before the function */
    if (nameStart > pos) {
      chunks.push(value.slice(pos, nameStart));
    }

    /* argsStart/argsEnd are indices into `value` for the content inside parens */
    const argsStart = fnStart + 1;
    const argsEnd = closePos - 1;

    /* Check if this is a var() call (length 3, "var") */
    const nameLen = fnStart - nameStart;

    if (
      nameLen === 3 &&
      value.charCodeAt(nameStart) === 118 /* v */ &&
      value.charCodeAt(nameStart + 1) === 97 /* a */ &&
      value.charCodeAt(nameStart + 2) === 114 /* r */
    ) {
      chunks.push(resolveVarCall(value, argsStart, argsEnd, properties, maxDepth));
    } else {
      /* Non-var function: recurse into its args */
      const name = value.slice(nameStart, fnStart);
      const args = value.slice(argsStart, argsEnd);

      chunks.push(name + '(' + resolveVar(args, properties, maxDepth - 1) + ')');
    }

    pos = closePos;
  }

  return chunks.length === 1 ? chunks[0]! : chunks.join('');
}

/**
 * Resolves a single `var()` call whose args span `value[argsStart..argsEnd)`.
 * Avoids allocating a substring for the args when possible.
 */
function resolveVarCall(
  value: string,
  argsStart: number,
  argsEnd: number,
  properties: ComputedStyle,
  maxDepth: number,
): string {
  /* Find the top-level comma (if any) within the args region */
  let depth = 0;
  let commaIndex = -1;

  for (let i = argsStart; i < argsEnd; i++) {
    const c = value.charCodeAt(i);

    if (c === 40 /* ( */) {
      depth++;
    } else if (c === 41 /* ) */) {
      depth--;
    } else if (c === 44 /* , */ && depth === 0) {
      commaIndex = i;
      break;
    }
  }

  /* Extract and trim the property name */
  let nameStart = argsStart;
  let nameEnd = commaIndex === -1 ? argsEnd : commaIndex;

  while (nameStart < nameEnd && value.charCodeAt(nameStart) <= 32) nameStart++;
  while (nameEnd > nameStart && value.charCodeAt(nameEnd - 1) <= 32) nameEnd--;

  const name = value.slice(nameStart, nameEnd);
  const resolved = properties.get(name);

  if (resolved !== undefined) {
    return resolveVar(resolved, properties, maxDepth - 1);
  }

  if (commaIndex !== -1) {
    /* Extract and trim the fallback */
    let fbStart = commaIndex + 1;
    let fbEnd = argsEnd;

    while (fbStart < fbEnd && value.charCodeAt(fbStart) <= 32) fbStart++;
    while (fbEnd > fbStart && value.charCodeAt(fbEnd - 1) <= 32) fbEnd--;

    return resolveVar(value.slice(fbStart, fbEnd), properties, maxDepth - 1);
  }

  return '';
}

/**
 * Finds the index of the next `(` that is preceded by at least one
 * function-name character, starting from `offset`.
 * Returns -1 if not found.
 */
function findFunctionStart(value: string, offset: number): number {
  for (let i = offset; i < value.length; i++) {
    if (value.charCodeAt(i) === 40 /* ( */) {
      return i;
    }
  }

  return -1;
}

/**
 * Returns true if the charCode represents a valid CSS function-name character:
 * `[a-zA-Z0-9_-]`
 */
function isFuncNameChar(code: number): boolean {
  return (
    (code >= 97 && code <= 122) /* a-z */ ||
    (code >= 65 && code <= 90) /* A-Z */ ||
    (code >= 48 && code <= 57) /* 0-9 */ ||
    code === 95 /* _ */ ||
    code === 45 /* - */
  );
}
