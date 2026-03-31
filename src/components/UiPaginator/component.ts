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

    for (let i = 1; i <= total; i++) {
      const span = doc.createElement('span');
      span.style.display = 'inline';
      span.textContent = String(i);

      if (i === page) {
        span.style.fontWeight = 'bold';
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
}
