import styles from './styles.css?inline';

import {
  DEFAULT_UI_MESSAGE_TONE,
  UI_MESSAGE_ICONS,
  UI_MESSAGE_OBSERVED_ATTRIBUTES,
  UI_MESSAGE_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {UiMessageTone} from './types';

/**
 * Built-in terminal inline message custom element.
 *
 * Displays a non-interactive, styled message block with a tone-specific
 * icon prefix and colored border. Supports `info`, `success`, `warning`,
 * and `error` tones.
 *
 * Register with `window.customElements.define(UiMessage.tagName, UiMessage)`
 * before creating `<ui-message>` elements in a window.
 */
export class UiMessage extends HTMLElement {
  static override readonly observedAttributes = UI_MESSAGE_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_MESSAGE_TAG_NAME;

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

    if (name === 'tone') {
      this.syncIcon();
    }
  }

  /** Returns the current tone, falling back to the default. */
  getTone(): UiMessageTone {
    const raw = this.getAttribute('tone');

    if (raw === 'info' || raw === 'success' || raw === 'warning' || raw === 'error') {
      return raw;
    }

    return DEFAULT_UI_MESSAGE_TONE;
  }

  /* ── Private ────────────────────────────────────────────── */

  private buildInternals(): void {
    if (this.iconEl) return;

    const doc = this.ownerDocument!;

    const children: import('../../dom').Node[] = [];

    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      children.unshift(this.childNodes[i]!);
      this.removeChild(this.childNodes[i]!);
    }

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

    this.iconEl.textContent = UI_MESSAGE_ICONS[this.getTone()];
  }
}
