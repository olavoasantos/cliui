import {describe, it, expect} from 'vitest';

import {TextLayout} from '../../classes/TextLayout';
import {layoutPreparedText} from '../layoutPreparedText';
import {prepareText} from '../prepareText';

describe('layoutPreparedText', () => {
  it('lays out simple text on one line', () => {
    const prepared = prepareText('hello world')!;
    const lines = layoutPreparedText(prepared, 80);

    expect(lines).toEqual([{text: 'hello world', width: 11}]);
  });

  it('wraps text at word boundaries', () => {
    const prepared = prepareText('hello world')!;
    const lines = layoutPreparedText(prepared, 5);

    expect(lines).toEqual([
      {text: 'hello', width: 5},
      {text: 'world', width: 5},
    ]);
  });

  it('breaks long words at grapheme boundaries', () => {
    const prepared = prepareText('abcdef')!;
    const lines = layoutPreparedText(prepared, 3);

    expect(lines).toEqual([
      {text: 'abc', width: 3},
      {text: 'def', width: 3},
    ]);
  });

  it('produces identical results to TextLayout.measure for all test cases', () => {
    const tl = new TextLayout();
    const cases = [
      {text: 'hello world', width: 80},
      {text: 'hello world', width: 5},
      {text: 'the quick brown fox', width: 10},
      {text: 'abcdef', width: 3},
      {text: 'abcdefgh hi', width: 4},
      {text: 'hi abcdef', width: 4},
      {text: '中文', width: 80},
      {text: '中文字体', width: 5},
      {text: 'hi 中文', width: 6},
      {text: 'ab cde', width: 6},
      {text: 'hi bye', width: 5},
      {text: 'ab', width: 1},
      {text: '  hello   world  ', width: 80},
      {text: 'hello\tworld\nfoo', width: 80},
    ];

    for (const {text, width} of cases) {
      const prepared = prepareText(text);
      const fromPrepared = prepared ? layoutPreparedText(prepared, width) : [];
      const fromDirect = tl.measure(text, width);

      expect(fromPrepared, `text="${text}" width=${width}`).toEqual(fromDirect);
    }
  });
});
