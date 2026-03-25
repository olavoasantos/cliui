import {ClipboardEvent, KeyboardEvent} from '../../dom';

import type {Document} from '../../dom';
import type {TerminalInputEvent, TerminalKeyEvent, TerminalPasteEvent} from '../types';

/**
 * Bridges parsed terminal input events into DOM events dispatched on the
 * document body.
 *
 * In Phase 1 all terminal keyboard and paste input targets `document.body`.
 * Because terminal input does not distinguish key press from key release,
 * every parsed key event dispatches a synthetic `keydown` immediately followed
 * by `keyup`.
 */
export class EventDispatcher {
  private document: Document;

  /**
   * Creates a new dispatcher bound to a DOM document.
   *
   * @param document - The target document whose body receives events.
   */
  constructor(document: Document) {
    this.document = document;
  }

  /**
   * Dispatches one parsed terminal input event into the DOM.
   *
   * @param event - Parsed terminal key or paste event.
   */
  dispatch(event: TerminalInputEvent): void {
    if (event.type === 'key') {
      this.dispatchKeyEvent(event);
      return;
    }

    this.dispatchPasteEvent(event);
  }

  /**
   * Dispatches multiple parsed terminal input events in sequence.
   *
   * @param events - Parsed terminal input events.
   */
  dispatchAll(events: TerminalInputEvent[]): void {
    for (const event of events) {
      this.dispatch(event);
    }
  }

  private dispatchKeyEvent(event: TerminalKeyEvent): void {
    const keydown = this.createKeyboardEvent('keydown', event);
    const keyup = this.createKeyboardEvent('keyup', event);

    this.document.body.dispatchEvent(keydown);
    this.document.body.dispatchEvent(keyup);
  }

  private dispatchPasteEvent(event: TerminalPasteEvent): void {
    const clipboardData = {
      getData: (type: string): string => (type === 'text/plain' ? event.text : ''),
    } as DataTransfer;

    this.document.body.dispatchEvent(
      new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData,
      }),
    );
  }

  private createKeyboardEvent(type: 'keydown' | 'keyup', event: TerminalKeyEvent): KeyboardEvent {
    return new KeyboardEvent(type, {
      bubbles: true,
      cancelable: true,
      key: event.key,
      code: event.code,
      ctrlKey: event.ctrl,
      altKey: event.alt,
      shiftKey: event.shift,
    });
  }
}
