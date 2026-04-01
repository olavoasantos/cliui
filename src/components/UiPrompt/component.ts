import styles from './styles.css?inline';

import {
  DEFAULT_UI_PROMPT_CANCEL_LABEL,
  DEFAULT_UI_PROMPT_CONFIRM_LABEL,
  DEFAULT_UI_PROMPT_INPUT_WIDTH,
  UI_PROMPT_OBSERVED_ATTRIBUTES,
  UI_PROMPT_TAG_NAME,
} from './constants';
import {Event, HTMLElement} from '../../dom';

import type {HTMLDialogElement} from '../../dom/classes/HTMLDialogElement';

/**
 * Built-in text prompt dialog custom element.
 *
 * Composes a platform `<dialog>` element with a message, a text input,
 * and confirm/cancel buttons. Call `prompt(message?)` to open a modal
 * dialog and receive a Promise that resolves to the entered string or
 * `null` if the user cancels.
 *
 * Focus trapping, Escape handling, and backdrop rendering are
 * inherited from the underlying `<dialog>` element.
 *
 * Register with `window.customElements.define(UiPrompt.tagName, UiPrompt)`
 * before creating `<ui-prompt>` elements in a window.
 */
export class UiPrompt extends HTMLElement {
  static override readonly observedAttributes = UI_PROMPT_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_PROMPT_TAG_NAME;

  /** Internal dialog element. */
  private dialog: HTMLDialogElement | null = null;

  /** Internal input element. */
  private inputEl: import('../../dom').Element | null = null;

  /** Pending resolve callback for the current `prompt()` call. */
  private pendingResolve: ((value: string | null) => void) | null = null;

  /**
   * Opens the prompt dialog modally and waits for user input.
   *
   * @param message - Optional message to display. Overrides the
   *   `message` attribute for this invocation.
   * @returns The entered text, or `null` if cancelled.
   */
  prompt(message?: string): Promise<string | null> {
    return new Promise<string | null>((resolve) => {
      this.pendingResolve = resolve;
      this.ensureDialog();

      if (message != null) {
        this.setAttribute('message', message);
      }

      this.syncMessage();
      this.syncLabels();

      /* Clear previous input value */
      if (this.inputEl) {
        this.inputEl.setAttribute('value', '');
      }

      (this.dialog as HTMLDialogElement).showModal();
    });
  }

  /* ── Private: DOM structure ─────────────────────────────── */

  private ensureDialog(): void {
    if (this.dialog) return;

    const doc = this.ownerDocument!;

    this.dialog = doc.createElement('dialog') as unknown as HTMLDialogElement;

    const messageEl = doc.createElement('div');
    messageEl.setAttribute('class', 'ui-prompt-message');
    messageEl.style.display = 'block';

    this.inputEl = doc.createElement('ui-input');
    this.inputEl.setAttribute('tabindex', '0');
    this.inputEl.setAttribute('width', String(DEFAULT_UI_PROMPT_INPUT_WIDTH));
    this.inputEl.setAttribute('placeholder', 'Type here...');

    const btnRow = doc.createElement('div');
    btnRow.style.display = 'flex';
    btnRow.style.flexDirection = 'row';
    btnRow.style.gap = '2';

    const confirmBtn = doc.createElement('ui-button');
    confirmBtn.setAttribute('class', 'ui-prompt-confirm');
    confirmBtn.setAttribute('variant', 'primary');
    confirmBtn.setAttribute('tabindex', '1');

    const cancelBtn = doc.createElement('ui-button');
    cancelBtn.setAttribute('class', 'ui-prompt-cancel');
    cancelBtn.setAttribute('variant', 'secondary');
    cancelBtn.setAttribute('tabindex', '2');

    btnRow.appendChild(confirmBtn);
    btnRow.appendChild(cancelBtn);

    const dialogEl = this.dialog as unknown as import('../../dom').Element;
    dialogEl.appendChild(messageEl);
    dialogEl.appendChild(this.inputEl);
    dialogEl.appendChild(btnRow);

    doc.body.appendChild(this.dialog as unknown as import('../../dom').Node);

    /* Confirm button click */
    confirmBtn.addEventListener('click', (() => {
      this.resolve(this.getInputValue());
    }) as EventListener);

    /* Cancel button click */
    cancelBtn.addEventListener('click', (() => {
      this.resolve(null);
    }) as EventListener);

    /* Enter on confirm button */
    confirmBtn.addEventListener('keydown', ((event: Event) => {
      const key = (event as import('../../dom').KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.resolve(this.getInputValue());
      }
    }) as EventListener);

    /* Enter on cancel button */
    cancelBtn.addEventListener('keydown', ((event: Event) => {
      const key = (event as import('../../dom').KeyboardEvent).key;
      if (key === 'Enter' || key === ' ') {
        event.preventDefault();
        this.resolve(null);
      }
    }) as EventListener);

    /* Enter in input submits */
    this.inputEl.addEventListener('keydown', ((event: Event) => {
      const key = (event as import('../../dom').KeyboardEvent).key;
      if (key === 'Enter') {
        event.preventDefault();
        this.resolve(this.getInputValue());
      }
    }) as EventListener);

    /* Escape via dialog cancel event */
    dialogEl.addEventListener('cancel', (() => {
      this.resolve(null);
    }) as EventListener);
  }

  private syncMessage(): void {
    if (!this.dialog) return;

    const dialogEl = this.dialog as unknown as import('../../dom').Element;
    const messageEl = dialogEl.querySelector('.ui-prompt-message');

    if (messageEl) {
      messageEl.textContent = this.getAttribute('message') ?? '';
    }
  }

  private syncLabels(): void {
    if (!this.dialog) return;

    const dialogEl = this.dialog as unknown as import('../../dom').Element;
    const confirmBtn = dialogEl.querySelector('.ui-prompt-confirm');
    const cancelBtn = dialogEl.querySelector('.ui-prompt-cancel');

    if (confirmBtn) {
      confirmBtn.textContent =
        this.getAttribute('confirm-label') ?? DEFAULT_UI_PROMPT_CONFIRM_LABEL;
    }

    if (cancelBtn) {
      cancelBtn.textContent = this.getAttribute('cancel-label') ?? DEFAULT_UI_PROMPT_CANCEL_LABEL;
    }
  }

  private getInputValue(): string {
    return this.inputEl?.getAttribute('value') ?? '';
  }

  private resolve(value: string | null): void {
    if (!this.dialog) return;

    (this.dialog as HTMLDialogElement).close(value ?? '');

    if (this.pendingResolve) {
      const fn = this.pendingResolve;
      this.pendingResolve = null;
      fn(value);
    }
  }
}
