import styles from './styles.css?inline';

import {UI_TABS_OBSERVED_ATTRIBUTES, UI_TABS_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {UiTab} from '../UiTab/component';

/**
 * Built-in terminal tabbed container custom element.
 *
 * Contains `<ui-tab title="...">content</ui-tab>` children. Renders a
 * visual tab bar from the `title` attributes. Arrow left/right switches
 * tabs via keyboard, clicking a tab header switches via mouse. Only the
 * active tab's content is visible.
 *
 * Dispatches an `input` event when the active tab changes.
 *
 * ```html
 * <ui-tabs>
 *   <ui-tab title="Overview">Overview content</ui-tab>
 *   <ui-tab title="Details">Details content</ui-tab>
 * </ui-tabs>
 * ```
 *
 * Register with `window.customElements.define(UiTabs.tagName, UiTabs)`
 * before creating `<ui-tabs>` elements in a window.
 */
export class UiTabs extends HTMLElement {
  static override readonly observedAttributes = UI_TABS_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TABS_TAG_NAME;

  /** Internal tab bar element. */
  private tabBar: import('../../dom').Element | null = null;

  /** Tab header elements inside the bar. */
  private tabHeaders: import('../../dom').Element[] = [];

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundClick = this.handleClick.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.buildTabBar();
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

    if (name === 'active') {
      this.syncVisibility();
      this.syncTabBar();
    }
  }

  /** Returns the zero-based index of the active tab. */
  getActiveIndex(): number {
    const raw = this.getAttribute('active');

    if (raw === null) return 0;

    const index = Number.parseInt(raw, 10);

    return Number.isFinite(index) && index >= 0 ? index : 0;
  }

  /** Sets the active tab by index. */
  setActiveIndex(index: number): void {
    const tabs = this.getTabs();
    const clamped = Math.max(0, Math.min(tabs.length - 1, index));

    this.setAttribute('active', String(clamped));
  }

  /* ── Private: Tab bar rendering ─────────────────────────── */

  private buildTabBar(): void {
    if (this.tabBar) return;

    const doc = this.ownerDocument!;

    this.tabBar = doc.createElement('div');
    this.tabBar.setAttribute('class', 'ui-tabs-bar');
    this.tabBar.style.display = 'flex';
    this.tabBar.style.flexDirection = 'row';

    this.rebuildHeaders();

    // Insert bar before the first child
    if (this.firstChild) {
      this.insertBefore(this.tabBar, this.firstChild);
    } else {
      this.appendChild(this.tabBar);
    }
  }

  private rebuildHeaders(): void {
    if (!this.tabBar) return;

    // Clear existing headers
    while (this.tabBar.firstChild) {
      this.tabBar.removeChild(this.tabBar.firstChild);
    }

    this.tabHeaders = [];

    const doc = this.ownerDocument!;
    const tabs = this.getTabs();
    const activeIndex = this.getActiveIndex();

    for (let i = 0; i < tabs.length; i++) {
      const header = doc.createElement('div');
      header.style.display = 'inline';
      header.style.padding = '0 2';
      header.style.whiteSpace = 'nowrap';
      header.setAttribute('data-tab-index', String(i));
      header.textContent = tabs[i]!.getTitle();

      if (i === activeIndex) {
        header.style.fontWeight = 'bold';
        header.setAttribute('data-active', '');
      }

      if (tabs[i]!.isDisabled()) {
        header.style.opacity = '0.5';
      }

      this.tabHeaders.push(header);
      this.tabBar.appendChild(header);
    }
  }

  private syncTabBar(): void {
    const activeIndex = this.getActiveIndex();

    for (let i = 0; i < this.tabHeaders.length; i++) {
      const header = this.tabHeaders[i]!;

      if (i === activeIndex) {
        header.style.fontWeight = 'bold';
        header.setAttribute('data-active', '');
      } else {
        header.style.fontWeight = 'normal';
        header.removeAttribute('data-active');
      }
    }
  }

  /* ── Private: Content visibility ────────────────────────── */

  private getTabs(): UiTab[] {
    const tabs: UiTab[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as any).localName === 'ui-tab') {
        tabs.push(child as unknown as UiTab);
      }
    }

    return tabs;
  }

  private syncVisibility(): void {
    const tabs = this.getTabs();
    const activeIndex = this.getActiveIndex();

    for (let i = 0; i < tabs.length; i++) {
      if (i === activeIndex) {
        tabs[i]!.removeAttribute('hidden');
      } else {
        tabs[i]!.setAttribute('hidden', '');
      }
    }
  }

  /* ── Private: Keyboard ──────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (event.target !== this) return;

    const key = (event as import('../../dom').KeyboardEvent).key;
    const tabs = this.getTabs();

    if (tabs.length === 0) return;

    const current = this.getActiveIndex();
    let next = current;

    if (key === 'ArrowLeft' || key === 'ArrowUp') {
      event.preventDefault();
      next = current - 1;

      if (next < 0) next = tabs.length - 1;

      while (tabs[next]!.isDisabled() && next !== current) {
        next = next - 1;

        if (next < 0) next = tabs.length - 1;
      }
    } else if (key === 'ArrowRight' || key === 'ArrowDown') {
      event.preventDefault();
      next = current + 1;

      if (next >= tabs.length) next = 0;

      while (tabs[next]!.isDisabled() && next !== current) {
        next = next + 1;

        if (next >= tabs.length) next = 0;
      }
    } else {
      return;
    }

    if (next !== current) {
      this.setActiveIndex(next);
      this.dispatchEvent(new Event('input', {bubbles: true}));
    }
  }

  /* ── Private: Mouse ─────────────────────────────────────── */

  private handleClick(event: Event): void {
    const target = event.target as import('../../dom').Element | null;

    if (!target) return;

    // Walk up from click target to find a tab header with data-tab-index
    let current: import('../../dom').Element | null = target;

    while (current && current !== (this as unknown as import('../../dom').Element)) {
      const indexAttr = current.getAttribute('data-tab-index');

      if (indexAttr !== null) {
        const index = Number.parseInt(indexAttr, 10);
        const tabs = this.getTabs();

        if (
          Number.isFinite(index) &&
          index >= 0 &&
          index < tabs.length &&
          !tabs[index]!.isDisabled()
        ) {
          if (index !== this.getActiveIndex()) {
            this.setActiveIndex(index);
            this.dispatchEvent(new Event('input', {bubbles: true}));
          }
        }

        return;
      }

      current = current.parentElement as import('../../dom').Element | null;
    }
  }
}
