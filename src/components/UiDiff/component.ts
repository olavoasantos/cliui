import styles from './styles.css?inline';

import {
  UI_DIFF_ADDED_COLOR,
  UI_DIFF_CONTEXT_COLOR,
  UI_DIFF_OBSERVED_ATTRIBUTES,
  UI_DIFF_REMOVED_COLOR,
  UI_DIFF_TAG_NAME,
} from './constants';
import {HTMLElement} from '@cliui/dom';

/**
 * Built-in terminal diff viewer custom element.
 *
 * Parses its `textContent` as unified diff format and renders
 * color-coded lines: green for additions (`+`), red for deletions
 * (`-`), gray for context. Header lines (`@@`, `---`, `+++`) are
 * rendered dimmed.
 *
 * Register with `window.customElements.define(UiDiff.tagName, UiDiff)`
 * before creating `<ui-diff>` elements in a window.
 */
export class UiDiff extends HTMLElement {
  static override readonly observedAttributes = UI_DIFF_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_DIFF_TAG_NAME;

  connectedCallback(): void {
    this.renderDiff();
  }

  /** Re-parses and re-renders the current text content as a diff. */
  renderDiff(): void {
    const raw = this.textContent ?? '';

    if (raw.trim().length === 0) return;

    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    const doc = this.ownerDocument!;
    const lines = raw.split('\n');

    for (const line of lines) {
      const el = doc.createElement('div');
      el.textContent = line;

      if (line.startsWith('+')) {
        el.style.color = UI_DIFF_ADDED_COLOR;
      } else if (line.startsWith('-')) {
        el.style.color = UI_DIFF_REMOVED_COLOR;
      } else if (line.startsWith('@@')) {
        el.style.color = UI_DIFF_CONTEXT_COLOR;
      } else {
        el.style.color = UI_DIFF_CONTEXT_COLOR;
      }

      this.appendChild(el);
    }
  }
}
