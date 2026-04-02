import {HTMLElement} from './HTMLElement';

/**
 * Platform `<a>` element with automatic focusability when `href` is present.
 *
 * In browsers, anchor elements with an `href` attribute participate in the
 * tab order. This class mirrors that behavior by setting `tabindex="0"` when
 * `href` is added and removing it when `href` is removed (unless the user
 * set an explicit tabindex before the automatic one).
 */
export class HTMLAnchorElement extends HTMLElement {
  /** Whether the current tabindex was set automatically by href logic. */
  private autoTabIndex = false;

  /**
   * Ensures focusability is updated when `href` changes.
   *
   * @param name - The attribute name that changed.
   * @param _oldValue - The previous attribute value.
   * @param newValue - The new attribute value, or null if removed.
   */
  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name !== 'href') {
      return;
    }

    if (newValue !== null) {
      // href was set — add tabindex if not explicitly set
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '0');
        this.autoTabIndex = true;
      }
    } else {
      // href was removed — remove auto-tabindex only
      if (this.autoTabIndex) {
        this.removeAttribute('tabindex');
        this.autoTabIndex = false;
      }
    }
  }

  static override get observedAttributes(): string[] {
    return ['href'];
  }
}
