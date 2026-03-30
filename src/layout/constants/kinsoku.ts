/**
 * CJK characters prohibited from starting a line (kinsoku-shori).
 *
 * Includes CJK closing punctuation such as fullwidth comma, period,
 * question mark, and various closing brackets.
 */
export const KINSOKU_START = new Set([
  '\uFF0C', // ，
  '\uFF0E', // ．
  '\uFF01', // ！
  '\uFF1A', // ：
  '\uFF1B', // ；
  '\uFF1F', // ？
  '\u3001', // 、
  '\u3002', // 。
  '\u30FB', // ・
  '\uFF09', // ）
  '\u3015', // 〕
  '\u3009', // 〉
  '\u300B', // 》
  '\u300D', // 」
  '\u300F', // 』
  '\u3011', // 】
  '\u3017', // 〗
  '\u3019', // 〙
  '\u301B', // 〛
  '\u30FC', // ー
  '\u3005', // 々
  '\u303B', // 〻
  '\u309D', // ゝ
  '\u309E', // ゞ
  '\u30FD', // ヽ
  '\u30FE', // ヾ
]);

/**
 * Characters prohibited from ending a line (opening brackets/quotes).
 *
 * These characters attach forward to the next text segment so they
 * do not appear at the end of a line separated from the word they
 * introduce.
 */
export const KINSOKU_END = new Set([
  '"',
  '(',
  '[',
  '{',
  '\u201C', // "
  '\u2018', // '
  '\u00AB', // «
  '\u2039', // ‹
  '\uFF08', // （
  '\u3014', // 〔
  '\u3008', // 〈
  '\u300A', // 《
  '\u300C', // 「
  '\u300E', // 『
  '\u3010', // 【
  '\u3016', // 〖
  '\u3018', // 〘
  '\u301A', // 〚
]);

/**
 * Closing/trailing punctuation that sticks to the preceding word.
 *
 * These characters must not start a new line — they attach backward
 * to the preceding text segment.
 */
export const LEFT_STICKY_PUNCTUATION = new Set([
  '.',
  ',',
  '!',
  '?',
  ':',
  ';',
  '\u060C', // Arabic comma ،
  '\u061B', // Arabic semicolon ؛
  '\u061F', // Arabic question mark ؟
  '\u0964', // Devanagari danda ।
  '\u0965', // Devanagari double danda ॥
  ')',
  ']',
  '}',
  '%',
  '\u201D', // "
  '\u2019', // '
  '\u00BB', // »
  '\u203A', // ›
  '\u2026', // …
]);
