import styles from './styles.css?inline';

import {IMG_OBSERVED_ATTRIBUTES, IMG_TAG_NAME} from './constants';
import {HTMLElement} from '@cliui/dom';
import {parseImageHeader} from '@cliui/terminal';

import {readFileSync} from 'node:fs';

/**
 * Built-in terminal image element with graphics protocol support.
 *
 * Loads an image from the filesystem via the `src` attribute and
 * displays it using the best available terminal graphics protocol
 * (Kitty, iTerm2, or text fallback). The element participates in
 * layout like any other box — `width` and `height` set the cell
 * dimensions.
 *
 * The raw image bytes and parsed natural dimensions are stored as
 * instance properties so the renderer's {@link Painter} can read
 * them during the paint phase.
 *
 * Register with `registerHTMLElements(window)` or
 * `window.customElements.define('img', Img)`.
 */
export class Img extends HTMLElement {
  static override readonly observedAttributes = IMG_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = IMG_TAG_NAME;

  /** Raw image file bytes, available after a successful load. */
  imageData: Uint8Array | null = null;

  /** Original pixel width parsed from the image file header. */
  naturalWidth = 0;

  /** Original pixel height parsed from the image file header. */
  naturalHeight = 0;

  connectedCallback(): void {
    this.syncDimensionStyle('width', this.getAttribute('width'));
    this.syncDimensionStyle('height', this.getAttribute('height'));
    this.loadImage();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'src') {
      this.loadImage();
    }

    if (name === 'width' || name === 'height') {
      this.syncDimensionStyle(name, newValue);
    }
  }

  /** The image file path. */
  get src(): string {
    return this.getAttribute('src') ?? '';
  }

  set src(value: string) {
    this.setAttribute('src', value);
  }

  /** Fallback text displayed when graphics protocols are unavailable. */
  get alt(): string {
    return this.getAttribute('alt') ?? '';
  }

  set alt(value: string) {
    this.setAttribute('alt', value);
  }

  /** Desired display width in terminal cells. */
  get width(): number {
    const raw = this.getAttribute('width');
    return raw !== null ? Number.parseInt(raw, 10) || 0 : 0;
  }

  set width(value: number) {
    this.setAttribute('width', String(value));
  }

  /** Desired display height in terminal cells. */
  get height(): number {
    const raw = this.getAttribute('height');
    return raw !== null ? Number.parseInt(raw, 10) || 0 : 0;
  }

  set height(value: number) {
    this.setAttribute('height', String(value));
  }

  /* ── Private ────────────────────────────────────────────── */

  /**
   * Syncs a `width` or `height` HTML attribute to the corresponding
   * inline CSS property so the layout engine sizes the element.
   *
   * In browsers, `<img width="20">` maps to `width: 20px`. Here
   * we map to cell units: `style.width = '20'`.
   */
  private syncDimensionStyle(name: 'width' | 'height', value: string | null): void {
    if (value !== null && value.length > 0) {
      this.style[name] = value;
    } else {
      this.style[name] = '';
    }
  }

  private loadImage(): void {
    const src = this.getAttribute('src');

    if (!src) {
      this.imageData = null;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      return;
    }

    try {
      const buffer = readFileSync(src);
      const data = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
      this.imageData = data;

      const dimensions = parseImageHeader(data);

      if (dimensions) {
        this.naturalWidth = dimensions.width;
        this.naturalHeight = dimensions.height;
      } else {
        this.naturalWidth = 0;
        this.naturalHeight = 0;
      }
    } catch {
      this.imageData = null;
      this.naturalWidth = 0;
      this.naturalHeight = 0;
    }
  }
}
