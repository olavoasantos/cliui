import {describe, it, expect} from 'vitest';
import {Window} from '../Window';

function createEnv() {
  const window = new Window();
  return {window, document: window.document};
}

describe('SVGElement', () => {
  it('has SVG namespace', () => {
    const {document} = createEnv();
    const el = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    expect(el.namespaceURI).toBe('http://www.w3.org/2000/svg');
  });

  it('ownerSVGElement returns null for root SVG element', () => {
    const {document} = createEnv();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    document.body.appendChild(svg);
    expect(svg.ownerSVGElement).toBeNull();
  });

  it('ownerSVGElement returns root SVG ancestor', () => {
    const {document} = createEnv();
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    svg.appendChild(g);
    g.appendChild(circle);
    document.body.appendChild(svg);
    expect(circle.ownerSVGElement).toBe(svg);
  });

  it('ownerSVGElement traverses up to the outermost SVG', () => {
    const {document} = createEnv();
    const outerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const innerSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    outerSvg.appendChild(innerSvg);
    innerSvg.appendChild(rect);
    document.body.appendChild(outerSvg);
    expect(rect.ownerSVGElement).toBe(outerSvg);
  });
});
