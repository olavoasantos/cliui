/**
 * A single media/container feature query, e.g. `(min-width: 120)`.
 */
export interface ConditionFeature {
  type: 'feature';
  /** The feature name, e.g. `min-width`, `prefers-color-scheme`, `orientation`. */
  name: string;
  /** The value to compare against, e.g. `120`, `dark`, `landscape`. */
  value: string;
}

/**
 * A negated condition, e.g. `not (min-width: 80)`.
 */
export interface ConditionNot {
  type: 'not';
  /** The condition being negated. */
  condition: MediaCondition;
}

/**
 * A conjunction of conditions, e.g. `(min-width: 80) and (max-height: 40)`.
 */
export interface ConditionAnd {
  type: 'and';
  /** All conditions that must be true. */
  conditions: MediaCondition[];
}

/**
 * A disjunction of conditions (comma-separated in CSS),
 * e.g. `(min-width: 80), (orientation: portrait)`.
 */
export interface ConditionOr {
  type: 'or';
  /** At least one condition must be true. */
  conditions: MediaCondition[];
}

/**
 * A parsed media condition AST node.
 *
 * Represents the condition expression inside `@media` or `@container` at-rules.
 * Supports feature queries, boolean combinators (`and`, `or`/comma, `not`),
 * and parenthesized grouping.
 */
export type MediaCondition = ConditionFeature | ConditionNot | ConditionAnd | ConditionOr;
