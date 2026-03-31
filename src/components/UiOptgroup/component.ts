import styles from './styles.css?inline';

import {UI_OPTGROUP_OBSERVED_ATTRIBUTES, UI_OPTGROUP_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in option group element for use inside `<ui-select>`.
 *
 * Renders a non-selectable group header from its `label` attribute.
 * Child `<ui-option>` elements are grouped visually under this header.
 * The `<ui-select>` component skips optgroup elements during keyboard
 * navigation.
 *
 * Register with `window.customElements.define(UiOptgroup.tagName, UiOptgroup)`
 * before creating `<ui-optgroup>` elements in a window.
 */
export class UiOptgroup extends HTMLElement {
  static override readonly observedAttributes = UI_OPTGROUP_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_OPTGROUP_TAG_NAME;

  /** Returns the group label text. */
  getLabel(): string {
    return this.getAttribute('label') ?? '';
  }

  /** Whether this option group is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
