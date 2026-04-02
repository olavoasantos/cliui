import styles from './styles.css?inline';

import {
  DEFAULT_UI_CONFIRMATION_CANCEL_LABEL,
  DEFAULT_UI_CONFIRMATION_CONFIRM_LABEL,
  UI_CONFIRMATION_OBSERVED_ATTRIBUTES,
  UI_CONFIRMATION_TAG_NAME,
} from './constants';
import {Event, HTMLElement} from '@cliui/dom';
import type {Element, KeyboardEvent, Node} from '@cliui/dom';

import type {HTMLDialogElement} from '@cliui/dom';

/**
 * Built-in confirmation dialog custom element.
 *
 * Composes a platform `<dialog>` element with a message and two
 * buttons (confirm / cancel). Call `confirm()` to open a modal
 * dialog and receive a Promise that resolves to `true` when the
 * user confirms or `false` when the user cancels or presses Escape.
 *
 * Focus trapping, Escape handling, and backdrop rendering are
 * inherited from the underlying `<dialog>` element.
 *
 * Register with `window.customElements.define(UiConfirmation.tagName, UiConfirmation)`
 * before creating `<ui-confirmation>` elements in a window.
 */
export class UiConfirmation extends HTMLElement {
  static override readonly observedAttributes = UI_CONFIRMATION_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_CONFIRMATION_TAG_NAME;

  /** Internal dialog element. */
  private dialog: HTMLDialogElement | null = null;

  /** Pending resolve callback for the current `confirm()` call. */
  private pendingResolve: ((value: boolean) => void) | null = null;

  /**
   * Opens the confirmation dialog modally and waits for user input.
   *
   * @returns `true` if the user confirmed, `false` if cancelled.
   */
  confirm(): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.pendingResolve = resolve;
      this.ensureDialog();
      this.syncMessage();
      this.syncLabels();
      (this.dialog as HTMLDialogElement).showModal();
    });
  }

  /* ── Private: DOM structure ─────────────────────────────── */

  private ensureDialog(): void {
    if (this.dialog) return;

    const doc = this.ownerDocument!;

    this.dialog = doc.createElement('dialog') as unknown as HTMLDialogElement;

    const messageEl = doc.createElement('div');
    messageEl.setAttribute('class', 'ui-confirmation-message');
    messageEl.style.display = 'block';

    const btnRow = doc.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.flexDirection = 'row';
    btnRow.style.gap = '2';

    const confirmBtn = doc.createElement('ui-button');
    confirmBtn.setAttribute('class', 'ui-confirmation-confirm');
    confirmBtn.setAttribute('variant', 'primary');
    confirmBtn.setAttribute('tabindex', '0');

    const cancelBtn = doc.createElement('ui-button');
    cancelBtn.setAttribute('class', 'ui-confirmation-cancel');
    cancelBtn.setAttribute('variant', 'secondary');
    cancelBtn.setAttribute('tabindex', '1');

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);

    (this.dialog as unknown as Element).appendChild(messageEl);
    (this.dialog as unknown as Element).appendChild(btnRow);

    doc.body.appendChild(this.dialog as unknown as Node);

    /* Confirm button click */
    confirmBtn.addEventListener('click', (() => {
      this.resolve(true);
    }) as never);

    /* Cancel button click */
    cancelBtn.addEventListener('click', (() => {
      this.resolve(false);
    }) as never);

    /* Enter on confirm button */
    confirmBtn.addEventListener('keydown', ((event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.resolve(true);
      }
    }) as never);

    /* Enter on cancel button */
    cancelBtn.addEventListener('keydown', ((event: Event) => {
      const key = (event as KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.resolve(false);
      }
    }) as never);

    /* Escape via dialog cancel event */
    (this.dialog as unknown as Element).addEventListener('cancel', (() => {
      this.resolve(false);
    }) as never);
  }

  private syncMessage(): void {
    if (!this.dialog) return;

    const dialogEl = this.dialog as unknown as Element;
    const messageEl = dialogEl.querySelector('.ui-confirmation-message');

    if (messageEl) {
      messageEl.textContent = this.getAttribute('message') ?? '';
    }
  }

  private syncLabels(): void {
    if (!this.dialog) return;

    const dialogEl = this.dialog as unknown as Element;
    const confirmBtn = dialogEl.querySelector('.ui-confirmation-confirm');
    const cancelBtn = dialogEl.querySelector('.ui-confirmation-cancel');

    if (confirmBtn) {
      confirmBtn.textContent =
        this.getAttribute('confirm-label') ?? DEFAULT_UI_CONFIRMATION_CONFIRM_LABEL;
    }

    if (cancelBtn) {
      cancelBtn.textContent =
        this.getAttribute('cancel-label') ?? DEFAULT_UI_CONFIRMATION_CANCEL_LABEL;
    }
  }

  private resolve(value: boolean): void {
    if (!this.dialog) return;

    (this.dialog as HTMLDialogElement).close(value ? 'confirmed' : 'cancelled');

    if (this.pendingResolve) {
      const fn = this.pendingResolve;
      this.pendingResolve = null;
      fn(value);
    }
  }
}
