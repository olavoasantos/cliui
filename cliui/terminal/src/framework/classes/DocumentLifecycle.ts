import type {HTMLScriptElement, Window, Element} from '@cliui/dom';
import type {ScriptExecutor} from './ScriptExecutor';
import type {ModuleScriptExecutor} from './ModuleScriptExecutor';

/**
 * Orchestrates script execution ordering and document lifecycle events
 * during document loading.
 *
 * Implements browser-compatible script ordering:
 * - Classic `<script>` (no defer/async): executes synchronously during parse
 * - `<script defer>`: executes after full document parse, before DOMContentLoaded
 * - `<script async>`: executes immediately (filesystem reads are instant)
 * - `<script type="module">`: deferred by default
 *
 * Lifecycle events:
 * - `DOMContentLoaded` fires on `document` after parsing + sync + deferred scripts
 * - `load` fires on `window` after DOMContentLoaded + all resources loaded
 */
export class DocumentLifecycle {
  private readonly scriptExecutor: ScriptExecutor;
  private readonly moduleExecutor: ModuleScriptExecutor;
  private readonly window: Window;

  /** Deferred classic scripts awaiting execution after document parse. */
  private readonly deferredScripts: HTMLScriptElement[] = [];

  /** Whether the document parse is complete. */
  private parsed = false;

  constructor(
    scriptExecutor: ScriptExecutor,
    moduleExecutor: ModuleScriptExecutor,
    window: Window,
  ) {
    this.scriptExecutor = scriptExecutor;
    this.moduleExecutor = moduleExecutor;
    this.window = window;
  }

  /**
   * Processes a `<script>` element encountered during document parsing.
   *
   * Determines whether the script should execute immediately, be deferred,
   * or be queued as a module based on its attributes.
   *
   * @param element - The script element to process.
   * @param inHead - Whether the script is in `<head>`.
   */
  processScript(element: HTMLScriptElement, _inHead?: boolean): void {
    const type = element.type.toLowerCase();

    // Module scripts are always deferred
    if (type === 'module') {
      this.moduleExecutor.enqueue(element);
      return;
    }

    // Unrecognised types — ignore
    if (type !== '' && type !== 'text/javascript' && type !== 'application/javascript') {
      return;
    }

    // Defer attribute — queue for after parse
    if (element.defer) {
      this.deferredScripts.push(element);
      return;
    }

    // Async attribute — execute immediately (filesystem is instant)
    // Classic scripts without defer/async — execute synchronously
    // Both in head and body: execute now
    this.scriptExecutor.execute(element);
  }

  /**
   * Called when the document has been fully parsed.
   *
   * Executes deferred scripts (in document order), then module scripts,
   * then fires `DOMContentLoaded` on the document.
   *
   * @returns A promise that resolves after all scripts and events complete.
   */
  async finishParsing(): Promise<void> {
    this.parsed = true;

    // Execute deferred classic scripts in document order
    for (const script of this.deferredScripts) {
      this.scriptExecutor.execute(script);
    }

    this.deferredScripts.length = 0;

    // Execute deferred module scripts
    await this.moduleExecutor.executeDeferredModules();

    // Fire DOMContentLoaded on document
    const dcl = new this.window.Event('DOMContentLoaded', {bubbles: true});
    this.window.document.dispatchEvent(dcl);
  }

  /**
   * Called when all resources (stylesheets) have been loaded.
   *
   * Fires the `load` event on `window`.
   */
  fireLoadEvent(): void {
    const loadEvent = new this.window.Event('load');
    (this.window as unknown as Element).dispatchEvent(loadEvent);
  }

  /**
   * Whether the document parse phase is complete.
   */
  get isParsed(): boolean {
    return this.parsed;
  }

  /**
   * Returns the number of deferred scripts waiting.
   */
  get deferredCount(): number {
    return this.deferredScripts.length + this.moduleExecutor.deferredCount;
  }
}
