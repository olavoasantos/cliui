import {expandShorthand} from '../../dom/classes/CSSStyleDeclaration';

import type {CSSStyleDeclaration} from '../../dom/classes/CSSStyleDeclaration';
import type {MatchedDeclaration} from './SelectorMatcher';
import type {ComputedStyle} from '../types/index';

/** CSS properties that inherit from parent elements when not explicitly set. */
const INHERITABLE_PROPERTIES = new Set([
  'color',
  'font-weight',
  'font-style',
  'text-decoration',
  'text-decoration-style',
  'text-decoration-color',
  'text-align',
  'white-space',
  'opacity',
]);

/** Default initial values for inheritable properties. */
const INITIAL_VALUES: Record<string, string> = {
  color: '',
  'font-weight': 'normal',
  'font-style': 'normal',
  'text-decoration': 'none',
  'text-decoration-style': 'solid',
  'text-decoration-color': '',
  'text-align': 'left',
  'white-space': 'normal',
  opacity: '1',
};

/**
 * Resolves the cascade for an element: merges matched declarations with
 * inline styles, resolves inheritance for inheritable properties, and
 * expands shorthand properties. Produces a ComputedStyle map.
 */
export class StyleResolver {
  /**
   * Resolves the computed style for an element.
   *
   * @param matchedDeclarations - Declarations from stylesheet rules, sorted by specificity (ascending).
   * @param inlineStyle - The element's inline style (element.style).
   * @param parentStyle - The parent element's computed style (for inheritance).
   */
  resolve(
    matchedDeclarations: MatchedDeclaration[],
    inlineStyle: CSSStyleDeclaration | null,
    parentStyle: ComputedStyle | null,
  ): ComputedStyle {
    const style: ComputedStyle = new Map();

    // 1. Apply matched declarations in specificity order (lowest first, so higher overwrites).
    for (const {declaration} of matchedDeclarations) {
      applyDeclaration(style, declaration.property, declaration.value);
    }

    // 2. Apply inline styles (highest priority — overwrites everything).
    if (inlineStyle) {
      const len = inlineStyle.length;
      for (let i = 0; i < len; i++) {
        const prop = inlineStyle.item(i);
        const value = inlineStyle.getPropertyValue(prop);
        if (value) {
          applyDeclaration(style, prop, value);
        }
      }
    }

    // 3. Resolve inheritance for inheritable properties not explicitly set.
    for (const prop of INHERITABLE_PROPERTIES) {
      if (!style.has(prop)) {
        if (parentStyle?.has(prop)) {
          style.set(prop, parentStyle.get(prop)!);
        } else if (INITIAL_VALUES[prop] !== undefined) {
          style.set(prop, INITIAL_VALUES[prop]!);
        }
      } else if (style.get(prop) === 'inherit') {
        if (parentStyle?.has(prop)) {
          style.set(prop, parentStyle.get(prop)!);
        } else if (INITIAL_VALUES[prop] !== undefined) {
          style.set(prop, INITIAL_VALUES[prop]!);
        }
      }
    }

    return style;
  }
}

/**
 * Applies a single declaration to the style map, expanding shorthands as needed.
 */
function applyDeclaration(style: ComputedStyle, property: string, value: string): void {
  const expanded = expandShorthand(property, value);
  if (expanded) {
    for (const [k, v] of Object.entries(expanded)) {
      style.set(k, v);
    }
  } else {
    style.set(property, value);
  }
}
