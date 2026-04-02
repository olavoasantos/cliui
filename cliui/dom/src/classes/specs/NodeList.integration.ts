import {describe, expect, it} from 'vitest';

import {Window} from '../Window';

describe('NodeList integration', () => {
  it('tracks live child node ordering on parent mutations', () => {
    const parent = new Window().document.createElement('div');
    const a = parent.ownerDocument.createElement('a');
    const b = parent.ownerDocument.createElement('b');
    parent.append(a, b);
    parent.removeChild(a);

    expect(parent.childNodes.item(0)).toBe(b);
    expect([...parent.childNodes]).toEqual([b]);
  });
});
