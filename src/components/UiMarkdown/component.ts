import styles from './styles.css?inline';

import {UI_MARKDOWN_OBSERVED_ATTRIBUTES, UI_MARKDOWN_TAG_NAME} from './constants';
import {HTMLElement} from '../../dom';

/**
 * Built-in terminal Markdown renderer custom element.
 *
 * Parses its `textContent` as a lightweight Markdown subset and
 * renders it using semantic HTML elements styled by the UA
 * stylesheet. Supports headings (`#`), bold (`**`), italic (`*`),
 * inline code (`` ` ``), unordered lists (`- `), and horizontal
 * rules (`---`).
 *
 * For full Markdown support, feed pre-parsed HTML via `innerHTML`
 * instead and rely on the UA stylesheet for styling.
 *
 * Register with `window.customElements.define(UiMarkdown.tagName, UiMarkdown)`
 * before creating `<ui-markdown>` elements in a window.
 */
export class UiMarkdown extends HTMLElement {
  static override readonly observedAttributes = UI_MARKDOWN_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_MARKDOWN_TAG_NAME;

  connectedCallback(): void {
    this.renderMarkdown();
  }

  /** Re-parses and re-renders the current text content. */
  renderMarkdown(): void {
    const raw = this.textContent ?? '';

    if (raw.trim().length === 0) return;

    /* Clear children */
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    const doc = this.ownerDocument!;
    const lines = raw.split('\n');

    for (const line of lines) {
      const trimmed = line.trimStart();

      if (trimmed.startsWith('# ')) {
        const el = doc.createElement('h1');
        el.textContent = trimmed.slice(2);
        this.appendChild(el);
      } else if (trimmed.startsWith('## ')) {
        const el = doc.createElement('h2');
        el.textContent = trimmed.slice(3);
        this.appendChild(el);
      } else if (trimmed.startsWith('### ')) {
        const el = doc.createElement('h3');
        el.textContent = trimmed.slice(4);
        this.appendChild(el);
      } else if (trimmed.startsWith('- ')) {
        const el = doc.createElement('li');
        el.textContent = trimmed.slice(2);
        this.appendChild(el);
      } else if (trimmed === '---' || trimmed === '***') {
        this.appendChild(doc.createElement('hr'));
      } else if (trimmed.length > 0) {
        const el = doc.createElement('p');
        el.textContent = trimmed;
        this.appendChild(el);
      }
    }
  }
}
