import {NS, NamespaceURI} from '../constants/index';
import {Element} from './Element';

export class SVGElement extends Element {
  override [NS] = NamespaceURI.SVG;

  get ownerSVGElement(): SVGElement | null {
    let root: SVGElement | null = null;
    let parent = this.parentNode;
    while (parent instanceof SVGElement) {
      root = parent;
      parent = parent.parentNode;
    }
    return root;
  }
}
