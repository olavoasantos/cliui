import styles from './styles.css?inline';

import {OPTION_OBSERVED_ATTRIBUTES, OPTION_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in option element for use inside `<select>`.
 *
 * Represents a single selectable option with a `value` attribute and
 * a text label provided via `textContent`. The parent `<select>`
 * manages the `selected` attribute.
 *
 * Register with `window.customElements.define(Option.tagName, Option)`
 * before creating `<option>` elements in a window.
 */
export class Option extends HTMLElement {
  static override readonly observedAttributes = OPTION_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = OPTION_TAG_NAME;

  /** Returns the option's value, falling back to textContent. */
  getValue(): string {
    return this.getAttribute('value') ?? this.textContent ?? '';
  }

  /** Returns the option's display label. */
  getLabel(): string {
    const text = this.textContent ?? '';
    return text.length > 0 ? text : (this.getAttribute('value') ?? '');
  }

  /** Whether this option is currently selected. */
  isSelected(): boolean {
    return this.hasAttribute('selected');
  }

  /** Whether this option is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }
}
