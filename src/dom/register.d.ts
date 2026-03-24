/** Ambient DOM types needed by the terminal DOM implementation. */

declare interface EventListenerOptions {
  capture?: boolean;
}

declare interface AddEventListenerOptions extends EventListenerOptions {
  once?: boolean;
  passive?: boolean;
  signal?: AbortSignal;
}

declare type EventListener = (evt: unknown) => void;

declare interface EventListenerObject {
  handleEvent(object: unknown): void;
}

declare type EventListenerOrEventListenerObject = EventListener | EventListenerObject;

declare interface CustomElementConstructor {
  new (): unknown;
}

declare interface ElementDefinitionOptions {
  extends?: string;
}

declare interface CustomEventInit<T = unknown> {
  bubbles?: boolean;
  cancelable?: boolean;
  composed?: boolean;
  detail?: T;
}

declare interface DataTransfer {
  dropEffect: string;
  effectAllowed: string;
  readonly items: unknown;
  readonly types: readonly string[];
  clearData(format?: string): void;
  getData(format: string): string;
  setData(format: string, data: string): void;
}
