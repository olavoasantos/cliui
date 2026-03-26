import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {TextNodeGuard} from '../TextNodeGuard';

describe('TextNodeGuard', () => {
  it('returns true for a text node', () => {
    const window = new Window();
    const text = window.document.createTextNode('content');

    expect(TextNodeGuard(text)).toBe(true);
  });

  it('returns false for an element node', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(TextNodeGuard(element)).toBe(false);
  });

  it('returns false for a comment node', () => {
    const window = new Window();
    const comment = window.document.createComment('content');

    expect(TextNodeGuard(comment)).toBe(false);
  });

  it('returns false for a document fragment', () => {
    const window = new Window();
    const fragment = window.document.createDocumentFragment();

    expect(TextNodeGuard(fragment)).toBe(false);
  });
});
