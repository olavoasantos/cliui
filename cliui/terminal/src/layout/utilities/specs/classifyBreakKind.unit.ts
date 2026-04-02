import {describe, it, expect} from 'vitest';

import {classifyBreakKind} from '../classifyBreakKind';

describe('classifyBreakKind', () => {
  it('classifies regular space as space', () => {
    expect(classifyBreakKind(' ')).toBe('space');
  });

  it('classifies NBSP as glue', () => {
    expect(classifyBreakKind('\u00A0')).toBe('glue');
  });

  it('classifies word joiner as glue', () => {
    expect(classifyBreakKind('\u2060')).toBe('glue');
  });

  it('classifies ZWSP as zero-width-break', () => {
    expect(classifyBreakKind('\u200B')).toBe('zero-width-break');
  });

  it('classifies soft hyphen as soft-hyphen', () => {
    expect(classifyBreakKind('\u00AD')).toBe('soft-hyphen');
  });

  it('classifies regular characters as text', () => {
    expect(classifyBreakKind('a')).toBe('text');
    expect(classifyBreakKind('中')).toBe('text');
  });
});
