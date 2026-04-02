/** Observed attribute names for the built-in code block component. */
export type UiCodeblockObservedAttribute = 'language' | 'theme' | 'line-numbers' | 'wrap';

/** Options for loading the shared Shiki highlighter. */
export interface UiCodeblockHighlighterOptions {
  /** Shiki language grammars to load (e.g. imported from `shiki/langs/javascript.mjs`). */
  langs: unknown[];
  /** Shiki theme definitions to load (e.g. imported from `shiki/themes/nord.mjs`). */
  themes: unknown[];
}
