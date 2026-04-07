import {HTMLElement} from './HTMLElement';

/**
 * Represents a `<link>` element in the DOM.
 *
 * Provides property accessors for link-related attributes (`rel`, `href`,
 * `type`). Only `rel="stylesheet"` triggers resource loading — other `rel`
 * values are silently ignored by the stylesheet loader (M10T4).
 *
 * The `sheet` property returns the loaded stylesheet text once the resource
 * has been fetched and parsed, or `null` if not yet loaded or if the link
 * is not a stylesheet.
 */
export class HTMLLinkElement extends HTMLElement {
  /**
   * Internal storage for the loaded stylesheet text.
   * Set by the stylesheet loader when the resource has been fetched.
   */
  private sheetText: string | null = null;

  /**
   * The relationship between the current document and the linked resource.
   *
   * Only `"stylesheet"` activates loading behavior.
   * Reflects the `rel` attribute.
   */
  get rel(): string {
    return this.getAttribute('rel') ?? '';
  }

  set rel(value: string) {
    this.setAttribute('rel', value);
  }

  /**
   * The URL of the linked resource.
   *
   * Reflects the `href` attribute.
   */
  get href(): string {
    return this.getAttribute('href') ?? '';
  }

  set href(value: string) {
    this.setAttribute('href', value);
  }

  /**
   * The MIME type of the linked resource.
   *
   * Reflects the `type` attribute.
   */
  get type(): string {
    return this.getAttribute('type') ?? '';
  }

  set type(value: string) {
    this.setAttribute('type', value);
  }

  /**
   * Returns the loaded stylesheet text, or `null` if not loaded.
   *
   * This is set by the stylesheet loader when a `<link rel="stylesheet">`
   * element's resource has been successfully fetched and parsed.
   */
  get sheet(): string | null {
    return this.sheetText;
  }

  /**
   * Sets the loaded stylesheet text.
   *
   * Used by the resource loader to store the fetched CSS content.
   */
  set sheet(value: string | null) {
    this.sheetText = value;
  }
}
