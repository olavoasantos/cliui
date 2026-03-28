import {EventTarget} from '../classes/EventTarget';

import type {Window} from '../classes/Window';

/**
 * Installs a `Window` instance's properties onto `globalThis` so that
 * frameworks referencing global `document`, `window`, `navigator`, etc.
 * pick up the terminal DOM automatically.
 *
 * Self-referencing properties (`window`, `self`, `parent`, `top`) are
 * redirected to `globalThis` to match browser semantics.  `EventTarget`
 * prototype methods are bound to the `Window` instance so that
 * `globalThis.addEventListener()` dispatches on the correct target.
 *
 * This function is idempotent — calling it more than once with the same
 * window instance is a no-op.
 *
 * @param window - The `Window` instance to install globally.
 */
export function polyfillEnvironment(window: Window): void {
  /* Redirect self-referencing properties to globalThis */
  for (const property in window) {
    if ((window as unknown as Record<string, unknown>)[property] === window) {
      (window as unknown as Record<string, unknown>)[property] = globalThis;
    }
  }

  const properties = Object.getOwnPropertyDescriptors(window);
  const eventTargetPrototypeProperties = Object.getOwnPropertyDescriptors(EventTarget.prototype);

  /* Bind EventTarget methods so globalThis.addEventListener() etc. work */
  for (const descriptor of Object.values(eventTargetPrototypeProperties)) {
    if (typeof descriptor.value === 'function') {
      descriptor.value = descriptor.value.bind(window);
    }
  }

  Object.defineProperties(globalThis, properties);
  Object.defineProperties(globalThis, eventTargetPrototypeProperties);
}
