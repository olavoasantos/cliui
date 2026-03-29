import styles from './styles.css?inline';

import {
  UI_SELECT_INDICATOR,
  UI_SELECT_LISTBOX_Z_INDEX,
  UI_SELECT_OBSERVED_ATTRIBUTES,
  UI_SELECT_TAG_NAME,
} from './constants';
import {Event, HTMLElement, InputEvent} from '../../dom';

import type {UiOption} from '../UiOption/component';

/**
 * Built-in single-choice select custom element.
 *
 * Contains `<ui-option>` children. When collapsed, shows the selected
 * option's label with a dropdown indicator. When expanded, displays
 * a z-indexed overlay listing all options with highlight navigation.
 *
 * Keyboard behavior follows macOS browser conventions:
 * - **Collapsed**: ArrowUp/Down changes selection, Enter/Space opens
 * - **Expanded**: ArrowUp/Down highlights, Enter/Space selects, Escape closes
 *
 * Register with `window.customElements.define(UiSelect.tagName, UiSelect)`
 * before creating `<ui-select>` elements in a window.
 */
export class UiSelect extends HTMLElement {
  static override readonly observedAttributes = UI_SELECT_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_SELECT_TAG_NAME;

  /** The currently highlighted option index when expanded. */
  private highlightedIndex = -1;

  /** Value snapshot taken on focus for change detection. */
  private valueAtFocus = '';

  /** Internal trigger element showing the selected label. */
  private trigger: import('../../dom').Element | null = null;

