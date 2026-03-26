import {describe, expect, it} from 'vitest';

import {cellWidth} from '../../utilities/cellWidth';
import {TextLayout} from '../TextLayout';

describe('TextLayout integration', () => {
  it('wraps and measures styled unicode text consistently with cell width utilities and clipping constraints', () => {
    const layout = new TextLayout();
    const wrapped = layout.measure('wide 字 emoji 😀 cluster', 6, {whiteSpace: 'pre-wrap'});
    const clipped = layout.measure('wide 字 emoji 😀 cluster', 5, {
      whiteSpace: 'nowrap',
      textOverflow: 'ellipsis',
    });

    expect(wrapped.map((line) => line.text)).toEqual(['wide ', '字 emo', 'ji 😀 ', 'cluste', 'r']);
    expect(wrapped.map((line) => line.width)).toEqual(wrapped.map((line) => cellWidth(line.text)));
    expect(clipped).toEqual([{text: 'wide…', width: cellWidth('wide…')}]);
  });
});
