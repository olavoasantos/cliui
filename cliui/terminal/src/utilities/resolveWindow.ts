import {Window} from '@cliui/dom';

import type {TerminalOptions} from '../types';

/**
 * Resolves the `Window` instance for the terminal.
 *
 * Prefers an explicit instance from `options.window`, then falls back to
 * `globalThis.window` (populated by the default import's environment
 * polyfill), then creates a fresh `Window` as a last resort.
 */
export function resolveWindow(options: TerminalOptions): Window {
  if (options.window) {
    return options.window;
  }

  const globalWindow = (globalThis as Record<string, unknown>).window;

  if (globalWindow != null && typeof globalWindow === 'object' && 'document' in globalWindow) {
    return globalWindow as Window;
  }

  return new Window();
}
