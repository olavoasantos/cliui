import styles from './styles.css?inline';

import {OPTGROUP_OBSERVED_ATTRIBUTES, OPTGROUP_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in option group element for use inside `<select>`.
 *
 * Renders a non-selectable group header from its `label` attribute.
 * Child `<ui-option>` elements are grouped visually under this header.
 * The `<select>` component skips optgroup elements during keyboard
 * navigation.
 *
 * Register with `window.customElements.define(Optgroup.tagName, Optgroup)`
 * before creating `<optgroup>` elements in a window.
 */
export class Optgroup extends HTMLElement {
  static override readonly observedAttributes = OPTGROUP_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = OPTGROUP_TAG_NAME;

  /** Returns the group label text. */
  getLabel(): string {
    return this.getAttribute('label') ?? '';
  }

  /** Whether this option group is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
