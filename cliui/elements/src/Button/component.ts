import styles from './styles.css?inline';

import {
  DEFAULT_BUTTON_TONE,
  DEFAULT_BUTTON_VARIANT,
  BUTTON_FLASH_FRAMES,
  BUTTON_OBSERVED_ATTRIBUTES,
  BUTTON_TAG_NAME,
} from './constants';
import {Event, HTMLElement, MouseEvent, type Element, type KeyboardEvent} from '@cliui/dom';

import type {TerminalFrameAware} from '@cliui/terminal';
import type {ButtonTone, ButtonVariant} from './types';

/**
 * Built-in terminal button custom element.
 *
 * Follows browser `<button>` activation semantics:
 * - **Enter** dispatches `click` on `keydown` with a brief pressed flash.
 * - **Space** enters a pressed state on `keydown` and dispatches `click`
 *   on `keyup`.
 * - **Mouse click** dispatches `click` with standard bubbling.
 * - All activation is blocked while `disabled` is set.
 *
 * Standard DOM properties: `type`, `disabled`, `form`.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('button', Button)`.
 */
export class Button extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = BUTTON_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = BUTTON_TAG_NAME;

  /** Whether the Space key is currently held down. */
  private spacePressed = false;

  /** Remaining frames for the Enter-key pressed flash. */
  private flashFramesRemaining = 0;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as never;
  private readonly boundKeyUp = this.handleKeyUp.bind(this) as never;
  private readonly boundClick = this.handleClick.bind(this) as never;
  private readonly boundBlur = this.handleBlur.bind(this) as never;

  connectedCallback(): void {
    if (!this.disabled) {
      this.ensureTabIndex();
    }

    this.addEventListener('keydown', this.boundKeyDown);
    this.addEventListener('keyup', this.boundKeyUp);
    this.addEventListener('click', this.boundClick);
    this.addEventListener('blur', this.boundBlur);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.boundKeyDown);
    this.removeEventListener('keyup', this.boundKeyUp);
    this.removeEventListener('click', this.boundClick);
    this.removeEventListener('blur', this.boundBlur);
    this.clearPressed();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) {
      return;
    }

    if (name === 'disabled') {
      if (newValue != null) {
        this.removeAttribute('tabindex');
        this.clearPressed();
      } else {
        this.ensureTabIndex();
      }
    }
  }

  /** The button type — defaults to `'button'`. */
  get type(): string {
    return this.getAttribute('type') ?? 'button';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  /** Whether the button is currently disabled. */
  get disabled(): boolean {
    return this.hasAttribute('disabled');
  }

  set disabled(value: boolean) {
    if (value) {
      this.setAttribute('disabled', '');
    } else {
      this.removeAttribute('disabled');
    }
  }

  /** Returns the nearest ancestor `<form>` element, or `null`. */
  get form(): Element | null {
    let current = this.parentElement as Element | null;

    while (current !== null) {
      if (current.localName === 'form') {
        return current;
      }

      current = current.parentElement as Element | null;
    }

    return null;
  }

  /** Returns the current variant, falling back to the default. */
  getVariant(): ButtonVariant {
    const raw = this.getAttribute('variant');

    if (raw === 'primary' || raw === 'secondary') {
      return raw;
    }

    return DEFAULT_BUTTON_VARIANT;
  }

  /** Returns the current tone, falling back to the default. */
  getTone(): ButtonTone {
    const raw = this.getAttribute('tone');

    if (raw === 'default' || raw === 'dangerous') {
      return raw;
    }

    return DEFAULT_BUTTON_TONE;
  }

  /**
   * Suppresses click events while the button is disabled so that
   * no listeners observe the event.
   */
  override dispatchEvent(event: Event): boolean {
    if (this.disabled && event.type === 'click') {
      return false;
    }

    return super.dispatchEvent(event);
  }

  /**
   * Advances the Enter-key pressed flash timer.
   *
   * @param _timestamp - Current frame timestamp in milliseconds.
   */
  onTerminalFrame(_timestamp: number): void {
    if (this.flashFramesRemaining <= 0) {
      return;
    }

    this.flashFramesRemaining -= 1;

    if (this.flashFramesRemaining <= 0) {
      this.removeAttribute('pressed');
    }
  }

  /* ── Private ────────────────────────────────────────────── */

  private handleKeyDown(event: Event): void {
    if (this.disabled) return;

    const key = (event as KeyboardEvent).key;

    if (key === 'Enter') {
      this.setAttribute('pressed', '');
      this.flashFramesRemaining = BUTTON_FLASH_FRAMES;
      this.dispatchClick();
      return;
    }

    if (key === ' ') {
      event.preventDefault();

      if (!this.spacePressed) {
        this.spacePressed = true;
        this.flashFramesRemaining = 0;
        this.setAttribute('pressed', '');
      }
    }
  }

  private handleKeyUp(event: Event): void {
    const key = (event as KeyboardEvent).key;

    if (key === ' ' && this.spacePressed) {
      this.clearPressed();

      if (!this.disabled) {
        this.dispatchClick();
      }
    }
  }

  private handleClick(_event: Event): void {
    /* Click suppression for disabled state is handled by the
       dispatchEvent override. */
  }

  private handleBlur(): void {
    this.clearPressed();
  }

  private dispatchClick(): void {
    this.dispatchEvent(
      new MouseEvent('click', {
        bubbles: true,
        cancelable: true,
      }),
    );
  }

  private clearPressed(): void {
    this.spacePressed = false;
    this.flashFramesRemaining = 0;
    this.removeAttribute('pressed');
  }

  private ensureTabIndex(): void {
    if (!this.hasAttribute('tabindex')) {
      this.setAttribute('tabindex', '0');
    }
  }
}
