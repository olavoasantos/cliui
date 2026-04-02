import type {SelectorPart} from '@cliui/dom';

/** A single CSS property declaration (e.g. `color: red`). */
export interface CSSDeclaration {
  property: string;
  value: string;
}

/** A parsed CSS rule: a selector list paired with its declarations. */
export interface CSSRule {
  /** Each element is a sequence of SelectorParts representing one selector in the comma-separated list. */
  selectors: SelectorPart[][];
  declarations: CSSDeclaration[];
}

/** A map of resolved CSS property names to their computed string values. */
export type ComputedStyle = Map<string, string>;

/**
 * A parsed CSS at-rule (e.g. `@border-style`, `@keyframes`, `@font-face`).
 *
 * ```css
 * @border-style stars {
 *   top: "★";
 *   bottom: "★";
 * }
 * ```
 *
 * Produces `{ identifier: 'border-style', prelude: 'stars', declarations: [...] }`.
 */
export interface CSSAtRule {
  /** The at-rule keyword without the `@` prefix (e.g. `"border-style"`). */
  identifier: string;
  /** The text between the identifier and the opening brace (e.g. `"stars"`). */
  prelude: string;
  /** Property declarations inside the at-rule body. */
  declarations: CSSDeclaration[];
}

/** Result of parsing a CSS stylesheet. */
export interface CSSParseResult {
  /** Standard selector-based rules. */
  rules: CSSRule[];
  /** At-rules (`@identifier prelude { declarations }`). */
  atRules: CSSAtRule[];
}
