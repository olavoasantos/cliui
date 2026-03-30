/**
 * Returns whether a string contains only printable ASCII characters and
 * spaces (code points `U+0020`–`U+007E`).
 *
 * When this returns `true`, the text can use the fast `split(' ')` path
 * for word segmentation and `word.length` for width measurement, avoiding
 * the more expensive `Intl.Segmenter` and `cellWidth` calls.
 *
 * @param text - The string to check.
 * @returns `true` when every character is printable ASCII.
 */
export function isAsciiText(text: string): boolean {
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);

    if (code < 0x20 || code > 0x7e) {
      return false;
    }
  }

  return true;
}
