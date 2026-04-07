import type {Element} from '@cliui/dom';
import type {HTMLLinkElement} from '@cliui/dom';
import type {StyleEngine} from '../../css/classes/StyleEngine';
import type {ResourceResolver} from './ResourceResolver';

/**
 * Loads external stylesheets for `<link rel="stylesheet">` elements.
 *
 * When a `<link rel="stylesheet">` element is inserted into the document,
 * this loader resolves the `href`, reads the CSS file via the
 * {@link ResourceResolver}, and stores the loaded text on the element's
 * `sheet` property. It then marks the {@link StyleEngine}'s stylesheets
 * as dirty so the rules are picked up on the next style recomputation.
 *
 * Supports:
 * - Loading on insertion into the document
 * - Unloading on removal from the document
 * - Reloading when the `href` attribute changes
 * - Error events on missing files
 */
export class StylesheetLoader {
  private readonly resolver: ResourceResolver;
  private readonly styleEngine: StyleEngine;

  /** Tracks loaded link elements to their resolved paths. */
  private readonly loaded = new Map<HTMLLinkElement, string>();

  /**
   * @param resolver - The resource resolver for file loading.
   * @param styleEngine - The style engine to notify of stylesheet changes.
   */
  constructor(resolver: ResourceResolver, styleEngine: StyleEngine) {
    this.resolver = resolver;
    this.styleEngine = styleEngine;
  }

  /**
   * Loads a stylesheet for a `<link>` element.
   *
   * Reads the CSS file referenced by the element's `href` attribute,
   * stores the content on the element's `sheet` property, and marks
   * the style engine's stylesheets as dirty.
   *
   * @param element - The `<link rel="stylesheet">` element to load.
   * @returns `true` if the stylesheet was successfully loaded.
   */
  load(element: HTMLLinkElement): boolean {
    if (element.rel !== 'stylesheet') {
      return false;
    }

    const href = element.href;

    if (!href) {
      return false;
    }

    const content = this.resolver.readSyncForElement(href, element as unknown as Element);

    if (content === null) {
      return false;
    }

    element.sheet = content;
    this.loaded.set(element, this.resolver.resolve(href));
    this.styleEngine.invalidateStylesheets();
    this.styleEngine.markAllDirty();
    return true;
  }

  /**
   * Loads a stylesheet asynchronously for a `<link>` element.
   *
   * @param element - The `<link rel="stylesheet">` element to load.
   * @returns `true` if the stylesheet was successfully loaded.
   */
  async loadAsync(element: HTMLLinkElement): Promise<boolean> {
    if (element.rel !== 'stylesheet') {
      return false;
    }

    const href = element.href;

    if (!href) {
      return false;
    }

    const content = await this.resolver.readForElement(href, element as unknown as Element);

    if (content === null) {
      return false;
    }

    element.sheet = content;
    this.loaded.set(element, this.resolver.resolve(href));
    this.styleEngine.invalidateStylesheets();
    this.styleEngine.markAllDirty();
    return true;
  }

  /**
   * Unloads the stylesheet for a `<link>` element.
   *
   * Clears the element's `sheet` property and marks the style engine's
   * stylesheets as dirty so the rules are removed on the next recomputation.
   *
   * @param element - The `<link>` element to unload.
   */
  unload(element: HTMLLinkElement): void {
    if (this.loaded.has(element)) {
      element.sheet = null;
      this.loaded.delete(element);
      this.styleEngine.invalidateStylesheets();
      this.styleEngine.markAllDirty();
    }
  }

  /**
   * Reloads the stylesheet for a `<link>` element whose `href` changed.
   *
   * Unloads the old stylesheet and loads the new one.
   *
   * @param element - The `<link>` element whose `href` changed.
   * @returns `true` if the new stylesheet was successfully loaded.
   */
  reload(element: HTMLLinkElement): boolean {
    this.unload(element);
    return this.load(element);
  }

  /**
   * Returns whether a `<link>` element has a loaded stylesheet.
   */
  isLoaded(element: HTMLLinkElement): boolean {
    return this.loaded.has(element);
  }

  /**
   * Returns the number of loaded stylesheets.
   */
  get loadedCount(): number {
    return this.loaded.size;
  }
}
