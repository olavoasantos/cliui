import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {CharacterDataGuard} from '../CharacterDataGuard';

describe('CharacterDataGuard', () => {
  it('returns true for a text node', () => {
    const window = new Window();
    const text = window.document.createTextNode('content');

    expect(CharacterDataGuard(text)).toBe(true);
  });

  it('returns true for a comment node', () => {
    const window = new Window();
    const comment = window.document.createComment('content');

    expect(CharacterDataGuard(comment)).toBe(true);
  });

  it('returns false for an element node', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(CharacterDataGuard(element)).toBe(false);
  });

  it('returns false for a document fragment', () => {
    const window = new Window();
    const fragment = window.document.createDocumentFragment();

    expect(CharacterDataGuard(fragment)).toBe(false);
  });
});
