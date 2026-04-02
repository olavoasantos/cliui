import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {ParentNodeGuard} from '../ParentNodeGuard';

describe('ParentNodeGuard', () => {
  it('returns true for an element node', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(ParentNodeGuard(element)).toBe(true);
  });

  it('returns true for a document fragment', () => {
    const window = new Window();
    const fragment = window.document.createDocumentFragment();

    expect(ParentNodeGuard(fragment)).toBe(true);
  });

  it('returns false for a text node', () => {
    const window = new Window();
    const text = window.document.createTextNode('content');

    expect(ParentNodeGuard(text)).toBe(false);
  });

  it('returns false for a comment node', () => {
    const window = new Window();
    const comment = window.document.createComment('content');

    expect(ParentNodeGuard(comment)).toBe(false);
  });
});
