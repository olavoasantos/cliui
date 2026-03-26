import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {ElementNodeGuard} from '../ElementNodeGuard';

describe('ElementNodeGuard', () => {
  it('returns true for an element node', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(ElementNodeGuard(element)).toBe(true);
  });

  it('returns false for a text node', () => {
    const window = new Window();
    const text = window.document.createTextNode('content');

    expect(ElementNodeGuard(text)).toBe(false);
  });

  it('returns false for a comment node', () => {
    const window = new Window();
    const comment = window.document.createComment('content');

    expect(ElementNodeGuard(comment)).toBe(false);
  });

  it('returns false for a document fragment', () => {
    const window = new Window();
    const fragment = window.document.createDocumentFragment();

    expect(ElementNodeGuard(fragment)).toBe(false);
  });
});
