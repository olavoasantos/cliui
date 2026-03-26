import {describe, expect, it} from 'vitest';

import {Window} from '../../classes/Window';
import {descendants} from '../descendants';

describe('descendants', () => {
  it('returns empty array for a node with no children', () => {
    const window = new Window();
    const root = window.document.createElement('div');

    expect(descendants(root)).toEqual([]);
  });

  it('returns direct children for a single level of nesting', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const first = window.document.createElement('span');
    const second = window.document.createElement('p');
    root.append(first, second);

    expect(descendants(root)).toEqual([first, second]);
  });

  it('returns nodes in depth-first order for multi-level trees', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const section = window.document.createElement('section');
    const title = window.document.createElement('h1');
    const aside = window.document.createElement('aside');
    const paragraph = window.document.createElement('p');

    section.append(title);
    root.append(section, aside);
    aside.append(paragraph);

    expect(descendants(root)).toEqual([section, title, aside, paragraph]);
  });

  it('does not include the root node in the result', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    root.append(window.document.createElement('span'));

    expect(descendants(root)).not.toContain(root);
  });
});
