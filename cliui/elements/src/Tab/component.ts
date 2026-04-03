import styles from './styles.css?inline';

import {TAB_OBSERVED_ATTRIBUTES, TAB_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal tab custom element.
 *
 * Wraps tab content as a direct child of `<tabs>`. The `title`
 * attribute provides the text displayed in the tab bar. Only the
 * active tab's content is visible.
 *
 * Register with `window.customElements.define(Tab.tagName, Tab)`
 * before creating `<tab>` elements in a window.
 */
export class Tab extends HTMLElement {
  static override readonly observedAttributes = TAB_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = TAB_TAG_NAME;

  /** Whether this tab is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /** Returns the tab title for display in the tab bar. */
  getTitle(): string {
    return this.getAttribute('title') ?? '';
  }
}
