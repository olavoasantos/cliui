import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {DocumentFragmentNodeGuard} from '../DocumentFragmentNodeGuard';

describe('DocumentFragmentNodeGuard', () => {
  it('returns true for a document fragment', () => {
    const window = new Window();
    const fragment = window.document.createDocumentFragment();

    expect(DocumentFragmentNodeGuard(fragment)).toBe(true);
  });

  it('returns false for an element node', () => {
    const window = new Window();
    const element = window.document.createElement('div');

    expect(DocumentFragmentNodeGuard(element)).toBe(false);
  });

  it('returns false for a text node', () => {
    const window = new Window();
    const text = window.document.createTextNode('content');

    expect(DocumentFragmentNodeGuard(text)).toBe(false);
  });
});
