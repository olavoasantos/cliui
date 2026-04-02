import {bench, describe} from 'vitest';

import {cellWidth} from '../cellWidth';

function repeat(parts: string[], count: number): string {
  return Array.from({length: count}, () => parts.join('')).join(' ');
}

const asciiText = repeat(['status=ok', 'cpu=17%', 'mem=128mb', 'uptime=12h', 'workers=4'], 40);
const emojiText = repeat(['😀', '👋🏽', '🇺🇸', '⌚', '👨‍👩‍👧‍👦', '©️', '1⃣'], 24);
const combiningText = repeat(
  ['e\u0301', 'a\u0303\u0301', '\u200B', '\u200D', '\uFE0F', 'n\u0308'],
  40,
);
const mixedUnicodeText = repeat(
  ['Hello', '中文', 'カタカナ', '한글', '😀', 'e\u0301', '\u001B[31mred\u001B[0m', 'ＡＢ'],
  36,
);

describe('cellWidth', () => {
  bench('measures a typical ASCII-heavy status line payload', () => {
    cellWidth(asciiText);
  });

  bench('measures an emoji-heavy grapheme payload', () => {
    cellWidth(emojiText);
  });

  bench('measures a combining-mark and zero-width payload', () => {
    cellWidth(combiningText);
  });

  bench('measures a mixed unicode payload with ANSI escapes', () => {
    cellWidth(mixedUnicodeText);
  });
});
