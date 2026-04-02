import styles from './styles.css?inline';

import {DEFAULT_UI_BADGE_TONE, UI_BADGE_OBSERVED_ATTRIBUTES, UI_BADGE_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';

import type {UiBadgeTone} from './types';

/**
 * Built-in terminal inline badge custom element.
 *
 * Displays a short status label with a colored background. Supports
 * `default`, `info`, `success`, `warning`, and `error` tones via
 * the `tone` attribute. Styling is applied through CSS attribute
 * selectors.
 *
 * Register with `window.customElements.define(UiBadge.tagName, UiBadge)`
 * before creating `<ui-badge>` elements in a window.
 */
export class UiBadge extends HTMLElement {
  static override readonly observedAttributes = UI_BADGE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_BADGE_TAG_NAME;

  /** Returns the current tone, falling back to the default. */
  getTone(): UiBadgeTone {
    const raw = this.getAttribute('tone');

    if (
      raw === 'default' ||
      raw === 'info' ||
      raw === 'success' ||
      raw === 'warning' ||
      raw === 'error'
    ) {
      return raw;
    }

    return DEFAULT_UI_BADGE_TONE;
  }
}
