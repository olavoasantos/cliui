import styles from './styles.css?inline';

import {
  UI_DETAILS_INDICATOR_COLLAPSED,
  UI_DETAILS_INDICATOR_EXPANDED,
  UI_DETAILS_OBSERVED_ATTRIBUTES,
  UI_DETAILS_TAG_NAME,
} from './constants';
import {Event, HTMLElement, ToggleEvent} from '../../dom';
import type {Element, KeyboardEvent, Node} from '../../dom';

/**
 * Built-in terminal details custom element for expandable/collapsible
 * disclosure sections.
 *
 * Follows the HTML `<details>/<summary>` pattern:
 * - The first child with `localName === 'ui-summary'` acts as the
 *   clickable trigger. All other children are collapsible content.
 * - The `open` attribute controls expanded/collapsed state.
 * - **Enter** or **Space** toggles the state when focused.
 * - **Mouse click** on the summary area toggles the state.
 * - A `ToggleEvent` with `oldState`/`newState` of `"closed"`/`"open"`
 *   is dispatched on each state change.
 *
 * The element is focusable by default — `tabindex="0"` is set on
 * connect unless the element is disabled.
 *
 * Register with `window.customElements.define(UiDetails.tagName, UiDetails)`
 * before creating `<ui-details>` elements in a window.
 */
export class UiDetails extends HTMLElement {
  static override readonly observedAttributes = UI_DETAILS_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_DETAILS_TAG_NAME;

  /** Internal summary row wrapping the indicator and user-provided summary. */
  private summaryRow: Element | null = null;

  /** Indicator span showing the expand/collapse caret. */
  private indicator: Element | null = null;

  /** Wrapper div hiding content when collapsed. */
  private contentWrapper: Element | null = null;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundClick = this.handleClick.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.isDisabled()) {
      this.ensureTabIndex();
    }

    this.buildInternals();
    this.syncVisibility();

    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'disabled') {
      if (newValue != null) {
        this.removeAttribute('tabindex');
      } else {
        this.ensureTabIndex();
      }
    }

    if (name === 'open') {
      this.syncVisibility();
      this.syncIndicator();

      const wasOpen = oldValue != null;
      const isNowOpen = newValue != null;

      if (wasOpen !== isNowOpen) {
        this.dispatchEvent(
          new ToggleEvent('toggle', {
            bubbles: true,
            oldState: wasOpen ? 'open' : 'closed',
            newState: isNowOpen ? 'open' : 'closed',
          }),
        );
      }
    }
  }

  /** Whether the details section is currently expanded. */
  isOpen(): boolean {
    return this.hasAttribute('open');
  }

  /** Whether the details is currently disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /** Toggles the open/closed state. */
  toggle(): void {
    if (this.isDisabled()) return;

    if (this.isOpen()) {
      this.removeAttribute('open');
    } else {
      this.setAttribute('open', '');
    }
  }

  /* ── Private: DOM structure ─────────────────────────────── */

  private buildInternals(): void {
    if (this.summaryRow) return;

    const doc = this.ownerDocument!;

    /* Collect user-provided summary and content children */
    const userSummary = this.findSummaryChild();
    const contentChildren: Node[] = [];

    for (let i = this.childNodes.length - 1; i >= 0; i--) {
      const child = this.childNodes[i]!;

      if (child !== userSummary) {
        contentChildren.unshift(child);
        this.removeChild(child);
      }
    }

    if (userSummary) {
      this.removeChild(userSummary);
    }

    /* Build indicator */
    this.indicator = doc.createElement('div');
    this.indicator.style.whiteSpace = 'pre';
    this.indicator.style.display = 'inline';
    this.syncIndicator();

    /* Build summary row: [indicator] [user summary content] */
    this.summaryRow = doc.createElement('div');
    this.summaryRow.setAttribute('class', 'ui-details-summary');
    this.summaryRow.style.display = 'flex';
    this.summaryRow.style.flexDirection = 'row';
    this.summaryRow.style.gap = '1';

    this.summaryRow.appendChild(this.indicator);

    if (userSummary) {
      /* Move user summary's children into the row directly,
       * or append the summary element itself. */
      userSummary.style.flexGrow = '1';
      this.summaryRow.appendChild(userSummary);
    }

    /* Build content wrapper */
    this.contentWrapper = doc.createElement('div');
    this.contentWrapper.setAttribute('class', 'ui-details-content');

    for (const child of contentChildren) {
      this.contentWrapper.appendChild(child);
    }

    /* Attach internals */
    this.appendChild(this.summaryRow);
    this.appendChild(this.contentWrapper);
  }

  private findSummaryChild(): Element | null {
    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'ui-summary') {
        return child as Element;
      }
    }

    return null;
  }

  /* ── Private: State sync ────────────────────────────────── */

  private syncVisibility(): void {
    if (!this.contentWrapper) return;

    this.contentWrapper.style.display = this.isOpen() ? 'block' : 'none';
  }

  private syncIndicator(): void {
    if (!this.indicator) return;

    this.indicator.textContent = this.isOpen()
      ? UI_DETAILS_INDICATOR_EXPANDED
      : UI_DETAILS_INDICATOR_COLLAPSED;
  }

  /* ── Private: Keyboard ──────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) return;

    /* Only toggle when the details element itself has focus — ignore
       keydown events that bubble up from focused children (e.g. a
       textarea pressing Enter to insert a newline). */
    if (event.target !== this) return;

    const key = (event as KeyboardEvent).key;

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.toggle();
    }
  }

  /* ── Private: Mouse ─────────────────────────────────────── */

  private handleClick(event: Event): void {
    if (this.isDisabled()) return;

    /* Only toggle when clicking on the summary row (or its descendants) */
    const target = event.target as Element | null;

    if (target && this.isInsideSummary(target)) {
      this.toggle();
    }
  }

  private isInsideSummary(target: Element): boolean {
    let current: Element | null = target;

    while (current && current !== (this as unknown as Element)) {
      if (current === this.summaryRow) return true;
      current = current.parentElement as Element | null;
    }

    return false;
  }

  /* ── Private: Utilities ─────────────────────────────────── */

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
