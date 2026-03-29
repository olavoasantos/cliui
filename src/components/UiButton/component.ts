import styles from './styles.css?inline';

import {
  DEFAULT_UI_BUTTON_TONE,
  DEFAULT_UI_BUTTON_VARIANT,
  UI_BUTTON_FLASH_FRAMES,
  UI_BUTTON_OBSERVED_ATTRIBUTES,
  UI_BUTTON_TAG_NAME,
} from './constants';
import {Event, HTMLElement, MouseEvent} from '../../dom';

import type {TerminalFrameAware} from '../../types/TerminalFrameAware';
import type {UiButtonTone, UiButtonVariant} from './types';

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
 * The button is focusable by default — `tabindex="0"` is set
 * automatically on connect unless the element is disabled. Focus and
 * active states are targetable via `:focus` and `:active` pseudo-classes.
 *
 * Register with `window.customElements.define(UiButton.tagName, UiButton)`
 * before creating `<ui-button>` elements in a window.
 */
export class UiButton extends HTMLElement implements TerminalFrameAware {
  static override readonly observedAttributes = UI_BUTTON_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_BUTTON_TAG_NAME;

  /** Whether the Space key is currently held down. */
  private spacePressed = false;

  /** Remaining frames for the Enter-key pressed flash. */
  private flashFramesRemaining = 0;

  /** Bound event handlers for cleanup. */
  private readonly boundKeyDown = this.handleKeyDown.bind(this) as EventListener;
  private readonly boundKeyUp = this.handleKeyUp.bind(this) as EventListener;
  private readonly boundClick = this.handleClick.bind(this) as EventListener;
  private readonly boundBlur = this.handleBlur.bind(this) as EventListener;

  connectedCallback(): void {
    if (!this.isDisabled()) {
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

  /** Returns the current variant, falling back to the default. */
  getVariant(): UiButtonVariant {
    const raw = this.getAttribute('variant');

    if (raw === 'primary' || raw === 'secondary') {
      return raw;
    }

    return DEFAULT_UI_BUTTON_VARIANT;
  }

  /** Returns the current tone, falling back to the default. */
  getTone(): UiButtonTone {
    const raw = this.getAttribute('tone');

    if (raw === 'default' || raw === 'dangerous') {
      return raw;
    }

    return DEFAULT_UI_BUTTON_TONE;
  }

  /** Whether the button is currently disabled. */
  isDisabled(): boolean {
    return this.hasAttribute('disabled');
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
    if (this.isDisabled()) return;

    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key === 'Enter') {
      this.setAttribute('pressed', '');
      this.flashFramesRemaining = UI_BUTTON_FLASH_FRAMES;
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
    const key = (event as import('../../dom').KeyboardEvent).key;

    if (key === ' ' && this.spacePressed) {
      this.clearPressed();

      if (!this.isDisabled()) {
        this.dispatchClick();
      }
    }
  }

  private handleClick(event: Event): void {
    if (this.isDisabled()) {
      event.stopImmediatePropagation();
      event.preventDefault();
    }
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
