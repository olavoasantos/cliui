import {Event} from './Event';

/**
 * Event subclass that carries custom data via the `detail` property.
 */
export class CustomEvent<T = unknown> extends Event {
  /** Custom data passed through the event. */
  readonly detail: T;

  /**
   * Creates a custom event.
   *
   * @param type - Event type string.
   * @param eventInitDict - Optional init dict with `detail` and standard event flags.
   */
  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail as T;
  }

  /** @deprecated Legacy initializer. Use the constructor instead. */
  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: T) {
    super.initEvent(type, bubbles, cancelable);
    (this as {detail: T}).detail = detail as T;
  }
}
