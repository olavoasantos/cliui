const CRLF_AND_STRAY_CR_FF = /\r\n?|\f/g;

/**
 * Normalizes whitespace according to CSS `white-space: pre-wrap` rules.
 *
 * Ordinary spaces are preserved. `\r\n` sequences collapse into `\n`,
 * standalone `\r` and `\f` convert to `\n`. Tabs and spaces are kept as-is.
 *
 * @param text - The raw text content to normalize.
 * @returns The normalized text with preserved spaces and normalized line endings.
 */
export function normalizeWhitespacePreWrap(text: string): string {
  if (!CRLF_AND_STRAY_CR_FF.test(text)) return text;

  return text.replace(CRLF_AND_STRAY_CR_FF, '\n');
}
