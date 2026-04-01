import styles from './styles.css?inline';

import {UI_PAGINATOR_OBSERVED_ATTRIBUTES, UI_PAGINATOR_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

/**
 * Built-in terminal paginator custom element.
 *
 * Renders page navigation controls: `‹ 1 2 3 ... N ›`. Arrow
 * Left/Right changes the current page. Dispatches a `change`
 * event when the page changes.
 *
 * Register with `window.customElements.define(UiPaginator.tagName, UiPaginator)`
 * before creating `<ui-paginator>` elements in a window.
 */
export class UiPaginator extends HTMLElement {
  static override readonly observedAttributes = UI_PAGINATOR_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_PAGINATOR_TAG_NAME;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    this.ensureTabIndex();
    this.renderControls();
    this.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  override attributeChangedCallback(
    _name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    this.renderControls();
  }

  /** Returns the current page (1-indexed). */
  getPage(): number {
    const raw = this.getAttribute('page');

    if (raw == null) return 1;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }

  /** Returns the total number of pages. */
  getTotalPages(): number {
    const raw = this.getAttribute('total-pages');

    if (raw == null) return 1;

    const parsed = Number.parseInt(raw, 10);

    return Number.isFinite(parsed) && parsed >= 1 ? parsed : 1;
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key === 'ArrowLeft') {
      event.preventDefault();
      this.goToPage(this.getPage() - 1);
    } else if (key === 'ArrowRight') {
      event.preventDefault();
      this.goToPage(this.getPage() + 1);
    }
  }

  private goToPage(page: number): void {
    const total = this.getTotalPages();
    const clamped = Math.max(1, Math.min(total, page));

    if (clamped === this.getPage()) return;

    this.setAttribute('page', String(clamped));
    this.dispatchEvent(new Event('change', {bubbles: true}));
  }

  private renderControls(): void {
    /* Clear existing children */
    while (this.childNodes.length > 0) {
      this.removeChild(this.childNodes[0]!);
    }

    const doc = this.ownerDocument!;
    const page = this.getPage();
    const total = this.getTotalPages();

    const prev = doc.createElement('span');
    prev.style.display = 'inline';
    prev.textContent = '‹';
    this.appendChild(prev);

    const pages = this.getVisiblePages(page, total);

    for (const entry of pages) {
      const span = doc.createElement('span');
      span.style.display = 'inline';

      if (entry === '…') {
        span.textContent = '…';
      } else {
        span.textContent = String(entry);

        if (entry === page) {
          span.style.fontWeight = 'bold';
        }
      }

      this.appendChild(span);
    }

    const next = doc.createElement('span');
    next.style.display = 'inline';
    next.textContent = '›';
    this.appendChild(next);
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }

  /**
   * Returns the page numbers to display, inserting `'…'` for
   * truncated ranges. Always shows first, last, and a window
   * of 1 page on each side of the current page.
   *
   * Examples (current page marked with *):
   * - 5 pages, page 3:  `1 2 *3 4 5`
   * - 20 pages, page 1:  `*1 2 3 … 20`
   * - 20 pages, page 10: `1 … 9 *10 11 … 20`
   * - 20 pages, page 20: `1 … 18 19 *20`
   */
  private getVisiblePages(page: number, total: number): Array<number | '…'> {
    if (total <= 7) {
      return Array.from({length: total}, (_, i) => i + 1);
    }

    const pages = new Set<number>();

    /* Always include first and last */
    pages.add(1);
    pages.add(total);

    /* Window around current page */
    for (let i = page - 1; i <= page + 1; i++) {
      if (i >= 1 && i <= total) {
        pages.add(i);
      }
    }

    const sorted = [...pages].sort((a, b) => a - b);
    const result: Array<number | '…'> = [];

    for (let i = 0; i < sorted.length; i++) {
      if (i > 0 && sorted[i]! - sorted[i - 1]! > 1) {
        result.push('…');
      }

      result.push(sorted[i]!);
    }

    return result;
  }
}
