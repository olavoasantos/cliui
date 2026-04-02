import {describe, expect, it} from 'vitest';

import {EmojiPresentationGuard} from '../EmojiPresentationGuard';

describe('EmojiPresentationGuard', () => {
  it('returns true for emoji with VS16 presentation selector', () => {
    expect(EmojiPresentationGuard('©️')).toBe(true);
  });

  it('returns true for ZWJ sequences with multiple pictographics', () => {
    expect(EmojiPresentationGuard('👨‍👩‍👧‍👦')).toBe(true);
  });

  it('returns true for flag emoji with regional indicators', () => {
    expect(EmojiPresentationGuard('🇺🇸')).toBe(true);
  });

  it('returns true for unqualified keycap sequences', () => {
    expect(EmojiPresentationGuard('1⃣')).toBe(true);
  });

  it('returns false for segments longer than 50 characters', () => {
    expect(EmojiPresentationGuard('😀'.repeat(26))).toBe(false);
  });

  it('returns false for ASCII characters', () => {
    expect(EmojiPresentationGuard('A')).toBe(false);
  });

  it('returns false for ambiguous pictographic characters without emoji presentation', () => {
    expect(EmojiPresentationGuard('©')).toBe(false);
  });

  it('returns true for wide pictographic characters', () => {
    expect(EmojiPresentationGuard('⌚')).toBe(true);
  });
});
