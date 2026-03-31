import styles from './styles.css?inline';

import {
  DEFAULT_UI_BADGE_VARIANT,
  UI_BADGE_OBSERVED_ATTRIBUTES,
  UI_BADGE_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {UiBadgeVariant} from './types';

/**
 * Built-in terminal inline badge custom element.
 *
 * Displays a short status label with a colored background. Supports
 * `default`, `info`, `success`, `warning`, and `error` variants via
 * the `variant` attribute. Styling is applied through CSS attribute
 * selectors.
 *
 * Register with `window.customElements.define(UiBadge.tagName, UiBadge)`
 * before creating `<ui-badge>` elements in a window.
 */
export class UiBadge extends HTMLElement {
  static override readonly observedAttributes = UI_BADGE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_BADGE_TAG_NAME;

  /** Returns the current variant, falling back to the default. */
  getVariant(): UiBadgeVariant {
    const raw = this.getAttribute('variant');

    if (
      raw === 'default' ||
      raw === 'info' ||
      raw === 'success' ||
      raw === 'warning' ||
      raw === 'error'
    ) {
      return raw;
    }

    return DEFAULT_UI_BADGE_VARIANT;
  }
}
