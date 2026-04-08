import {HTMLElement} from './HTMLElement';

/**
 * Represents a `<script>` element in the DOM.
 *
 * Provides property accessors for script-related attributes (`src`, `type`,
 * `defer`, `async`) and exposes the inline script body via `textContent`.
 * The resource loader consumes insertion hooks to trigger
 * loading and execution of external or inline scripts.
 */
export class HTMLScriptElement extends HTMLElement {
  /**
   * The URL of an external script resource.
   *
   * Reflects the `src` attribute.
   */
  get src(): string {
    return this.getAttribute('src') ?? '';
  }

  set src(value: string) {
    this.setAttribute('src', value);
  }

  /**
   * The MIME type or module indicator for the script.
   *
   * Common values are `""` (classic script), `"text/javascript"`, and
   * `"module"` (ES module script). Scripts with unrecognised types are
   * ignored by the execution engine.
   */
  get type(): string {
    return this.getAttribute('type') ?? '';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  /**
   * Whether the script should be deferred until the document is fully parsed.
   *
   * Reflects the boolean `defer` attribute.
   */
  get defer(): boolean {
    return this.hasAttribute('defer');
  }

  set defer(value: boolean) {
    if (value) {
      this.setAttribute('defer', '');
    } else {
      this.removeAttribute('defer');
    }
  }

  /**
   * Whether the script should be loaded asynchronously.
   *
   * Reflects the boolean `async` attribute.
   */
  get async(): boolean {
    return this.hasAttribute('async');
  }

  set async(value: boolean) {
    if (value) {
      this.setAttribute('async', '');
    } else {
      this.removeAttribute('async');
    }
  }
}
