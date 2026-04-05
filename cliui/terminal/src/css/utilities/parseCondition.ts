import type {MediaCondition} from '../types/MediaCondition';

/**
 * Parses a CSS media or container condition string into a structured AST.
 *
 * Supports:
 * - Feature queries: `(min-width: 120)`, `(prefers-color-scheme: dark)`
 * - Boolean `and`: `(min-width: 80) and (max-height: 40)`
 * - Boolean `not`: `not (min-width: 80)`
 * - Comma-separated alternatives (= `or`): `(min-width: 80), (orientation: portrait)`
 *
 * @param condition - The raw condition string (the prelude of `@media` or `@container`).
 * @returns A parsed {@link MediaCondition} AST node, or `null` if the condition is empty/invalid.
 */
export function parseCondition(condition: string): MediaCondition | null {
  const trimmed = condition.trim();
  if (!trimmed) return null;

  // Split by comma first — comma-separated lists are OR alternatives
  const alternatives = splitByComma(trimmed);

  if (alternatives.length > 1) {
    const conditions: MediaCondition[] = [];

    for (const alt of alternatives) {
      const parsed = parseConditionGroup(alt.trim());
      if (parsed) conditions.push(parsed);
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;

    return {type: 'or', conditions};
  }

  return parseConditionGroup(trimmed);
}

/**
 * Splits a condition string by commas that are not inside parentheses.
 */
function splitByComma(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(text.slice(start, i));
      start = i + 1;
    }
  }

  parts.push(text.slice(start));
  return parts;
}

/**
 * Parses a single condition group (no commas) — handles `not`, `and` chains,
 * and single feature expressions.
 */
function parseConditionGroup(text: string): MediaCondition | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Handle `not` prefix
  if (trimmed.startsWith('not ') || trimmed.startsWith('not(')) {
    const rest = trimmed.startsWith('not ') ? trimmed.slice(4).trim() : trimmed.slice(3).trim();
    const inner = parseConditionGroup(rest);
    if (!inner) return null;
    return {type: 'not', condition: inner};
  }

  // Split by ` and ` to find AND-combined conditions
  const andParts = splitByKeyword(trimmed, 'and');

  if (andParts.length > 1) {
    const conditions: MediaCondition[] = [];

    for (const part of andParts) {
      const parsed = parseSingleCondition(part.trim());
      if (parsed) conditions.push(parsed);
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;

    return {type: 'and', conditions};
  }

  // Split by ` or ` for explicit OR keyword (less common but valid)
  const orParts = splitByKeyword(trimmed, 'or');

  if (orParts.length > 1) {
    const conditions: MediaCondition[] = [];

    for (const part of orParts) {
      const parsed = parseSingleCondition(part.trim());
      if (parsed) conditions.push(parsed);
    }

    if (conditions.length === 0) return null;
    if (conditions.length === 1) return conditions[0]!;

    return {type: 'or', conditions};
  }

  return parseSingleCondition(trimmed);
}

/**
 * Splits a string by a keyword (e.g. `and`, `or`) that appears outside parentheses,
 * surrounded by whitespace.
 */
function splitByKeyword(text: string, keyword: string): string[] {
  const pattern = ` ${keyword} `;
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;

    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (depth === 0 && text.slice(i, i + pattern.length) === pattern) {
      parts.push(text.slice(start, i));
      start = i + pattern.length;
      i += pattern.length - 1;
    }
  }

  parts.push(text.slice(start));
  return parts;
}

/**
 * Parses a single parenthesized feature expression, e.g. `(min-width: 120)`.
 */
function parseSingleCondition(text: string): MediaCondition | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Must be wrapped in parens for a feature expression
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    const inner = trimmed.slice(1, -1).trim();

    // Check if this contains nested conditions (e.g. parenthesized groups)
    if (inner.includes('(')) {
      return parseConditionGroup(inner);
    }

    const colonIdx = inner.indexOf(':');
    if (colonIdx === -1) return null;

    const name = inner.slice(0, colonIdx).trim().toLowerCase();
    const value = inner.slice(colonIdx + 1).trim();

    if (!name || !value) return null;

    return {type: 'feature', name, value};
  }

  return null;
}
