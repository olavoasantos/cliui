import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {selfAndDescendants} from '../selfAndDescendants';

describe('selfAndDescendants', () => {
  it('returns array containing only the node when it has no children', () => {
    const window = new Window();
    const root = window.document.createElement('div');

    expect(selfAndDescendants(root)).toEqual([root]);
  });

  it('includes the node as the first element', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    root.append(window.document.createElement('span'));

    expect(selfAndDescendants(root)[0]).toBe(root);
  });

  it('includes all descendants after the node in depth-first order', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const section = window.document.createElement('section');
    const paragraph = window.document.createElement('p');
    const strong = window.document.createElement('strong');

    root.append(section);
    section.append(paragraph);
    root.append(strong);

    expect(selfAndDescendants(root)).toEqual([root, section, paragraph, strong]);
  });
});
