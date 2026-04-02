import styles from './styles.css?inline';

import {
  DEFAULT_MAX_VISIBLE_OPTIONS,
  UI_SELECT_INDICATOR_DOWN,
  UI_SELECT_INDICATOR_UP,
  UI_SELECT_LISTBOX_Z_INDEX,
  UI_SELECT_OBSERVED_ATTRIBUTES,
  UI_SELECT_TAG_NAME,
} from './constants';
import {Event, HTMLElement, InputEvent} from '@cliui/dom';
import type {Document, Element, KeyboardEvent} from '@cliui/dom';

import type {UiOption} from '../UiOption/component';

const TYPEAHEAD_TIMEOUT = 500;

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
 * - **Type-ahead**: typing characters searches options by accumulated prefix
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
  private trigger: Element | null = null;

  /** Label span inside the trigger. */
  private triggerLabel: Element | null = null;

  /** Indicator span inside the trigger. */
  private triggerIndicator: Element | null = null;

  /** Internal listbox wrapper for the dropdown overlay. */
  private listbox: Element | null = null;

  /** Accumulated type-ahead search string. */
  private typeaheadBuffer = '';

  /** Timer for clearing the type-ahead buffer. */
  private typeaheadTimer: ReturnType<typeof setTimeout> | null = null;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;
  private readonly boundMouseDown = this.handleMouseDown.bind(this) as never;
  private readonly boundClick = this.handleClick.bind(this) as never;
  private readonly boundFocus = this.handleFocus.bind(this) as never;
  private readonly boundBlur = this.handleBlur.bind(this) as never;
  private readonly boundFocusOut = this.handleBlur.bind(this) as never;
  private readonly boundDocClick = this.handleDocumentClick.bind(this) as never;

  connectedCallback(): void {
    if (!this.isDisabled()) {
      this.ensureTabIndex();
    }

    this.buildInternals();
    this.syncTriggerText();

    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('mousedown', this.boundMouseDown);
    this.addEventListener('click', this.boundClick);
    this.addEventListener('focus', this.boundFocus);
    this.addEventListener('blur', this.boundBlur);
    this.addEventListener('focusout', this.boundFocusOut);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('mousedown', this.boundMouseDown);
    this.removeEventListener('click', this.boundClick);
    this.removeEventListener('focus', this.boundFocus);
    this.removeEventListener('blur', this.boundBlur);
    this.removeEventListener('focusout', this.boundFocusOut);
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

  private buildInternals(): void {
    if (this.trigger) return;

    const doc = this.ownerDocument!;

    /* Create trigger as a flex row: [label (grows)] [indicator] */
    this.trigger = doc.createElement('div');
    this.trigger.setAttribute('class', 'ui-select-trigger');
    this.trigger.style.display = 'flex';
    this.trigger.style.flexDirection = 'row';

    this.triggerLabel = doc.createElement('div');
    this.triggerLabel.style.flexGrow = '1';
    this.triggerLabel.style.whiteSpace = 'nowrap';
    this.triggerLabel.style.display = 'inline';

    this.triggerIndicator = doc.createElement('div');
    this.triggerIndicator.style.whiteSpace = 'pre';
    this.triggerIndicator.style.display = 'inline';

    this.trigger.appendChild(this.triggerLabel);
    this.trigger.appendChild(this.triggerIndicator);

    /* Create listbox */
    this.listbox = doc.createElement('div');
    this.listbox.setAttribute('class', 'ui-select-listbox');
    this.listbox.style.position = 'absolute';
    this.listbox.style.top = '1';
    this.listbox.style.zIndex = String(UI_SELECT_LISTBOX_Z_INDEX);
    this.listbox.style.display = 'none';

    /* Move children (options and optgroups) into listbox */
    const topLevelChildren = this.collectTopLevelChildren();

    for (const child of topLevelChildren) {
      if (child.localName === 'ui-optgroup') {
        /* Render group header label */
        const header = doc.createElement('div');
        header.setAttribute('class', 'ui-optgroup-label');
        header.style.display = 'block';
        header.style.fontWeight = 'bold';
        header.style.paddingLeft = '1';
        header.style.zIndex = String(UI_SELECT_LISTBOX_Z_INDEX);
        header.textContent = child.getAttribute('label') ?? '';
        this.listbox.appendChild(header);

        /* Move child options out of the optgroup into the listbox */
        const groupOptions: Element[] = [];

        for (let i = 0; i < child.childNodes.length; i++) {
          const grandchild = child.childNodes[i];

          if (
            grandchild &&
            'localName' in grandchild &&
            (grandchild as Element).localName === 'ui-option'
          ) {
            groupOptions.push(grandchild as Element);
          }
        }

        for (const option of groupOptions) {
          option.style.zIndex = String(UI_SELECT_LISTBOX_Z_INDEX);
          option.style.paddingLeft = '2';
          this.listbox.appendChild(option);
        }

        /* Remove the now-empty optgroup from the select */
        if (child.parentNode) {
          child.parentNode.removeChild(child);
        }
      } else {
        child.style.zIndex = String(UI_SELECT_LISTBOX_Z_INDEX);
        this.listbox.appendChild(child);
      }
    }

    /* Attach internals */
    this.appendChild(this.trigger);
    this.appendChild(this.listbox);

    /* Ensure critical layout properties on self */
    this.style.position = 'relative';
    this.style.display = 'block';
    this.style.alignItems = 'stretch';
    if (!this.style.padding) {
      this.style.padding = '0 1';
    }

    this.syncSelectedAttribute();
  }

  private getOptions(): UiOption[] {
    const source = this.listbox ?? this;
    const options: UiOption[] = [];

    for (let i = 0; i < source.childNodes.length; i++) {
      const child = source.childNodes[i];

      if (child && 'localName' in child && (child as Element).localName === 'ui-option') {
        options.push(child as unknown as UiOption);
      }
    }

    return options;
  }

  /**
   * Collects direct children that are either ui-option or ui-optgroup
   * elements, before they are moved into the listbox.
   */
  private collectTopLevelChildren(): Element[] {
    const children: Element[] = [];

    for (let i = 0; i < this.childNodes.length; i++) {
      const child = this.childNodes[i];

      if (
        child &&
        'localName' in child &&
        ((child as Element).localName === 'ui-option' ||
          (child as Element).localName === 'ui-optgroup')
      ) {
        children.push(child as Element);
      }
    }

    return children;
  }

  /* ── Private: State ─────────────────────────────────────── */

  private getSelectedIndex(): number {
    const value = this.getAttribute('value');
    const options = this.getOptions();

    for (let i = 0; i < options.length; i++) {
      if (options[i]!.getValue() === value) return i;
    }

    return options.length > 0 ? 0 : -1;
  }

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

  private syncTriggerText(): void {
    if (!this.triggerLabel || !this.triggerIndicator) return;

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

    this.triggerLabel.textContent = label;
    this.triggerIndicator.textContent = this.isOpen()
      ? ` ${UI_SELECT_INDICATOR_UP}`
      : ` ${UI_SELECT_INDICATOR_DOWN}`;
  }

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

    const maxVisible = this.getMaxVisibleOptions();
    const optionCount = this.getOptions().length;

    if (optionCount > maxVisible) {
      this.listbox.style.height = String(maxVisible);
      this.listbox.style.overflow = 'scroll';
    } else {
      this.listbox.style.height = '';
      this.listbox.style.overflow = '';
    }

    this.listbox.style.display = 'block';
    this.syncHighlight();
    this.syncTriggerText();
  }

  private hideListbox(): void {
    if (!this.listbox) return;
    this.listbox.style.display = 'none';

    const options = this.getOptions();

    for (const option of options) {
      option.removeAttribute('highlighted');
    }

    this.syncTriggerText();
  }

  /* ── Private: Keyboard ──────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.isDisabled()) return;

    const key = (event as KeyboardEvent).key;

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
      return;
    }

    if (key.length === 1 && !this.isModifiedKey(event)) {
      this.typeAhead(key, false);
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
      return;
    }

    if (key.length === 1 && !this.isModifiedKey(event)) {
      this.typeAhead(key, true);
    }
  }

  private navigateCollapsed(direction: number): void {
    const options = this.getOptions();
    const current = this.getSelectedIndex();
    const next = current + direction;

    if (next < 0 || next >= options.length) return;
    if (options[next]!.isDisabled()) return;

    this.selectIndex(next);
  }

  private navigateExpanded(direction: number): void {
    const options = this.getOptions();
    let next = this.highlightedIndex + direction;

    while (next >= 0 && next < options.length) {
      if (!options[next]!.isDisabled()) {
        this.highlightedIndex = next;
        this.syncHighlight();
        this.scrollToHighlighted();
        return;
      }

      next += direction;
    }
  }

  /**
   * Buffered type-ahead: characters typed within TYPEAHEAD_TIMEOUT ms
   * accumulate into a prefix string that is matched against option labels.
   */
  private typeAhead(char: string, highlightOnly: boolean): void {
    if (this.typeaheadTimer !== null) {
      clearTimeout(this.typeaheadTimer);
    }

    this.typeaheadBuffer += char.toLowerCase();

    this.typeaheadTimer = setTimeout(() => {
      this.typeaheadBuffer = '';
      this.typeaheadTimer = null;
    }, TYPEAHEAD_TIMEOUT);

    const options = this.getOptions();
    const startIndex = highlightOnly ? this.highlightedIndex : this.getSelectedIndex();

    /* Search from current+1, then wrap around */
    for (let offset = 0; offset < options.length; offset++) {
      const index = (startIndex + offset) % options.length;
      const option = options[index]!;

      if (
        !option.isDisabled() &&
        option.getLabel().toLowerCase().startsWith(this.typeaheadBuffer)
      ) {
        if (highlightOnly) {
          this.highlightedIndex = index;
          this.syncHighlight();
        } else {
          this.selectIndex(index);
        }

        return;
      }
    }
  }

  private isModifiedKey(event: Event): boolean {
    const ke = event as KeyboardEvent;
    return !!(
      (ke as unknown as {ctrlKey?: boolean}).ctrlKey ||
      (ke as unknown as {altKey?: boolean}).altKey ||
      (ke as unknown as {metaKey?: boolean}).metaKey
    );
  }

  /* ── Private: Mouse ─────────────────────────────────────── */

  /**
   * Prevents mousedown inside the dropdown from stealing focus away
   * from the select, which would trigger blur → close before the
   * click event can select the option.
   */
  private handleMouseDown(event: Event): void {
    if (this.isDisabled()) return;
    if (!this.isOpen()) return;

    const target = event.target as Element | null;
    if (!target) return;

    /* If the mousedown is on an option or inside the listbox, prevent
     * the default focus-stealing behavior. */
    const option = this.findOptionFromTarget(target);

    if (option || this.isInsideListbox(target)) {
      event.preventDefault();
    }
  }

  private handleClick(event: Event): void {
    if (this.isDisabled()) return;

    const target = event.target as Element | null;
    if (!target) return;

    /* Ensure focus on click so blur fires on tab-away */
    const doc = this.ownerDocument as Document | null;

    if (doc && doc.activeElement !== (this as unknown as Element)) {
      doc.setActiveElement(this as unknown as Element);
    }

    /* Click on an option inside the listbox */
    if (this.isOpen()) {
      const option = this.findOptionFromTarget(target);

      if (option) {
        const options = this.getOptions();
        const index = options.indexOf(option);

        if (index >= 0 && !option.isDisabled()) {
          this.selectIndex(index);
          this.close();
        }

        return;
      }
    }

    /* Click on trigger or self: toggle dropdown */
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  private findOptionFromTarget(target: Element): UiOption | null {
    let current: Element | null = target;

    while (current && current !== (this as unknown as Element)) {
      if (current.localName === 'ui-option') {
        return current as unknown as UiOption;
      }

      current = current.parentElement as Element | null;
    }

    return null;
  }

  /** Checks if a target element is inside the listbox wrapper. */
  private isInsideListbox(target: Element): boolean {
    let current: Element | null = target;

    while (current) {
      if (current === this.listbox) return true;
      current = current.parentElement as Element | null;
    }

    return false;
  }

  private handleDocumentClick(event: Event): void {
    const target = event.target as Element | null;
    if (!target) return;

    let current: Element | null = target;

    while (current) {
      if (current === (this as unknown as Element)) return;
      current = current.parentElement as Element | null;
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

  /**
   * Returns the maximum number of visible options before the listbox scrolls.
   */
  private getMaxVisibleOptions(): number {
    const raw = this.getAttribute('max-visible-options');

    if (raw != null) {
      const parsed = Number.parseInt(raw, 10);

      if (!Number.isNaN(parsed) && parsed > 0) {
        return parsed;
      }
    }

    return DEFAULT_MAX_VISIBLE_OPTIONS;
  }

  /**
   * Scrolls the listbox so the highlighted option is visible.
   */
  private scrollToHighlighted(): void {
    if (!this.listbox) return;

    const maxVisible = this.getMaxVisibleOptions();
    const optionCount = this.getOptions().length;

    if (optionCount <= maxVisible) return;

    const listboxEl = this.listbox as Element & {scrollTop?: number};
    const scrollTop = listboxEl.scrollTop ?? 0;
    const idx = this.highlightedIndex;

    if (idx < scrollTop) {
      listboxEl.scrollTop = idx;
    } else if (idx >= scrollTop + maxVisible) {
      listboxEl.scrollTop = idx - maxVisible + 1;
    }
  }
}
