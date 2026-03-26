import {describe, expect, it} from 'vitest';

import {NamespaceURI} from '../../constants';
import {Window} from '../Window';

describe('SVGElement integration', () => {
  it('retains the SVG namespace and resolves ownerSVGElement through nested svg parents', () => {
    const document = new Window().document;
    const root = document.createElementNS(NamespaceURI.SVG, 'svg');
    const group = document.createElementNS(NamespaceURI.SVG, 'g');
    const circle = document.createElementNS(NamespaceURI.SVG, 'circle');
    root.appendChild(group);
    group.appendChild(circle);

    expect(circle.namespaceURI).toBe(NamespaceURI.SVG);
    expect((circle as typeof root).ownerSVGElement).toBe(root);
  });
});
