import styles from './styles.css?inline';

import {UI_OPTION_OBSERVED_ATTRIBUTES, UI_OPTION_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in option element for use inside `<ui-select>`.
 *
 * Represents a single selectable option with a `value` attribute and
 * a text label provided via `textContent`. The parent `<ui-select>`
 * manages the `selected` attribute.
 *
 * Register with `window.customElements.define(UiOption.tagName, UiOption)`
 * before creating `<ui-option>` elements in a window.
 */
export class UiOption extends HTMLElement {
  static override readonly observedAttributes = UI_OPTION_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_OPTION_TAG_NAME;

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
