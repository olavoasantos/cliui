import {expandShorthand} from '../../dom/utilities/expandShorthand';

import type {CSSStyleDeclaration} from '../../dom/classes/CSSStyleDeclaration';
import type {MatchedDeclaration} from './SelectorMatcher';
import type {ComputedStyle} from '../types';

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

/** Resolves the CSS cascade for an element into a computed style map. */
export class StyleResolver {
  resolve(
    matchedDeclarations: MatchedDeclaration[],
    inlineStyle: CSSStyleDeclaration | null,
    parentStyle: ComputedStyle | null,
  ): ComputedStyle {
    const style: ComputedStyle = new Map();

    for (const {declaration} of matchedDeclarations) {
      applyDeclaration(style, declaration.property, declaration.value);
    }

    if (inlineStyle) {
      for (let index = 0; index < inlineStyle.length; index++) {
        const property = inlineStyle.item(index);
        const value = inlineStyle.getPropertyValue(property);
        if (value) applyDeclaration(style, property, value);
      }
    }

    for (const property of INHERITABLE_PROPERTIES) {
      if (!style.has(property) || style.get(property) === 'inherit') {
        if (parentStyle?.has(property)) {
          style.set(property, parentStyle.get(property)!);
        } else if (INITIAL_VALUES[property] !== undefined) {
          style.set(property, INITIAL_VALUES[property]!);
        }
      }
    }

    return style;
  }
}

function applyDeclaration(style: ComputedStyle, property: string, value: string): void {
  const expanded = expandShorthand(property, value);
  if (expanded) {
    for (const [key, expandedValue] of Object.entries(expanded)) {
      style.set(key, expandedValue);
    }
    return;
  }

  style.set(property, value);
}
