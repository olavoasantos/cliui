import {parseSelector} from '../../dom/utilities/parseSelector';

import type {CSSDeclaration, CSSRule} from '../types';

/**
 * Hand-written CSS parser that takes CSS text and produces a list of rules.
 * Each rule contains parsed selector ASTs and a list of property declarations.
 */
export class CSSParser {
  /** Parses a CSS string into a list of rules. */
  parse(css: string): CSSRule[] {
    const rules: CSSRule[] = [];
    let pos = 0;
    const len = css.length;

    while (pos < len) {
      pos = skipWhitespaceAndComments(css, pos);
      if (pos >= len) break;

      const braceIdx = css.indexOf('{', pos);
      if (braceIdx === -1) break;

      const selectorText = css.slice(pos, braceIdx).trim();
      if (!selectorText) {
        pos = skipBlock(css, braceIdx + 1);
        continue;
      }

      const closeIdx = findClosingBrace(css, braceIdx + 1);
      if (closeIdx === -1) break;

      const bodyText = css.slice(braceIdx + 1, closeIdx);
      const declarations = parseDeclarations(bodyText);
      const selectors = parseSelectorList(selectorText);

      if (selectors.length > 0 && declarations.length > 0) {
        rules.push({selectors, declarations});
      }

      pos = closeIdx + 1;
    }

    return rules;
  }
}

function parseSelectorList(selectorText: string) {
  const raw = selectorText.split(',');
  const result = [];

  for (const selector of raw) {
    const trimmed = selector.trim();
    if (!trimmed) continue;
    try {
      const parts = parseSelector(trimmed);
      if (parts.length > 0 && parts[0]!.matchers.length > 0) {
        result.push(parts);
      }
    } catch {
      // Skip malformed selectors gracefully.
    }
  }

  return result;
}

function parseDeclarations(body: string): CSSDeclaration[] {
  const declarations: CSSDeclaration[] = [];
  const parts = body.split(';');

  for (const part of parts) {
    const colonIdx = part.indexOf(':');
    if (colonIdx === -1) continue;

    const property = part.slice(0, colonIdx).trim();
    const value = part.slice(colonIdx + 1).trim();
    if (property && value) declarations.push({property, value});
  }

  return declarations;
}

function skipWhitespaceAndComments(css: string, pos: number): number {
  const len = css.length;

  while (pos < len) {
    const ch = css.charCodeAt(pos);
    if (ch === 32 || ch === 9 || ch === 10 || ch === 13) {
      pos++;
      continue;
    }

    if (ch === 47 && pos + 1 < len && css.charCodeAt(pos + 1) === 42) {
      const endIdx = css.indexOf('*/', pos + 2);
      if (endIdx === -1) return len;
      pos = endIdx + 2;
      continue;
    }

    break;
  }

  return pos;
}

function findClosingBrace(css: string, pos: number): number {
  let depth = 1;
  const len = css.length;

  while (pos < len && depth > 0) {
    const ch = css.charCodeAt(pos);

    if (ch === 47 && pos + 1 < len && css.charCodeAt(pos + 1) === 42) {
      const endIdx = css.indexOf('*/', pos + 2);
      if (endIdx === -1) return -1;
      pos = endIdx + 2;
      continue;
    }

    if (ch === 34 || ch === 39) {
      pos = skipString(css, pos, ch);
      continue;
    }

    if (ch === 123) depth++;
    if (ch === 125) depth--;
    pos++;
  }

  return depth === 0 ? pos - 1 : -1;
}

function skipString(css: string, pos: number, quote: number): number {
  pos++;
  const len = css.length;

  while (pos < len) {
    const ch = css.charCodeAt(pos);
    if (ch === 92) {
      pos += 2;
      continue;
    }
    if (ch === quote) {
      pos++;
      break;
    }
    pos++;
  }

  return pos;
}

function skipBlock(css: string, pos: number): number {
  const closeIdx = findClosingBrace(css, pos);
  return closeIdx === -1 ? css.length : closeIdx + 1;
}
