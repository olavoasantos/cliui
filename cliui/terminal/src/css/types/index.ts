import type {SelectorPart} from '@cliui/dom';
import type {Element} from '@cliui/dom';

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
  /** Parsed `@keyframes` rules. */
  keyframeRules: KeyframeRule[];
  /** Conditional at-rules (`@media`, `@container`) with nested rules. */
  conditionalRules: CSSConditionalRule[];
}

/** A parsed comma-separated selector list. */
export type SelectorList = SelectorPart[][];

/**
 * A parsed CSS conditional at-rule (`@media` or `@container`) that contains
 * nested CSS rules rather than flat declarations.
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

/**
 * Result of parsing a CSS function call from a value string.
 * @internal
 */
export interface CSSFunctionCall {
  /** Function name (e.g. `"var"`, `"linear-gradient"`). */
  name: string;
  /** Raw argument string inside the parentheses. */
  args: string;
  /** Start index of the function call in the original string. */
  start: number;
  /** End index (exclusive) of the function call in the original string. */
  end: number;
}

/** Describes a CSS easing function for animation/transition timing. */
export type EasingDescriptor =
  | {type: 'linear'}
  | {type: 'cubic-bezier'; x1: number; y1: number; x2: number; y2: number}
  | {type: 'steps'; count: number; position: StepPosition};

/** Step easing jump position. */
export type StepPosition = 'jump-start' | 'jump-end' | 'jump-both' | 'jump-none';

/** A single keyframe stop within a `@keyframes` rule. */
export interface KeyframeBlock {
  /** Stop positions as percentages (0–100). `from` = 0, `to` = 100. */
  offsets: number[];
  /** Declarations at this stop. */
  declarations: CSSDeclaration[];
}

/** A parsed `@keyframes` rule. */
export interface KeyframeRule {
  /** The animation name. */
  name: string;
  /** Sorted keyframe blocks. */
  blocks: KeyframeBlock[];
}

/** A matched declaration with its source specificity and rule order. */
export interface MatchedDeclaration {
  declaration: CSSDeclaration;
  specificity: [number, number, number];
  order: number;
}

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
 */
export type MediaCondition = ConditionFeature | ConditionNot | ConditionAnd | ConditionOr;

/**
 * Current media values for evaluating `@media` conditions.
 */
export interface MediaValues {
  /** Terminal width in columns (cells). */
  width: number;
  /** Terminal height in rows (cells). */
  height: number;
  /** User's color scheme preference. */
  'prefers-color-scheme': 'dark' | 'light';
  /** User's reduced motion preference. */
  'prefers-reduced-motion': 'reduce' | 'no-preference';
  /** Viewport orientation: `landscape` when width > height, `portrait` otherwise. */
  orientation: 'landscape' | 'portrait';
}

/**
 * Resolved dimensions of a container element for evaluating `@container` conditions.
 */
export interface ContainerValues {
  /** Container's resolved content width in cells. */
  width: number;
  /** Container's resolved content height in cells. */
  height: number;
}

/**
 * Describes an active CSS animation on an element.
 * @internal
 */
export interface ActiveAnimation {
  element: Element;
  name: string;
  keyframes: KeyframeBlock[];
  startTime: number;
  duration: number;
  delay: number;
  easing: string;
  iterationCount: number;
  direction: 'normal' | 'reverse' | 'alternate' | 'alternate-reverse';
  fillMode: 'none' | 'forwards' | 'backwards' | 'both';
  playState: 'running' | 'paused';
  /** Accumulated elapsed time before the most recent pause. */
  pausedElapsed: number;
  /** Timestamp when the animation was last paused, or 0 if running. */
  pausedAt: number;
  /** Current completed iteration count. */
  currentIteration: number;
}

/**
 * Describes an active CSS transition on a single property.
 * @internal
 */
export interface ActiveTransition {
  element: Element;
  property: string;
  startValue: string;
  endValue: string;
  startTime: number;
  duration: number;
  delay: number;
  easing: string;
}
