import {INITIAL_VALUES} from '../constants/initialValues';
import {INHERITABLE_PROPERTIES} from '../constants/inheritableProperties';
import {applyDeclaration} from '../utilities/applyDeclaration';

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
