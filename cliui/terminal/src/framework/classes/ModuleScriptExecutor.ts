import {pathToFileURL} from 'node:url';
import {writeFileSync, mkdtempSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';

import type {HTMLScriptElement} from '@cliui/dom';
import type {Element} from '@cliui/dom';
import type {Window} from '@cliui/dom';
import type {ScriptContext} from './ScriptContext';
import type {ResourceResolver} from './ResourceResolver';

/**
 * Executes `<script type="module">` elements — ES module scripts that
 * support `import`/`export`.
 *
 * Module scripts differ from classic scripts:
 * - They are deferred by default (execute after document is fully parsed).
 * - They execute in strict mode.
 * - They support `import` statements.
 * - The same module is not re-executed when imported multiple times.
 *
 * **Execution strategy:**
 * Uses Node.js dynamic `import()` for module execution. Global injection
 * (window, document, terminal) is done via the ScriptContext — the module
 * file has access to these via global variables set on `globalThis` in
 * the calling context.
 *
 * For inline modules, the code is written to a temporary file before
 * importing.
 */
export class ModuleScriptExecutor {
  private readonly context: ScriptContext;
  private readonly resolver: ResourceResolver;
  private readonly window: Window;

  /** Tracks loaded module URLs to avoid re-execution. */
  private readonly loadedModules = new Set<string>();

  /** Deferred module scripts awaiting execution after document parse. */
  private readonly deferred: Array<{element: HTMLScriptElement; code?: string; src?: string}> = [];

  /** Temporary directory for inline module scripts. */
  private tempDir: string | null = null;

  /**
   * @param context - The VM execution context.
   * @param resolver - The resource resolver for external module loading.
   * @param window - The Window instance for error event dispatch.
   */
  constructor(context: ScriptContext, resolver: ResourceResolver, window: Window) {
    this.context = context;
    this.resolver = resolver;
    this.window = window;
  }

  /**
   * Queues a module script for deferred execution.
   *
   * Module scripts are deferred by default — they execute after the
   * document is fully parsed. Call {@link executeDeferredModules} to
   * run all queued modules.
   *
   * @param element - The `<script type="module">` element.
   */
  enqueue(element: HTMLScriptElement): void {
    const src = element.src;

    if (src) {
      this.deferred.push({element, src});
    } else {
      const code = element.textContent ?? '';

      if (code.trim()) {
        this.deferred.push({element, code});
      }
    }
  }

  /**
   * Executes all deferred module scripts in document order.
   *
   * Returns a promise that resolves when all modules have been executed.
   * Errors are caught per-module and dispatched as events — they do not
   * reject the promise.
   */
  async executeDeferredModules(): Promise<void> {
    const modules = this.deferred.splice(0);

    for (const entry of modules) {
      if (entry.src) {
        await this.executeExternalModule(entry.element, entry.src);
      } else if (entry.code) {
        await this.executeInlineModule(entry.element, entry.code);
      }
    }
  }

  /**
   * Executes an external module script.
   */
  private async executeExternalModule(element: HTMLScriptElement, src: string): Promise<void> {
    const resolvedPath = this.resolver.resolve(src);
    const fileUrl = pathToFileURL(resolvedPath).href;

    // Module caching — don't re-execute
    if (this.loadedModules.has(fileUrl)) {
      return;
    }

    const content = this.resolver.readSync(src);

    if (content === null) {
      this.dispatchError(element, new Error(`Failed to load module script: ${resolvedPath}`));
      return;
    }

    try {
      // Inject globals before importing
      this.injectGlobals();

      // Use a cache-busting query to bypass Node's module cache when needed
      await import(fileUrl);
      this.loadedModules.add(fileUrl);
    } catch (error) {
      this.dispatchError(element, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Executes an inline module script by writing it to a temp file.
   */
  private async executeInlineModule(element: HTMLScriptElement, code: string): Promise<void> {
    if (!this.tempDir) {
      this.tempDir = mkdtempSync(join(tmpdir(), 'terminal-dom-modules-'));
    }

    const filename = `inline-module-${Date.now()}-${Math.random().toString(36).slice(2)}.mjs`;
    const tempPath = join(this.tempDir, filename);

    try {
      writeFileSync(tempPath, code, 'utf-8');

      // Inject globals before importing
      this.injectGlobals();

      const fileUrl = pathToFileURL(tempPath).href;
      await import(fileUrl);
    } catch (error) {
      this.dispatchError(element, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Injects terminal globals into the Node.js global scope.
   *
   * Since module scripts run via `import()` in the Node.js module system
   * (not in the VM context), we inject the terminal globals onto
   * `globalThis` so they are accessible inside the module.
   *
   * This is the "global injection" fallback described in the milestone
   * design for stable Node support.
   */
  private injectGlobals(): void {
    const g = globalThis as Record<string, unknown>;
    g.window = this.window;
    g.document = this.window.document;
    g.navigator = this.window.navigator;
    g.location = this.window.location;
    g.performance = this.window.performance;
    g.Event = this.window.Event;
    g.CustomEvent = this.window.CustomEvent;
    g.MutationObserver = this.window.MutationObserver;

    // terminal is passed into the context constructor
    const ctx = this.context.getContext() as Record<string, unknown>;

    if ('terminal' in ctx) {
      g.terminal = ctx.terminal;
    }
  }

  /**
   * Removes injected globals from the Node.js global scope.
   *
   * Call this after all module scripts have been executed to clean up.
   */
  cleanupGlobals(): void {
    const g = globalThis as Record<string, unknown>;
    const keys = [
      'window',
      'document',
      'navigator',
      'location',
      'Event',
      'CustomEvent',
      'MutationObserver',
      'terminal',
    ];

    for (const key of keys) {
      delete g[key];
    }
  }

  /**
   * Returns the resolved path for a module import specifier.
   *
   * Used for import resolution relative to the script's file path.
   */
  resolveImport(specifier: string, referrer: string): string {
    if (specifier.startsWith('./') || specifier.startsWith('../')) {
      return join(dirname(referrer), specifier);
    }

    return specifier;
  }

  /**
   * Dispatches an error event on the script element and on window.
   */
  private dispatchError(element: HTMLScriptElement, error: Error): void {
    const errorEvent = new this.window.ErrorEvent('error', {
      message: error.message,
    });

    element.dispatchEvent(errorEvent);
    (this.window as unknown as Element).dispatchEvent(errorEvent);
  }

  /**
   * Returns the number of deferred modules waiting.
   */
  get deferredCount(): number {
    return this.deferred.length;
  }

  /**
   * Returns the number of loaded modules.
   */
  get loadedCount(): number {
    return this.loadedModules.size;
  }
}
