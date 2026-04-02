/**
 * Returns whether a string contains CJK (Chinese, Japanese, Korean) characters.
 *
 * Covers CJK Unified Ideographs, CJK Compatibility Ideographs, CJK Symbols,
 * Hiragana, Katakana, Hangul Syllables, and fullwidth forms.
 *
 * @param text - The string to check.
 * @returns `true` if the string contains at least one CJK character.
 */
export function isCJK(text: string): boolean {
  for (const ch of text) {
    const c = ch.codePointAt(0)!;

    if (
      (c >= 0x4e00 && c <= 0x9fff) ||
      (c >= 0x3400 && c <= 0x4dbf) ||
      (c >= 0x20000 && c <= 0x2a6df) ||
      (c >= 0x2a700 && c <= 0x2b73f) ||
      (c >= 0x2b740 && c <= 0x2b81f) ||
      (c >= 0x2b820 && c <= 0x2ceaf) ||
      (c >= 0x2ceb0 && c <= 0x2ebef) ||
      (c >= 0x30000 && c <= 0x3134f) ||
      (c >= 0xf900 && c <= 0xfaff) ||
      (c >= 0x2f800 && c <= 0x2fa1f) ||
      (c >= 0x3000 && c <= 0x303f) ||
      (c >= 0x3040 && c <= 0x309f) ||
      (c >= 0x30a0 && c <= 0x30ff) ||
      (c >= 0xac00 && c <= 0xd7af) ||
      (c >= 0xff00 && c <= 0xffef)
    ) {
      return true;
    }
  }

  return false;
}
