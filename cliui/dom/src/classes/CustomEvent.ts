import {Event} from './Event';

export class CustomEvent<T = unknown> extends Event {
  readonly detail: T;

  constructor(type: string, eventInitDict?: CustomEventInit<T>) {
    super(type, eventInitDict);
    this.detail = eventInitDict?.detail as T;
  }

  initCustomEvent(type: string, bubbles?: boolean, cancelable?: boolean, detail?: T) {
    super.initEvent(type, bubbles, cancelable);
    (this as {detail: T}).detail = detail as T;
  }
}
