import {describe, it, expect} from 'vitest';

import {prepareText} from '../prepareText';

describe('prepareText', () => {
  it('returns null for empty text', () => {
    expect(prepareText('')).toBeNull();
  });

  it('returns null for whitespace-only text', () => {
    expect(prepareText('   ')).toBeNull();
  });

  it('splits ASCII words with implicit spaces', () => {
    const prepared = prepareText('hello world')!;

    expect(prepared.words).toEqual(['hello', 'world']);
    expect(prepared.widths).toEqual([5, 5]);
    expect(prepared.hasExplicitSpaces).toBe(false);
  });

  it('collapses whitespace before splitting', () => {
    const prepared = prepareText('  hello   world  ')!;

    expect(prepared.words).toEqual(['hello', 'world']);
  });

  it('skips grapheme pre-computation for ASCII words', () => {
    const prepared = prepareText('abc')!;

    // ASCII fast path: no grapheme arrays needed, word breaking falls back
    // to per-character splitting at layout time
    expect(prepared.graphemeWidths[0]).toBeNull();
    expect(prepared.graphemes[0]).toBeNull();
  });

  it('produces null grapheme data for single-grapheme words', () => {
    const prepared = prepareText('a b')!;

    expect(prepared.graphemeWidths[0]).toBeNull();
    expect(prepared.graphemes[0]).toBeNull();
  });

  it('splits CJK text into per-grapheme segments with explicit spaces', () => {
    const prepared = prepareText('中文')!;

    expect(prepared.words).toEqual(['中', '文']);
    expect(prepared.widths).toEqual([2, 2]);
    expect(prepared.hasExplicitSpaces).toBe(true);
  });

  it('uses full path with explicit spaces for mixed text', () => {
    const prepared = prepareText('hello 中文')!;

    expect(prepared.hasExplicitSpaces).toBe(true);
    expect(prepared.words.includes(' ')).toBe(true);
  });
});
