import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {walkElements} from '../walkElements';

describe('walkElements', () => {
  it('visits descendant elements in tree order', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const child = window.document.createElement('span');
    const grandchild = window.document.createElement('strong');
    child.appendChild(grandchild);
    root.appendChild(child);

    const names: string[] = [];
    walkElements(root, (element) => names.push(element.localName));

    expect(names).toEqual(['span', 'strong']);
  });
});
