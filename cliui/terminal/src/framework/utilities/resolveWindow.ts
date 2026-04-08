import {Window} from '@cliui/dom';

import type {Document} from '@cliui/dom';
import type {TerminalOptions} from '../types';

/**
 * Resolves the `Window` instance for the terminal.
 *
 * Prefers an explicit instance from `options.window`, then falls back to
 * the polyfilled global environment, then creates a fresh `Window` as a
 * last resort.
 *
 * The polyfill (`polyfillEnvironment`) copies Window properties onto
 * `globalThis` and rewrites self-references so `globalThis.window ===
 * globalThis` — matching browser semantics.  That means `instanceof
 * Window` fails on `globalThis`.  We recover the original Window via
 * `document.defaultView`, which is always the real instance.
 */
export function resolveWindow(options: TerminalOptions): Window {
  if (options.window) {
    return options.window;
  }

  // Recover the original Window from the polyfilled global document.
  // After polyfillEnvironment, globalThis.document is the real Document
  // whose defaultView points to the original Window instance.
  const globalDoc = (globalThis as Record<string, unknown>).document as Document | undefined;

  if (globalDoc?.defaultView instanceof Window) {
    return globalDoc.defaultView;
  }

  return new Window();
}
