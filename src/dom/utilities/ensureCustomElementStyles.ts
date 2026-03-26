import type {Element} from '../classes/Element';

const CUSTOM_ELEMENT_STYLE_ATTRIBUTE = 'data-custom-element-styles';

type StyleableCustomElementConstructor = CustomElementConstructor & {
  readonly styles?: string;
  readonly tagName?: string;
};

/**
 * Ensures a custom element constructor's light-DOM stylesheet has been
 * installed into the owning document exactly once.
 *
 * This acts as a temporary stand-in for shadow-root style scoping until the
 * terminal DOM grows shadow DOM support.
 *
 * @param element - Connected or upgraded custom element instance.
 */
export function ensureCustomElementStyles(element: Element): void {
  const Constructor = element.constructor as StyleableCustomElementConstructor;
  const styles = Constructor.styles;

  if (typeof styles !== 'string' || styles.length === 0) {
    return;
  }

  const tagName = Constructor.tagName ?? element.localName;

  if (
    element.ownerDocument.head.querySelector(`[${CUSTOM_ELEMENT_STYLE_ATTRIBUTE}="${tagName}"]`) !=
    null
  ) {
    return;
  }

  const styleElement = element.ownerDocument.createElement('style');
  styleElement.setAttribute(CUSTOM_ELEMENT_STYLE_ATTRIBUTE, tagName);
  styleElement.textContent = styles;
  element.ownerDocument.head.appendChild(styleElement);
}
