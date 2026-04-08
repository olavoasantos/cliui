import type {HTMLScriptElement} from '@cliui/dom';
import type {Element} from '@cliui/dom';
import type {Window} from '@cliui/dom';
import type {ScriptContext} from './ScriptContext';
import type {ResourceResolver} from './ResourceResolver';

/** Recognised classic script MIME types (empty string is the default). */
const CLASSIC_TYPES = new Set(['', 'text/javascript', 'application/javascript']);

/**
 * Executes `<script>` elements — both inline and external — in the VM
 * context.
 *
 * Classic (non-module) scripts are executed via `vm.runInContext()`.
 * External scripts are loaded via the {@link ResourceResolver} before
 * execution. Script errors are caught and dispatched as `error` events
 * on the `<script>` element and on `window`.
 *
 * Module scripts (`type="module"`) are deferred to `ModuleScriptExecutor`.
 */
export class ScriptExecutor {
  private readonly context: ScriptContext;
  private readonly resolver: ResourceResolver;
  private readonly window: Window;

  /**
   * @param context - The VM execution context.
   * @param resolver - The resource resolver for external script loading.
   * @param window - The Window instance for error event dispatch.
   */
  constructor(context: ScriptContext, resolver: ResourceResolver, window: Window) {
    this.context = context;
    this.resolver = resolver;
    this.window = window;
  }

  /**
   * Executes a classic `<script>` element.
   *
   * - Inline scripts: executes the `textContent` in the VM context.
   * - External scripts (`src`): loads the file via the resource resolver,
   *   then executes in the VM context.
   * - Scripts with unrecognised `type` attributes are silently ignored.
   * - Script errors are caught and dispatched as `error` events.
   *
   * @param element - The script element to execute.
   * @returns `true` if the script was executed (or intentionally skipped),
   *   `false` if it could not be loaded.
   */
  execute(element: HTMLScriptElement): boolean {
    const type = element.type.toLowerCase();

    // Module scripts are handled by ModuleScriptExecutor
    if (type === 'module') {
      return false;
    }

    // Unrecognised types are silently ignored (matches browser behavior)
    if (!CLASSIC_TYPES.has(type)) {
      return true;
    }

    const src = element.src;

    if (src) {
      return this.executeExternal(element, src);
    }

    const code = element.textContent ?? '';

    if (code.trim()) {
      return this.executeCode(code, element, '<inline-script>');
    }

    return true;
  }

  /**
   * Executes an external script by loading it from the filesystem.
   */
  private executeExternal(element: HTMLScriptElement, src: string): boolean {
    const content = this.resolver.readSync(src);

    if (content === null) {
      this.dispatchError(
        element,
        new Error(`Failed to load script: ${this.resolver.resolve(src)}`),
      );
      return false;
    }

    return this.executeCode(content, element, this.resolver.resolve(src));
  }

  /**
   * Executes JavaScript code in the VM context with error handling.
   */
  private executeCode(code: string, element: HTMLScriptElement, filename: string): boolean {
    try {
      this.context.run(code, filename);
      return true;
    } catch (error) {
      this.dispatchError(element, error instanceof Error ? error : new Error(String(error)));
      return false;
    }
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
}
