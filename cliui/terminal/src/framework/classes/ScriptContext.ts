import {createContext, runInContext} from 'node:vm';

import type {Window} from '@cliui/dom';

/**
 * Manages a `node:vm` execution context for running `<script>` content
 * with the terminal's `window` and `document` as globals.
 *
 * The context is populated with the terminal's Window object and all its
 * properties — `document`, `console`, `setTimeout`, `setInterval`,
 * `performance`, `MutationObserver`, `Event`, `CustomEvent`, and all
 * other globals exposed on Window.
 *
 * Scripts executed in the context share the same object references as
 * the terminal — mutations inside the VM affect the real DOM.
 *
 * The context is created once per Terminal instance and reused for all
 * script executions.
 */
export class ScriptContext {
  /** The underlying vm context object. */
  private readonly context: object;

  /** Reference to the window for identity checks. */
  private readonly window: Window;

  /**
   * Creates a new script execution context.
   *
   * @param window - The terminal's Window instance. All its properties
   *   become globals in the context.
   * @param terminal - The Terminal instance, exposed as the `terminal`
   *   global inside scripts.
   */
  constructor(window: Window, terminal?: unknown) {
    this.window = window;

    // Build the global object from the window's properties.
    // We use a plain object as the sandbox and copy all enumerable
    // properties from the window, plus well-known globals.
    const sandbox: Record<string, unknown> = {};

    // Copy all own properties from window (classes, document, etc.)
    for (const key of Object.getOwnPropertyNames(window)) {
      if (key === 'constructor') continue;

      try {
        const descriptor = Object.getOwnPropertyDescriptor(window, key);

        if (descriptor) {
          Object.defineProperty(sandbox, key, descriptor);
        }
      } catch {
        // Skip non-configurable properties
      }
    }

    // Copy prototype properties (methods like matchMedia, addEventListener)
    let proto = Object.getPrototypeOf(window) as object | null;

    while (proto && proto !== Object.prototype) {
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key === 'constructor' || key in sandbox) continue;

        try {
          const descriptor = Object.getOwnPropertyDescriptor(proto, key);

          if (descriptor && typeof descriptor.value === 'function') {
            // Bind methods to the window instance
            sandbox[key] = (descriptor.value as Function).bind(window);
          } else if (descriptor && (descriptor.get || descriptor.set)) {
            // Re-create accessors that delegate to the window
            Object.defineProperty(sandbox, key, {
              get: descriptor.get?.bind(window),
              set: descriptor.set?.bind(window),
              enumerable: descriptor.enumerable,
              configurable: true,
            });
          }
        } catch {
          // Skip problematic properties
        }
      }

      proto = Object.getPrototypeOf(proto) as object | null;
    }

    // Standard browser globals
    sandbox.window = window;
    sandbox.self = window;
    sandbox.globalThis = sandbox;
    sandbox.document = window.document;
    sandbox.navigator = window.navigator;
    sandbox.location = window.location;
    sandbox.performance = window.performance;

    // Console — use the real Node console
    sandbox.console = console;

    // Timers — expose Node's timer functions
    sandbox.setTimeout = globalThis.setTimeout;
    sandbox.clearTimeout = globalThis.clearTimeout;
    sandbox.setInterval = globalThis.setInterval;
    sandbox.clearInterval = globalThis.clearInterval;
    sandbox.queueMicrotask = globalThis.queueMicrotask;

    // Terminal instance
    if (terminal !== undefined) {
      sandbox.terminal = terminal;
    }

    this.context = createContext(sandbox);
  }

  /**
   * Executes a script string in the context.
   *
   * @param code - The JavaScript source code to execute.
   * @param filename - Optional filename for error stack traces.
   * @returns The result of the last expression in the script.
   */
  run(code: string, filename?: string): unknown {
    return runInContext(code, this.context, {
      filename: filename ?? '<script>',
    });
  }

  /**
   * Returns the underlying vm context object.
   *
   * Used by module script support (M10T7) for `vm.SourceTextModule`.
   */
  getContext(): object {
    return this.context;
  }

  /**
   * Returns the Window instance backing this context.
   */
  getWindow(): Window {
    return this.window;
  }
}
