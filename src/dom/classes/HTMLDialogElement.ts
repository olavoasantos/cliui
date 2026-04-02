import {Event} from './Event';
import {HTMLElement} from './HTMLElement';

import type {Document} from './Document';
import type {Element} from './Element';
import type {KeyboardEvent} from './KeyboardEvent';

/**
 * Platform `<dialog>` element with modal and non-modal open/close semantics.
 *
 * - `show()` opens the dialog non-modally (no focus trap, no backdrop).
 * - `showModal()` opens the dialog modally: focus is trapped inside,
 *   Escape closes the dialog (dispatching `cancel` then `close`), and a
 *   `modal` attribute is set for styling.
 * - `close(returnValue?)` closes the dialog, restores previous focus,
 *   and dispatches a `close` event.
 *
 * The UA stylesheet hides `<dialog>` by default and shows it when the
 * `open` attribute is present.
 */
export class HTMLDialogElement extends HTMLElement {
  /** The value passed to `close()`, or empty string. */
  returnValue = '';

  /** Whether the dialog was opened via `showModal()`. */
  private modal = false;

  /** The element that was focused before the dialog opened. */
  private previousActiveElement: Element | null = null;

  /** Bound keydown handler for Escape and Tab trapping. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;

  /** Whether the dialog is currently open. */
  get open(): boolean {
    return this.hasAttribute('open');
  }

  set open(value: boolean) {
    if (value) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
  }

  /**
   * Opens the dialog non-modally.
   * No focus trapping or Escape handling.
   */
  show(): void {
    if (this.open) return;
    this.modal = false;
    this.removeAttribute('modal');
    this.setAttribute('open', '');
  }

  /**
   * Opens the dialog modally with focus trapping and Escape-to-close.
   *
   * Focus is moved to the first focusable descendant (or the dialog itself).
   * Tab/Shift+Tab cycles among focusable descendants only.
   * Escape dispatches `cancel` (cancelable) then `close`.
   */
  showModal(): void {
    if (this.open) return;

    this.modal = true;
    this.setAttribute('modal', '');
    this.setAttribute('open', '');

    const doc = this.ownerDocument as Document;
    this.previousActiveElement = doc.activeElement as Element;

    // Focus the first focusable descendant, or the dialog itself
    const firstFocusable = this.querySelector('[tabindex]');

    if (firstFocusable) {
      doc.setActiveElement(firstFocusable);
    } else {
      // Make the dialog itself focusable temporarily
      if (!this.hasAttribute('tabindex')) {
        this.setAttribute('tabindex', '-1');
      }

      doc.setActiveElement(this);
    }

    this.addEventListener('keydown', this.boundKeyDown);
  }

  /**
   * Closes the dialog, optionally setting the return value.
   *
   * Dispatches a `close` event. If the dialog was modal, restores
   * focus to the previously focused element.
   *
   * @param returnValue - Optional value retrievable via `dialog.returnValue`.
   */
  close(returnValue?: string): void {
    if (!this.open) return;

    if (returnValue !== undefined) {
      this.returnValue = String(returnValue);
    }

    this.removeAttribute('open');
    this.removeAttribute('modal');
    this.removeEventListener('keydown', this.boundKeyDown);

    const wasModal = this.modal;
    this.modal = false;

    this.dispatchEvent(new Event('close'));

    if (wasModal && this.previousActiveElement) {
      const doc = this.ownerDocument as Document;
      doc.setActiveElement(this.previousActiveElement);
      this.previousActiveElement = null;
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    const keyEvent = event as KeyboardEvent;

    if (keyEvent.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();

      const cancelEvent = new Event('cancel', {cancelable: true});
      this.dispatchEvent(cancelEvent);

      if (!cancelEvent.defaultPrevented) {
        this.close();
      }

      return;
    }

    if (keyEvent.key === 'Tab') {
      this.trapFocus(keyEvent.shiftKey);
      event.preventDefault();
      event.stopPropagation();
    }
  }

  /**
   * Cycles focus among focusable descendants of this dialog.
   */
  private trapFocus(backwards: boolean): void {
    const focusable = this.querySelectorAll('[tabindex]');

    if (focusable.length === 0) return;

    const doc = this.ownerDocument as Document;
    const current = doc.activeElement as Element;
    const currentIndex = focusable.indexOf(current);

    const nextIndex =
      currentIndex === -1
        ? backwards
          ? focusable.length - 1
          : 0
        : (currentIndex + (backwards ? -1 : 1) + focusable.length) % focusable.length;

    const next = focusable[nextIndex];

    if (next) {
      doc.setActiveElement(next);
    }
  }
}
