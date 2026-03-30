/** Regex matching URL scheme prefixes like `https:`, `ftp:`, etc. */
const URL_SCHEME_RE = /^[A-Za-z][A-Za-z0-9+.-]*:$/;

/**
 * Detects whether a text segment starts a URL-like run.
 *
 * Matches `www.` prefixes and `scheme://` patterns.
 *
 * @param text - The segment text to check.
 * @param nextText - The following segment text, if any.
 * @returns `true` if the segment starts a URL-like run.
 */
export function isUrlRunStart(text: string, nextText?: string): boolean {
  if (text.startsWith('www.')) return true;

  return URL_SCHEME_RE.test(text) && nextText === '//';
}
