import {expandShorthand} from '@cliui/dom';

import type {ComputedStyle} from '../types';

/** Applies a CSS declaration to a computed style map, expanding shorthands. */
export function applyDeclaration(style: ComputedStyle, property: string, value: string): void {
  const expanded = expandShorthand(property, value);

  if (expanded) {
    for (const [key, expandedValue] of Object.entries(expanded)) {
      style.set(key, expandedValue);
    }

    return;
  }

  style.set(property, value);
}
