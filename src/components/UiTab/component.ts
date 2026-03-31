import styles from './styles.css?inline';

import {UI_TAB_OBSERVED_ATTRIBUTES, UI_TAB_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal tab custom element.
 *
 * Wraps tab content as a direct child of `<ui-tabs>`. The `title`
 * attribute provides the text displayed in the tab bar. Only the
 * active tab's content is visible.
 *
 * Register with `window.customElements.define(UiTab.tagName, UiTab)`
 * before creating `<ui-tab>` elements in a window.
 */
export class UiTab extends HTMLElement {
  static override readonly observedAttributes = UI_TAB_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TAB_TAG_NAME;

  /** Whether this tab is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /** Returns the tab title for display in the tab bar. */
  getTitle(): string {
    return this.getAttribute('title') ?? '';
  }
}
