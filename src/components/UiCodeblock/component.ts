import styles from './styles.css?inline';

import {
  DEFAULT_UI_CODEBLOCK_THEME,
  UI_CODEBLOCK_CONTENT_CLASS,
  UI_CODEBLOCK_GUTTER_CLASS,
  UI_CODEBLOCK_LINE_CLASS,
  UI_CODEBLOCK_OBSERVED_ATTRIBUTES,
  UI_CODEBLOCK_TAG_NAME,
} from './constants';
import {HTMLElement} from '../../dom';

import type {UiCodeblockHighlighterOptions} from './types';

/**
 * Minimal interface for the subset of Shiki's highlighter API used
 * by this component. Avoids a hard type dependency on Shiki.
 */
interface ShikiHighlighter {
  codeToTokensBase(
    code: string,
    options: {lang: string; theme: string},
  ): Array<Array<{content: string; color?: string}>>;
  getLoadedLanguages(): string[];
  getLoadedThemes(): string[];
  getTheme(name: string): {bg?: string; fg?: string};
}

/**
 * Built-in terminal code block custom element for displaying
 * preformatted code with optional Shiki-powered syntax highlighting.
 *
 * Features:
 * - **Syntax highlighting** via Shiki when a highlighter is loaded
 *   and a `language` attribute is set. Falls back to plain monochrome
 *   rendering otherwise.
 * - **Line numbers** toggled via the `line-numbers` boolean attribute.
 * - **No line wrapping** by default — horizontal overflow is scrollable.
 *   Set the `wrap` boolean attribute for soft wrapping.
 * - Code content is provided via `textContent`.
 *
 * To enable syntax highlighting, call the static `loadHighlighter`
 * method once at startup:
 *
 * ```ts
 * import js from 'shiki/langs/javascript.mjs';
 * import nord from 'shiki/themes/nord.mjs';
 *
 * await UiCodeblock.loadHighlighter({ langs: [js], themes: [nord] });
 * ```
 *
 * Register with `window.customElements.define(UiCodeblock.tagName, UiCodeblock)`
 * before creating `<ui-codeblock>` elements in a window.
 */
export class UiCodeblock extends HTMLElement {
  static override readonly observedAttributes = UI_CODEBLOCK_OBSERVED_ATTRIBUTES;
  static readonly styles = styles;
  static readonly tagName = UI_CODEBLOCK_TAG_NAME;

  /** Shared Shiki highlighter instance, loaded via `loadHighlighter`. */
  private static highlighter: ShikiHighlighter | null = null;

  /** Snapshot of the raw code text before internal DOM was built. */
  private rawCode = '';

  /** Whether internal DOM has been built. */
  private built = false;

  /**
   * Loads a shared Shiki highlighter for all `<ui-codeblock>` instances.
   *
   * Uses the synchronous core API with the JavaScript regex engine,
   * so tokenization after loading is fully synchronous.
   *
   * @param options - Languages and themes to pre-load.
   */
  static async loadHighlighter(options: UiCodeblockHighlighterOptions): Promise<void> {
    const {createHighlighterCoreSync} = await import('shiki/core');
    const {createJavaScriptRegexEngine} = await import('shiki/engine/javascript');

    UiCodeblock.highlighter = createHighlighterCoreSync({
      themes: options.themes as never[],
      langs: options.langs as never[],
      engine: createJavaScriptRegexEngine(),
    }) as unknown as ShikiHighlighter;
  }

  /**
   * Resets the shared highlighter. Primarily useful for testing.
   */
  static resetHighlighter(): void {
    UiCodeblock.highlighter = null;
  }

  connectedCallback(): void {
    this.captureCode();
    this.buildInternals();
  }

  override attributeChangedCallback(
    name: string,
    oldValue: string | null,
    newValue: string | null,
  ): void {
    if (oldValue === newValue) return;

    if (name === 'language' || name === 'theme' || name === 'line-numbers' || name === 'wrap') {
      if (this.built) {
        this.rebuild();
      }
    }
  }

  /**
   * Returns the raw source code text.
   */
  getCode(): string {
    return this.rawCode;
  }

  /**
   * Sets new source code and re-renders.
   */
  setCode(code: string): void {
    this.rawCode = code;

    if (this.built) {
      this.rebuild();
    }
  }

