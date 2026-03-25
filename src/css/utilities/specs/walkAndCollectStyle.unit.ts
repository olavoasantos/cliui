import {describe, expect, it} from 'vitest';

import {Window} from '../../../dom/classes/Window';
import {walkAndCollectStyle} from '../walkAndCollectStyle';

describe('walkAndCollectStyle', () => {
  it('collects nested style elements', () => {
    const window = new Window();
    const root = window.document.createElement('div');
    const nested = window.document.createElement('section');
    const style = window.document.createElement('style');
    nested.appendChild(style);
    root.appendChild(nested);

    const elements: (typeof style)[] = [];
    walkAndCollectStyle(root, elements);

    expect(elements).toEqual([style]);
  });
});
