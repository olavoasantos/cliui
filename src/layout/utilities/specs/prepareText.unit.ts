import {describe, it, expect} from 'vitest';

import {prepareText} from '../prepareText';

describe('prepareText', () => {
  it('returns null for empty text', () => {
    expect(prepareText('')).toBeNull();
  });

  it('returns null for whitespace-only text', () => {
    expect(prepareText('   ')).toBeNull();
  });

  it('splits words and measures widths', () => {
    const prepared = prepareText('hello world')!;

    expect(prepared.words).toEqual(['hello', 'world']);
    expect(prepared.widths).toEqual([5, 5]);
  });

  it('collapses whitespace before splitting', () => {
    const prepared = prepareText('  hello   world  ')!;

    expect(prepared.words).toEqual(['hello', 'world']);
  });

  it('produces grapheme data for multi-grapheme words', () => {
    const prepared = prepareText('abc')!;

    expect(prepared.graphemeWidths[0]).toEqual([1, 1, 1]);
    expect(prepared.graphemes[0]).toEqual(['a', 'b', 'c']);
  });

  it('produces null grapheme data for single-grapheme words', () => {
    const prepared = prepareText('a b')!;

    expect(prepared.graphemeWidths[0]).toBeNull();
    expect(prepared.graphemes[0]).toBeNull();
  });

  it('measures CJK characters as 2 cells', () => {
    const prepared = prepareText('中文')!;

    expect(prepared.widths[0]).toBe(4);
  });
});
