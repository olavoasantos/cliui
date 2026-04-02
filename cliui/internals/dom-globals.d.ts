/**
 * Minimal ambient declarations for packages that depend on @cliui/dom.
 * This file provides the global type augmentations without pulling in
 * the dom source tree via import() references.
 */

declare global {
  interface EventListenerOptions {
    capture?: boolean;
  }

  interface AddEventListenerOptions extends EventListenerOptions {
    once?: boolean;
    passive?: boolean;
    signal?: AbortSignal;
  }

  type EventListener = (evt: unknown) => void;

  interface EventListenerObject {
    handleEvent(object: unknown): void;
  }

  type EventListenerOrEventListenerObject = EventListener | EventListenerObject;

  interface ElementDefinitionOptions {
    extends?: string;
  }

  interface CustomEventInit<T = unknown> {
    bubbles?: boolean;
    cancelable?: boolean;
    composed?: boolean;
    detail?: T;
  }

  interface DataTransfer {
    dropEffect: string;
    effectAllowed: string;
    readonly items: unknown;
    readonly types: readonly string[];
    clearData(format?: string): void;
    getData(format: string): string;
    setData(format: string, data: string): void;
  }
}

export {};
