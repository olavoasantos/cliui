import {describe, it} from 'vitest';

import {EmojiPresentationGuard} from '../EmojiPresentationGuard';

describe('EmojiPresentationGuard', () => {
  it.todo('returns true for emoji with VS16 presentation selector');
  it.todo('returns true for ZWJ sequences with multiple pictographics');
  it.todo('returns true for flag emoji with regional indicators');
  it.todo('returns true for unqualified keycap sequences');
  it.todo('returns false for segments longer than 50 characters');
  it.todo('returns false for ASCII characters');
  it.todo('returns false for non-pictographic characters');
  it.todo('returns true for wide pictographic characters');
});
