import {describe, expect, it} from 'vitest';

import {NamespaceURI} from '../../constants';
import {Window} from '../Window';

describe('Attr integration', () => {
  it('coordinates namespace-aware attribute construction and updates through the owning element', () => {
    const element = new Window().document.createElement('svg');

    element.setAttributeNS(NamespaceURI.SVG, 'viewBox', '0 0 10 10');
    const attr = element.attributes.getNamedItemNS(NamespaceURI.SVG, 'viewBox');

    expect(attr?.namespaceURI).toBe(NamespaceURI.SVG);
    expect(attr?.ownerElement).toBe(element);

    element.setAttributeNS(NamespaceURI.SVG, 'viewBox', '0 0 20 20');

    expect(element.getAttributeNS(NamespaceURI.SVG, 'viewBox')).toBe('0 0 20 20');
    expect(element.attributes.getNamedItemNS(NamespaceURI.SVG, 'viewBox')?.value).toBe('0 0 20 20');
  });
});
