import {NS, NamespaceURI} from '../constants';
import {Element} from './Element';

/**
 * Base class for SVG elements. Sets the SVG namespace and provides `ownerSVGElement` traversal.
 */
export class SVGElement extends Element {
  override [NS] = NamespaceURI.SVG;

  /**
   * Returns the nearest ancestor `<svg>` element, or `null` if this element
   * is the outermost SVG or is not inside an SVG subtree.
   */
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
