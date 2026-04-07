/**
 * Common HTML character entity references.
 *
 * Only the most common named entities are included. Numeric references
 * (`&#123;` and `&#x7B;`) are handled separately by the decoder.
 */
const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '\u00A9',
  reg: '\u00AE',
  trade: '\u2122',
  mdash: '\u2014',
  ndash: '\u2013',
  laquo: '\u00AB',
  raquo: '\u00BB',
  bull: '\u2022',
  hellip: '\u2026',
};

const ENTITY_PATTERN = /&(?:#x([0-9a-f]+)|#([0-9]+)|([a-z]+));/gi;

/**
 * Decodes HTML character entity references in a string.
 *
 * Supports:
 * - Named entities: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&nbsp;`, etc.
 * - Decimal numeric references: `&#123;`
 * - Hexadecimal numeric references: `&#x7B;`
 *
 * Unrecognised named entities are left as-is.
 *
 * @param text - The string containing HTML entities.
 * @returns The decoded string.
 */
export function decodeEntities(text: string): string {
  if (!text.includes('&')) {
    return text;
  }

  return text.replace(ENTITY_PATTERN, (match, hex, dec, named) => {
    if (hex) {
      return String.fromCodePoint(Number.parseInt(hex as string, 16));
    }

    if (dec) {
      return String.fromCodePoint(Number.parseInt(dec as string, 10));
    }

    if (named) {
      return NAMED_ENTITIES[(named as string).toLowerCase()] ?? match;
    }

    return match;
  });
}
