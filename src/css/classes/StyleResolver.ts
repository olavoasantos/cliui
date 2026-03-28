import {INITIAL_VALUES} from '../constants/initialValues';
import {INHERITABLE_PROPERTIES} from '../constants/inheritableProperties';
import {applyDeclaration} from '../utilities/applyDeclaration';
import {resolveVar} from '../utilities/resolveVar';

import type {CSSStyleDeclaration} from '../../dom/classes/CSSStyleDeclaration';
import type {ComputedStyle} from '../types';
import type {MatchedDeclaration} from '../types/MatchedDeclaration';

/** Resolves the CSS cascade for an element into a computed style map. */
export class StyleResolver {
  resolve(
    matchedDeclarations: MatchedDeclaration[],
    inlineStyle: CSSStyleDeclaration | null,
    parentStyle: ComputedStyle | null,
  ): ComputedStyle {
    const style: ComputedStyle = new Map();

    /* 1. Inherit custom properties from parent (all --* inherit by spec) */
    if (parentStyle) {
      for (const [property, value] of parentStyle) {
        if (property.startsWith('--')) {
          style.set(property, value);
        }
      }
    }

    /* 2. Apply matched declarations from stylesheets */
    for (const {declaration} of matchedDeclarations) {
      applyDeclaration(style, declaration.property, declaration.value);
    }

    /* 3. Apply inline styles (highest specificity) */
    if (inlineStyle) {
      for (let index = 0; index < inlineStyle.length; index++) {
        const property = inlineStyle.item(index);
        const value = inlineStyle.getPropertyValue(property);
        if (value) applyDeclaration(style, property, value);
      }
    }

    /* 4. Inherit standard inheritable properties */
    for (const property of INHERITABLE_PROPERTIES) {
      if (!style.has(property) || style.get(property) === 'inherit') {
        if (parentStyle?.has(property)) {
          style.set(property, parentStyle.get(property)!);
        } else if (INITIAL_VALUES[property] !== undefined) {
          style.set(property, INITIAL_VALUES[property]!);
        }
      }
    }

    /* 5. Resolve var() references in all property values */
    for (const [property, value] of style) {
      if (value.includes('var(')) {
        style.set(property, resolveVar(value, style));
      }
    }

    return style;
  }
}
