import styles from './styles.css?inline';

import {UI_TABS_OBSERVED_ATTRIBUTES, UI_TABS_TAG_NAME} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {UiTab} from '../UiTab/component';

/**
 * Built-in terminal tabbed container custom element.
 *
 * Contains `<ui-tab>` children (tab headers) and `<ui-tab-panel>` children
 * (content panels). Arrow left/right navigates between tabs. The `active`
 * attribute tracks the zero-based index of the selected tab. Only the
 * matching panel is displayed.
 *
 * Dispatches an `input` event when the active tab changes.
 *
 * Register with `window.customElements.define(UiTabs.tagName, UiTabs)`
 * before creating `<ui-tabs>` elements in a window.
 */
export class UiTabs extends HTMLElement {
  static override readonly observedAttributes = UI_TABS_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_TABS_TAG_NAME;

  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }

    this.syncPanels();
    this.addEventListener('keydown', this.boundKeyDown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'active') {
      this.syncPanels();
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

  /* ── Private ────────────────────────────────────────────── */

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

  private getPanels(): import('../../dom').Element[] {
    const panels: import('../../dom').Element[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (child && 'localName' in child && (child as any).localName === 'ui-tab-panel') {
        panels.push(child as import('../../dom').Element);
      }
    }

    return panels;
  }

  private syncPanels(): void {
    const tabs = this.getTabs();
    const panels = this.getPanels();
    const activeIndex = this.getActiveIndex();

    for (let i = 0; i < tabs.length; i++) {
      if (i === activeIndex) {
        tabs[i]!.setAttribute('selected', '');
      } else {
        tabs[i]!.removeAttribute('selected');
      }
    }

    for (let i = 0; i < panels.length; i++) {
      if (i === activeIndex) {
        panels[i]!.removeAttribute('hidden');
      } else {
        panels[i]!.setAttribute('hidden', '');
      }
    }
  }

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

      // Skip disabled tabs
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
}
