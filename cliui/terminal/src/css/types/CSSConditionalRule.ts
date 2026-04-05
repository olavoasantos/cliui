import type {CSSDeclaration, CSSRule} from './index';

/**
 * A parsed CSS conditional at-rule (`@media` or `@container`) that contains
 * nested CSS rules rather than flat declarations.
 *
 * ```css
 * @media (min-width: 80) {
 *   .sidebar { display: none; }
 *   .main { width: 100%; }
 * }
 * ```
 *
 * Produces `{ identifier: 'media', prelude: '(min-width: 80)', rules: [...] }`.
 */
export interface CSSConditionalRule {
  /** The at-rule keyword without the `@` prefix (e.g. `"media"`, `"container"`). */
  identifier: string;
  /** The condition text between the identifier and the opening brace. */
  prelude: string;
  /** Nested CSS rules inside the conditional block. */
  rules: CSSRule[];
  /** Nested conditional at-rules (e.g. `@container` inside `@media`). */
  conditionalRules: CSSConditionalRule[];
}
