import styles from './styles.css?inline';

import {
  DEFAULT_UI_ALERT_VARIANT,
  UI_ALERT_ICONS,
  UI_ALERT_OBSERVED_ATTRIBUTES,
  UI_ALERT_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {UiAlertVariant} from './types';

/**
 * Built-in terminal inline alert custom element.
 *
 * Displays a non-interactive, styled message block with a variant-specific
 * icon prefix and colored border. Supports `info`, `success`, `warning`,
 * and `error` variants.
 *
 * This is an **inline** (non-modal) alert. For modal alerts, compose a
 * `<dialog>` element with alert content instead.
 *
 * Register with `window.customElements.define(UiAlert.tagName, UiAlert)`
 * before creating `<ui-alert>` elements in a window.
 */
export class UiAlert extends HTMLElement {
  static override readonly observedAttributes = UI_ALERT_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_ALERT_TAG_NAME;

  /** Internal icon element. */
  private iconEl: import('../../dom').Element | null = null;

  /** Internal message wrapper. */
  private messageEl: import('../../dom').Element | null = null;

  connectedCallback(): void {
    this.buildInternals();
    this.syncIcon();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'variant') {
      this.syncIcon();
    }
  }

  /** Returns the current variant, falling back to the default. */
  getVariant(): UiAlertVariant {
    const raw = this.getAttribute('variant');

    if (raw === 'info' || raw === 'success' || raw === 'warning' || raw === 'error') {
      return raw;
    }

    return DEFAULT_UI_ALERT_VARIANT;
  }

  /* ── Private ────────────────────────────────────────────── */

  private buildInternals(): void {
    if (this.iconEl) return;

    const doc = this.ownerDocument!;

    // Collect existing children
    const children: import('../../dom').Node[] = [];

    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      children.unshift(this.childNodes[i]!);
      this.removeChild(this.childNodes[i]!);
    }

    // Build row: [icon] [message]
    const row = doc.createElement('div');
    row.style.display = 'flex';
    row.style.flexDirection = 'row';
    row.style.gap = '1';

    this.iconEl = doc.createElement('span');
    this.iconEl.style.display = 'inline';
    this.iconEl.style.whiteSpace = 'pre';

    this.messageEl = doc.createElement('span');
    this.messageEl.style.display = 'inline';
    this.messageEl.style.flexGrow = '1';

    for (const child of children) {
      this.messageEl.appendChild(child);
    }

    row.appendChild(this.iconEl);
    row.appendChild(this.messageEl);
    this.appendChild(row);
  }

  private syncIcon(): void {
    if (!this.iconEl) return;

    this.iconEl.textContent = UI_ALERT_ICONS[this.getVariant()];
  }
}
