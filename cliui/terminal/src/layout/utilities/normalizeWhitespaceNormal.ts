const COLLAPSIBLE_WHITESPACE_RUN = /[ \t\n\r\f]+/g;
const NEEDS_NORMALIZATION = /[\t\n\r\f]| {2,}|^ | $/;

/**
 * Normalizes whitespace according to CSS `white-space: normal` rules.
 *
 * Collapses runs of collapsible whitespace (space, tab, newline, carriage
 * return, form feed) into a single space and trims leading/trailing spaces.
 * Uses a fast-path check to skip normalization when the text already conforms.
 *
 * @param text - The raw text content to normalize.
 * @returns The normalized text with collapsed whitespace.
 */
export function normalizeWhitespaceNormal(text: string): string {
  if (!NEEDS_NORMALIZATION.test(text)) return text;

  let normalized = text.replace(COLLAPSIBLE_WHITESPACE_RUN, ' ');

  if (normalized.charCodeAt(0) === 0x20) {
    normalized = normalized.slice(1);
  }

  if (normalized.length > 0 && normalized.charCodeAt(normalized.length - 1) === 0x20) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}
