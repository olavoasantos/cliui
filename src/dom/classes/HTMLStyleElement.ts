import {HTMLElement} from './HTMLElement';

/**
 * Represents a `<style>` element. Provides a convenient `sheet` accessor
 * that returns the element's CSS text content for consumption by the
 * style engine.
 */
export class HTMLStyleElement extends HTMLElement {
  /**
   * Returns the CSS text content of this style element.
   */
  get sheet(): string {
    return this.textContent ?? '';
  }
}