  /** Internal listbox wrapper for the dropdown overlay. */
  private listbox: import('../../dom').Element | null = null;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundClick = this.handleClick.bind(this) as EventListener;
  private readonly boundFocus = this.handleFocus.bind(this) as EventListener;
  private readonly boundBlur = this.handleBlur.bind(this) as EventListener;
  private readonly boundDocClick = this.handleDocumentClick.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.isDisabled()) {
      this.ensureTabIndex();
    }

    this.buildInternals();
    this.syncTriggerText();

    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('click', this.boundClick);
    this.addEventListener('focus', this.boundFocus);
    this.addEventListener('blur', this.boundBlur);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('click', this.boundClick);
    this.removeEventListener('focus', this.boundFocus);
    this.removeEventListener('blur', this.boundBlur);
    this.removeDocumentClickListener();
    this.close();
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
        this.close();
      } else {
        this.ensureTabIndex();
      }
    }

    if (name === 'value') {
      this.syncSelectedAttribute();
      this.syncTriggerText();
    }

    if (name === 'open') {
      if (newValue != null) {
        this.showListbox();
      } else {
        this.hideListbox();
      }
    }
  }

  /** Whether the dropdown is currently expanded. */
  isOpen(): boolean {
    return this.hasAttribute('open');
  }

  /** Whether the select is disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
  }

  /** Opens the dropdown. */
  open(): void {
    if (this.isDisabled() || this.isOpen()) return;

    this.highlightedIndex = this.getSelectedIndex();
    this.setAttribute('open', '');
    this.addDocumentClickListener();
  }

  /** Closes the dropdown. */
  close(): void {
    if (!this.isOpen()) return;
    this.removeAttribute('open');
    this.removeDocumentClickListener();
  }

  /* ── Private: DOM structure ─────────────────────────────── */

  /**
   * Creates the internal trigger and listbox elements. Moves
   * `<ui-option>` children into the listbox wrapper.
   */
  private buildInternals(): void {
    if (this.trigger) return;

    const doc = this.ownerDocument!;

    /* Collect option children before mutating the tree */
    const options = this.getOptions();

    /* Create trigger */
    this.trigger = doc.createElement('div');
    this.trigger.setAttribute('class', 'ui-select-trigger');

    /* Create listbox */
    this.listbox = doc.createElement('div');
    this.listbox.setAttribute('class', 'ui-select-listbox');
    this.listbox.style.position = 'absolute';
    this.listbox.style.top = '1';
    this.listbox.style.left = '0';
    this.listbox.style.zIndex = String(UI_SELECT_LISTBOX_Z_INDEX);
    this.listbox.style.display = 'none';

    /* Move options into listbox */
    for (const option of options) {
      this.listbox.appendChild(option);
    }

    /* Attach internals */
    this.appendChild(this.trigger);
    this.appendChild(this.listbox);

    /* Hide options initially */
    for (const option of options) {
      option.style.display = 'block';
    }

    this.syncSelectedAttribute();
  }

  /** Returns all `<ui-option>` children from the listbox. */
  private getOptions(): UiOption[] {
    const source = this.listbox ?? this;
    const options: UiOption[] = [];

    for (let i = 0; i < source.childNodes.length; i++) {
      const child = source.childNodes[i];

      if (
        child &&
        'localName' in child &&
        (child as import('../../dom').Element).localName === 'ui-option'
      ) {
        options.push(child as unknown as UiOption);
      }
    }

    return options;
  }

  /* ── Private: State ─────────────────────────────────────── */

  /** Returns the index of the currently selected option, or -1. */
  private getSelectedIndex(): number {
    const value = this.getAttribute('value');
    const options = this.getOptions();

    for (let i = 0; i < options.length; i++) {
      if (options[i]!.getValue() === value) return i;
    }

    return options.length > 0 ? 0 : -1;
  }

  /** Selects an option by index and dispatches events. */
  private selectIndex(index: number): void {
    const options = this.getOptions();
    if (index < 0 || index >= options.length) return;

    const option = options[index]!;
    const newValue = option.getValue();
    const oldValue = this.getAttribute('value');

    this.setAttribute('value', newValue);

    if (newValue !== oldValue) {
      this.dispatchEvent(new InputEvent('input', {bubbles: true, cancelable: false}));
    }
  }

  /** Sets the `selected` attribute on the matching option, removes from others. */
  private syncSelectedAttribute(): void {
    const value = this.getAttribute('value');
    const options = this.getOptions();

    for (const option of options) {
      if (option.getValue() === value) {
        option.setAttribute('selected', '');
      } else {
        option.removeAttribute('selected');
      }
    }
  }

  /** Updates the trigger text to show the selected option's label. */
  private syncTriggerText(): void {
    if (!this.trigger) return;

    const value = this.getAttribute('value');
    const options = this.getOptions();
    let label = '';

    for (const option of options) {
      if (option.getValue() === value) {
        label = option.getLabel();
        break;
      }
    }

    if (label.length === 0 && options.length > 0) {
      label = options[0]!.getLabel();
    }

    this.trigger.textContent = `${label} ${UI_SELECT_INDICATOR}`;
  }

  /** Updates the visual highlight in the listbox. */
  private syncHighlight(): void {
    const options = this.getOptions();

    for (let i = 0; i < options.length; i++) {
      if (i === this.highlightedIndex) {
        options[i]!.setAttribute('highlighted', '');
      } else {
        options[i]!.removeAttribute('highlighted');
      }
    }
  }

  /* ── Private: Listbox visibility ────────────────────────── */

  private showListbox(): void {
    if (!this.listbox) return;
    this.listbox.style.display = 'block';
    this.syncHighlight();
  }

  private hideListbox(): void {
    if (!this.listbox) return;
    this.listbox.style.display = 'none';

    const options = this.getOptions();

    for (const option of options) {
      option.removeAttribute('highlighted');
    }
  }

  /* ── Private: Keyboard ──────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) return;

    const key = (event as import('../../dom').KeyboardEvent).key;

    if (this.isOpen()) {
      this.handleExpandedKeyDown(key, event);
    } else {
      this.handleCollapsedKeyDown(key, event);
    }
  }

  private handleCollapsedKeyDown(key: string, event: Event): void {
    if (key === 'ArrowDown') {
      event.preventDefault();
      this.navigateCollapsed(1);
      return;
    }

    if (key === 'ArrowUp') {
      event.preventDefault();
      this.navigateCollapsed(-1);
      return;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.open();
    }
  }

  private handleExpandedKeyDown(key: string, event: Event): void {
    if (key === 'ArrowDown') {
      event.preventDefault();
      this.navigateExpanded(1);
      return;
    }

    if (key === 'ArrowUp') {
      event.preventDefault();
      this.navigateExpanded(-1);
      return;
    }

    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      this.selectIndex(this.highlightedIndex);
      this.close();
      return;
    }

    if (key === 'Escape') {
      event.preventDefault();
      this.close();
    }
  }

  /** Changes selection directly when collapsed (browser behavior). */
  private navigateCollapsed(direction: number): void {
    const options = this.getOptions();
    const current = this.getSelectedIndex();
    const next = current + direction;

    if (next < 0 || next >= options.length) return;
    if (options[next]!.isDisabled()) return;

    this.selectIndex(next);
  }

  /** Moves the highlight when expanded (no wrap, skip disabled). */
  private navigateExpanded(direction: number): void {
    const options = this.getOptions();
    let next = this.highlightedIndex + direction;

    while (next >= 0 && next < options.length) {
      if (!options[next]!.isDisabled()) {
        this.highlightedIndex = next;
        this.syncHighlight();
        return;
      }

      next += direction;
    }
  }

  /* ── Private: Mouse ─────────────────────────────────────── */

  private handleClick(event: Event): void {
    if (this.isDisabled()) return;

    const target = event.target as import('../../dom').Element | null;

    if (!target) return;

    /* Click on an option inside the listbox */
    if (target.localName === 'ui-option' && this.isOpen()) {
      const options = this.getOptions();
      const index = options.indexOf(target as unknown as UiOption);

      if (index >= 0 && !options[index]!.isDisabled()) {
        this.selectIndex(index);
        this.close();
      }

      return;
    }

    /* Click on trigger or self: toggle dropdown */
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  /** Closes the dropdown when clicking outside the select. */
  private handleDocumentClick(event: Event): void {
    const target = event.target as import('../../dom').Element | null;

    if (!target) return;

    /* Walk up from target to see if the click is inside this element */
    let current: import('../../dom').Element | null = target;

    while (current) {
      if (current === (this as unknown as import('../../dom').Element)) return;
      current = current.parentElement as import('../../dom').Element | null;
    }

    this.close();
  }

  /* ── Private: Focus ─────────────────────────────────────── */

  private handleFocus(): void {
    this.valueAtFocus = this.getAttribute('value') ?? '';
  }

  private handleBlur(): void {
    this.close();

    const currentValue = this.getAttribute('value') ?? '';

    if (currentValue !== this.valueAtFocus) {
      this.dispatchEvent(new Event('change', {bubbles: true}));
    }
  }

  /* ── Private: Document listener management ──────────────── */

  private addDocumentClickListener(): void {
    const doc = this.ownerDocument;
    if (!doc) return;
    doc.body.addEventListener('click', this.boundDocClick);
  }

  private removeDocumentClickListener(): void {
    const doc = this.ownerDocument;
    if (!doc) return;
    doc.body.removeEventListener('click', this.boundDocClick);
  }

  /* ── Private: Utilities ─────────────────────────────────── */

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
