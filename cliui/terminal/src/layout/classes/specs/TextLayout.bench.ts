import {bench, describe} from 'vitest';

import {TextLayout} from '../TextLayout';

function repeatParagraph(sentence: string, count: number): string {
  return Array.from({length: count}, () => sentence).join(' ');
}

const layout = new TextLayout();
const shortText = 'wide 字 emoji 😀 cluster terminal';
const mediumText = repeatParagraph(
  'Terminal layout uses grapheme-aware wrapping for mixed Latin, CJK 字, and emoji 😀 text.',
  8,
);
const largeText = repeatParagraph(
  'Observability panel line item with unicode 字符 and emoji 😀 data should wrap predictably under pressure.',
  32,
);

describe('TextLayout', () => {
  bench('wraps a short unicode text block', () => {
    layout.measure(shortText, 12, {whiteSpace: 'pre-wrap'});
  });

  bench('wraps a medium unicode text block', () => {
    layout.measure(mediumText, 24, {whiteSpace: 'pre-wrap'});
  });

  bench('clips a large unicode text block with ellipsis', () => {
    layout.measure(largeText, 32, {whiteSpace: 'nowrap', textOverflow: 'ellipsis'});
  });
});
