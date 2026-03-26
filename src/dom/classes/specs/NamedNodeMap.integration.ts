import {describe, expect, it} from 'vitest';

import {NamespaceURI} from '../../constants';
import {Window} from '../Window';

describe('NamedNodeMap integration', () => {
  it('keeps namespaced and non-namespaced attributes synchronized with element helpers', () => {
    const element = new Window().document.createElement('svg');

    element.setAttribute('id', 'icon');
    element.setAttributeNS(NamespaceURI.SVG, 'viewBox', '0 0 10 10');

    expect(element.attributes.getNamedItem('id')?.value).toBe('icon');
    expect(element.attributes.getNamedItemNS(NamespaceURI.SVG, 'viewBox')?.value).toBe('0 0 10 10');
    expect(element.getAttributeNames()).toContain('id');
  });
});