  /* ── Private: Code capture ──────────────────────────────── */

  private captureCode(): void {
    if (!this.built) {
      this.rawCode = this.textContent ?? '';
    }
  }

  /* ── Private: DOM building ──────────────────────────────── */

  private buildInternals(): void {
    this.clearChildren();

    const doc = this.ownerDocument!;
    const code = this.rawCode;
    const lines = code.split('\n');

    /* Remove trailing empty line from final newline */
    if (lines.length > 1 && lines[lines.length - 1] === '') {
      lines.pop();
    }

    const showLineNumbers = this.hasAttribute('line-numbers');
    const shouldWrap = this.hasAttribute('wrap');
    const gutterWidth = showLineNumbers ? String(lines.length).length : 0;
    const tokens = this.tokenize(code);
    const themeBg = this.getThemeBg();
    const themeFg = this.getThemeFg();

    if (themeBg) {
      this.style.backgroundColor = themeBg;
    }

    if (themeFg) {
      this.style.color = themeFg;
    }

    for (let i = 0; i < lines.length; i++) {
      const lineEl = doc.createElement('div');
      lineEl.setAttribute('class', UI_CODEBLOCK_LINE_CLASS);
      lineEl.style.display = 'flex';
      lineEl.style.flexDirection = 'row';

      if (showLineNumbers) {
        const gutter = doc.createElement('div');
        gutter.setAttribute('class', UI_CODEBLOCK_GUTTER_CLASS);
        gutter.style.display = 'inline';
        gutter.style.width = String(gutterWidth + 1);
        gutter.style.whiteSpace = 'pre';
        gutter.style.opacity = '0.5';
        gutter.textContent = String(i + 1).padStart(gutterWidth, ' ') + ' ';
        lineEl.appendChild(gutter);
      }

      const contentEl = doc.createElement('div');
      contentEl.setAttribute('class', UI_CODEBLOCK_CONTENT_CLASS);
      contentEl.style.display = 'inline';
      contentEl.style.flexWrap = 'nowrap';
      contentEl.style.whiteSpace = shouldWrap ? 'pre-wrap' : 'nowrap';
      contentEl.style.flexGrow = '1';

      if (tokens && tokens[i]) {
        for (const token of tokens[i]) {
          const span = doc.createElement('span');
          span.style.display = 'inline';
          span.textContent = token.content;

          if (token.color) {
            span.style.color = token.color;
          }

          contentEl.appendChild(span);
        }
      } else {
        contentEl.textContent = lines[i] ?? '';
      }

      lineEl.appendChild(contentEl);
      this.appendChild(lineEl);
    }

    this.built = true;
  }

  private rebuild(): void {
    this.buildInternals();
  }

  private clearChildren(): void {
    while (this.firstChild) {
      this.removeChild(this.firstChild);
    }
  }

  /* ── Private: Tokenization ──────────────────────────────── */

  private tokenize(code: string): Array<Array<{content: string; color?: string}>> | null {
    const highlighter = UiCodeblock.highlighter;
    if (!highlighter) return null;

    const language = this.getAttribute('language');
    if (!language) return null;

    const loadedLangs = highlighter.getLoadedLanguages();
    if (!loadedLangs.includes(language)) return null;

    const theme = this.getThemeName();
    const loadedThemes = highlighter.getLoadedThemes();
    if (!loadedThemes.includes(theme)) return null;

    return highlighter.codeToTokensBase(code, {lang: language, theme});
  }

  private getThemeName(): string {
    return this.getAttribute('theme') ?? DEFAULT_UI_CODEBLOCK_THEME;
  }

  private getThemeBg(): string | null {
    const highlighter = UiCodeblock.highlighter;
    if (!highlighter) return null;

    const theme = this.getThemeName();
    const loadedThemes = highlighter.getLoadedThemes();
    if (!loadedThemes.includes(theme)) return null;

    const themeData = highlighter.getTheme(theme);
    return themeData.bg ?? null;
  }

  private getThemeFg(): string | null {
    const highlighter = UiCodeblock.highlighter;
    if (!highlighter) return null;

    const theme = this.getThemeName();
    const loadedThemes = highlighter.getLoadedThemes();
    if (!loadedThemes.includes(theme)) return null;

    const themeData = highlighter.getTheme(theme);
    return themeData.fg ?? null;
  }
}
